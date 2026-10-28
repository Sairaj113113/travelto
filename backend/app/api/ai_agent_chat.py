
"""Gemini chat endpoint for the Travelto itinerary Ask Help widget."""

import asyncio
import json
import logging
import os
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from google import genai
from google.genai import errors

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ai-agent",
    tags=["AI Travel Agent"],
)


# =========================================================
# REQUEST AND RESPONSE SCHEMAS
# =========================================================

class ItineraryChatRequest(BaseModel):
    trip_id: int | str | None = None
    message: str = Field(..., min_length=1, max_length=2000)
    destination: str | None = None
    trip: dict[str, Any] | None = None
    itinerary: list[dict[str, Any]] = Field(default_factory=list)


class ItineraryChatResponse(BaseModel):
    reply: str


# =========================================================
# HELPERS
# =========================================================

def _compact_trip_context(payload: ItineraryChatRequest) -> dict[str, Any]:
    """Keep the itinerary context small to reduce Gemini token usage."""

    trip = payload.trip or {}
    compact_days = []

    for day in (payload.itinerary or [])[:20]:
        if not isinstance(day, dict):
            continue

        activities = day.get("activities", [])
        compact_activities = []

        if isinstance(activities, list):
            for activity in activities[:15]:
                if not isinstance(activity, dict):
                    continue

                compact_activities.append({
                    "title": (
                        activity.get("title")
                        or activity.get("name")
                    ),
                    "start_time": activity.get("start_time"),
                    "end_time": activity.get("end_time"),
                    "location": activity.get("location"),
                    "description": activity.get("description"),
                    "estimated_cost": activity.get("estimated_cost"),
                    "duration_minutes": activity.get("duration_minutes"),
                    "activity_type": activity.get("activity_type"),
                })

        compact_days.append({
            "day_number": (
                day.get("day_number")
                or day.get("day")
                or day.get("number")
            ),
            "date": day.get("date"),
            "title": day.get("title"),
            "activities": compact_activities,
        })

    return {
        "trip": {
            "title": trip.get("title"),
            "destination": (
                trip.get("destination")
                or payload.destination
            ),
            "start_date": trip.get("start_date"),
            "end_date": trip.get("end_date"),
            "travelers": trip.get("travelers"),
            "budget": trip.get("budget"),
        },
        "itinerary": compact_days,
    }


def _build_prompt(
    context: dict[str, Any],
    message: str,
) -> str:
    """Create the system instructions and trip-specific prompt."""

    return f"""
You are Travelto AI, a friendly travel-planning assistant.

Answer the user's question directly, accurately, and clearly using
the supplied trip context.

BEHAVIOUR:
- If asked what a place is, explain what it is, where it is, and why
  a traveler might visit it.
- If asked about a trip activity, use the actual itinerary context.
- If asked about timings, suggest practical alternatives when useful.
- If asked about the budget, explain likely costs and impacts without
  inventing exact prices.
- Never claim that the saved itinerary has been changed. This endpoint
  only answers questions; it does not modify or save itinerary changes.
- Never invent live prices, opening hours, transport schedules,
  availability, or booking confirmations.
- If information is missing or needs current verification, explain that.
- If an activity does not match the destination, point that out.
- Keep answers friendly, concise, and easy to understand.

CURRENT TRIP CONTEXT:
{json.dumps(context, ensure_ascii=False, default=str)}

USER QUESTION:
{message}
""".strip()


# =========================================================
# CHAT ENDPOINT
# =========================================================

@router.post("/chat", response_model=ItineraryChatResponse)
async def itinerary_chat(
    payload: ItineraryChatRequest,
) -> ItineraryChatResponse:
    """Answer itinerary questions using Gemini and the current trip."""

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "Gemini chat is not configured. Add GEMINI_API_KEY "
                "to the backend .env file and restart the backend."
            ),
        )

    message = payload.message.strip()

    if not message:
        raise HTTPException(
            status_code=422,
            detail="Please enter a question before sending.",
        )

    context = _compact_trip_context(payload)
    prompt = _build_prompt(context, message)

    # Override this in backend/.env if your API key supports a
    # different model. The model must actually be available to your key.
    model = os.getenv(
        "GEMINI_CHAT_MODEL",
        "gemini-3.8-flash",
    )

    client = genai.Client(api_key=api_key)

    # Retry only temporary service failures, not invalid models,
    # invalid requests, or exhausted quota.
    max_attempts = 2

    for attempt in range(max_attempts):
        try:
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=model,
                contents=prompt,
            )

            reply = (
                getattr(response, "text", None) or ""
            ).strip()

            if not reply:
                raise HTTPException(
                    status_code=502,
                    detail=(
                        "Gemini returned an empty answer. "
                        "Please try your question again."
                    ),
                )

            return ItineraryChatResponse(reply=reply)

        except HTTPException:
            raise

        except errors.APIError as exc:
            status_code = getattr(exc, "code", None)

            logger.warning(
                "Gemini chat API error: status=%s model=%s attempt=%s",
                status_code,
                model,
                attempt + 1,
                exc_info=True,
            )

            # Retry once for temporary server overload.
            if status_code in (500, 502, 503, 504):
                if attempt + 1 < max_attempts:
                    await asyncio.sleep(1.5)
                    continue

                return ItineraryChatResponse(
                    reply=(
                        "Gemini is temporarily busy. Your trip plan "
                        "has not been changed. Please wait a minute "
                        "and try asking again."
                    )
                )

            if status_code == 429:
                raise HTTPException(
                    status_code=429,
                    detail=(
                        "Gemini's API quota or request limit has been "
                        "reached. Please wait and try again, or check "
                        "the quota for your Gemini API key."
                    ),
                ) from exc

            if status_code == 404:
                raise HTTPException(
                    status_code=502,
                    detail=(
                        f"Gemini model '{model}' is unavailable for "
                        "your API key. Check the models available to "
                        "your key and set GEMINI_CHAT_MODEL in "
                        "backend/.env to an available model."
                    ),
                ) from exc

            if status_code in (400, 401, 403):
                raise HTTPException(
                    status_code=502,
                    detail=(
                        "Gemini rejected the request. Check your API "
                        "key, model permissions, and request settings. "
                        "See the backend terminal for details."
                    ),
                ) from exc

            raise HTTPException(
                status_code=502,
                detail=(
                    "Travelto could not get an answer from Gemini. "
                    "Please try again later."
                ),
            ) from exc

        except Exception as exc:
            logger.exception(
                "Unexpected Travelto itinerary chat error"
            )

            # Do not expose API keys or internal exception details.
            raise HTTPException(
                status_code=502,
                detail=(
                    "Travelto encountered a temporary chat error. "
                    "Please try again. If it continues, check the "
                    "backend terminal."
                ),
            ) from exc

    # Defensive fallback; the retry loop normally returns or raises.
    return ItineraryChatResponse(
        reply=(
            "Gemini is temporarily unavailable. Please try again shortly."
        )
    )
