import logging

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.models.user import User

from app.schemas.ai_agent import (
    AgentTripRequest,
    AgentTripResponse,
)

from app.services.ai_agent_service import (
    arrange_trip,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/ai-agent",
    tags=["AI Travel Agent"],
)


# ============================================================
# ARRANGE TRIP
# ============================================================

@router.post(
    "/arrange",
    response_model=AgentTripResponse,
)
async def arrange_trip_endpoint(
    request: AgentTripRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Travelto AI Travel Agent.

    Architecture:

    User requirements
            ↓
    Gemini destination research
            ↓
    Regions / places / experiences
            ↓
    Real API verification
            ↓
    Places / Hotels / Flights / Trains
    Routes / Weather
            ↓
    Gemini reconciliation
            ↓
    Connected trip recommendations

    This endpoint DOES NOT book or pay.
    """

    logger.info(
        "AI Agent started | user_id=%s | destination=%s",
        current_user.id,
        request.destination,
    )

    try:
        return await arrange_trip(request)

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception:
        logger.exception(
            "AI Agent failed | user_id=%s | destination=%s",
            current_user.id,
            request.destination,
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Travelto AI Agent could not "
                "complete the research right now."
            ),
        )