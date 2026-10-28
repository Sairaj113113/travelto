import json
import logging
import os
import re
from datetime import date
from difflib import SequenceMatcher
from typing import Any

from google import genai

from app.schemas.ai_agent import AgentTripRequest
from app.services.travel_api_service import (
    geocode_location,
    get_route,
    resolve_flight_location,
    safe_api_call,
    search_flights,
    search_hotels,
    search_places,
    search_train_stations,
    search_trains,
    search_weather,
)

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.5-flash-lite"


# ============================================================
# GEMINI
# ============================================================

def _get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    return genai.Client(api_key=api_key)


async def _generate_json(prompt: str) -> dict[str, Any]:
    """
    Call Gemini and return JSON.

    IMPORTANT:
    The caller must send compact/necessary data only.
    Never send complete provider payloads to Gemini.
    """

    client = _get_gemini_client()

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
            },
        )

    except Exception as exc:
        message = str(exc)

        if (
            "429" in message
            or "RESOURCE_EXHAUSTED" in message
            or "quota" in message.lower()
        ):
            logger.warning("Gemini quota exhausted.")
            raise RuntimeError(
                "Gemini quota is temporarily exhausted. "
                "Travelto will continue using the verified travel data."
            ) from exc

        logger.exception("Gemini request failed.")
        raise RuntimeError("Gemini request failed.") from exc

    raw_text = getattr(response, "text", None)

    if not raw_text:
        raise RuntimeError("Gemini returned an empty response.")

    try:
        return json.loads(raw_text.strip())

    except json.JSONDecodeError as exc:
        logger.exception("Gemini returned invalid JSON.")
        raise RuntimeError("Gemini returned invalid JSON.") from exc


# ============================================================
# VALIDATION
# ============================================================

def _validate_request(request: AgentTripRequest) -> None:

    if request.end_date < request.start_date:
        raise ValueError("End date cannot be before start date.")

    if request.adults + request.children != request.travelers:
        raise ValueError(
            "Travelers must equal adults plus children."
        )

    if request.budget < 0:
        raise ValueError("Budget cannot be negative.")


def _normalize_text(value: Any) -> str:
    value = str(value or "").lower().strip()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def _similarity(a: str, b: str) -> float:
    a = _normalize_text(a)
    b = _normalize_text(b)

    if not a or not b:
        return 0.0

    if a == b:
        return 1.0

    if a in b or b in a:
        return 0.92

    return SequenceMatcher(None, a, b).ratio()


def _total_nights(request: AgentTripRequest) -> int:
    return (request.end_date - request.start_date).days


# ============================================================
# STAGE 1
# GEMINI DESTINATION INTELLIGENCE
# ============================================================

async def _create_experience_plan(
    request: AgentTripRequest,
) -> dict[str, Any]:

    prompt = f"""
You are the destination intelligence engine for Travelto,
an AI-powered adaptive tourism platform.

Understand the destination before real-world API research.

USER TRIP
Starting location: {request.starting_location}
Destination: {request.destination}
Start date: {request.start_date}
End date: {request.end_date}
Travelers: {request.travelers}
Adults: {request.adults}
Children: {request.children}
TOTAL group budget: ₹{request.budget}
Transport preference: {request.transport_preference}
Travel style: {request.travel_style}
Interests: {request.interests}

Your job:

1. Understand the destination geography.
2. Identify meaningful tourist regions/areas.
3. Group nearby attractions.
4. Identify major experiences.
5. Include nature, heritage, beaches, adventure, activities,
   shopping, nightlife, family experiences and food experiences
   only when relevant.
6. Avoid unnecessary backtracking.
7. Decide how many regions are sensible for the trip duration.
8. Suggest the important places without requiring manual selection.

IMPORTANT:

- Do NOT hardcode destination-specific regions in your program.
- Determine regions dynamically.
- You may use your travel knowledge to suggest places.
- Suggested visit durations are planning estimates.
- Never invent live prices, availability, booking confirmations,
  current transport schedules or exact current opening hours.

Return ONLY JSON:

{{
  "summary": "destination understanding",
  "experience_categories": ["category"],
  "regions": [
    {{
      "name": "region or area",
      "reason": "why it matters",
      "priority": "high",
      "recommended_days": 2,
      "places": [
        {{
          "name": "important place or experience",
          "category": "nature/heritage/beach/etc",
          "reason": "why visit",
          "suggested_duration_minutes": 120
        }}
      ]
    }}
  ],
  "special_considerations": ["planning consideration"]
}}
"""

    return await _generate_json(prompt)


# ============================================================
# GEO COORDINATE VALIDATION
# ============================================================

def _valid_coordinates(
    latitude: Any,
    longitude: Any,
) -> bool:

    try:
        lat = float(latitude)
        lon = float(longitude)
    except (TypeError, ValueError):
        return False

    return (
        -90 <= lat <= 90
        and -180 <= lon <= 180
    )


# ============================================================
# PLACES
# ============================================================

def _extract_places(
    response: dict[str, Any],
) -> list[dict[str, Any]]:

    if not response:
        return []

    data = response.get("data", response)

    if isinstance(data, list):
        features = data

    elif isinstance(data, dict):

        features = data.get("features", [])

        if not features:
            for key in (
                "results",
                "places",
                "items",
            ):
                if isinstance(data.get(key), list):
                    features = data[key]
                    break

    else:
        features = []

    places: list[dict[str, Any]] = []

    for item in features:

        if not isinstance(item, dict):
            continue

        properties = item.get(
            "properties",
            item,
        )

        geometry = item.get(
            "geometry",
            {},
        )

        coordinates = geometry.get(
            "coordinates",
            [],
        )

        if len(coordinates) < 2:
            coordinates = [
                properties.get(
                    "lon",
                    properties.get("longitude"),
                ),
                properties.get(
                    "lat",
                    properties.get("latitude"),
                ),
            ]

        if (
            len(coordinates) < 2
            or coordinates[0] is None
            or coordinates[1] is None
        ):
            continue

        longitude = coordinates[0]
        latitude = coordinates[1]

        if not _valid_coordinates(
            latitude,
            longitude,
        ):
            logger.warning(
                "Skipping invalid place coordinates: %s, %s",
                latitude,
                longitude,
            )
            continue

        name = (
            properties.get("name")
            or properties.get("address_line1")
        )

        if not name:
            continue

        places.append(
            {
                "name": name,
                "formatted": properties.get("formatted"),
                "latitude": float(latitude),
                "longitude": float(longitude),
                "categories": properties.get(
                    "categories",
                    [],
                ),
                "distance": properties.get(
                    "distance"
                ),
                "place_id": properties.get(
                    "place_id"
                ),
                "address": (
                    properties.get("address_line2")
                    or properties.get("formatted")
                ),
                "rating": properties.get(
                    "rating"
                ),
            }
        )

    return places


async def _search_places_for_experience_plan(
    experience_plan: dict[str, Any],
    destination_coordinates: dict[str, Any],
) -> list[dict[str, Any]]:

    regions = experience_plan.get(
        "regions",
        [],
    )

    searches: list[
        tuple[str, float, float]
    ] = []

    # Destination center
    lat = destination_coordinates.get(
        "latitude"
    )

    lon = destination_coordinates.get(
        "longitude"
    )

    if _valid_coordinates(lat, lon):
        searches.append(
            (
                "Destination",
                float(lat),
                float(lon),
            )
        )

    # Gemini regions
    for region in regions:

        if not isinstance(region, dict):
            continue

        name = str(
            region.get("name") or ""
        ).strip()

        if not name:
            continue

        try:
            resolved = await geocode_location(name)

            if not isinstance(resolved, dict):
                continue

            region_lat = resolved.get(
                "latitude"
            )

            region_lon = resolved.get(
                "longitude"
            )

            if _valid_coordinates(
                region_lat,
                region_lon,
            ):
                searches.append(
                    (
                        name,
                        float(region_lat),
                        float(region_lon),
                    )
                )

        except Exception:
            logger.warning(
                "Could not geocode region %s",
                name,
            )

    # Remove duplicate coordinates
    unique: list[
        tuple[str, float, float]
    ] = []

    seen: set[
        tuple[float, float]
    ] = set()

    for label, rlat, rlon in searches:

        key = (
            round(rlat, 4),
            round(rlon, 4),
        )

        if key not in seen:
            seen.add(key)
            unique.append(
                (
                    label,
                    rlat,
                    rlon,
                )
            )

    all_places: list[
        dict[str, Any]
    ] = []

    seen_place_ids: set[str] = set()
    seen_names: set[str] = set()

    # Avoid excessive API calls
    for (
        label,
        rlat,
        rlon,
    ) in unique[:10]:

        if not _valid_coordinates(
            rlat,
            rlon,
        ):
            continue

        result = await safe_api_call(
            search_places,
            rlat,
            rlon,
            30000,
            50,
        )

        if result.get("status") != "success":

            logger.warning(
                "Places search failed for %s: %s",
                label,
                result.get("error"),
            )

            continue

        for place in _extract_places(result):

            pid = str(
                place.get("place_id")
                or ""
            )

            pname = _normalize_text(
                place.get("name")
            )

            if (
                pid
                and pid in seen_place_ids
            ):
                continue

            if (
                pname
                and pname in seen_names
            ):
                continue

            if pid:
                seen_place_ids.add(pid)

            if pname:
                seen_names.add(pname)

            place["search_area"] = label

            all_places.append(place)

    return all_places


def _match_gemini_places(
    experience_plan: dict[str, Any],
    api_places: list[dict[str, Any]],
) -> list[dict[str, Any]]:

    merged: list[dict[str, Any]] = []

    used_api: set[int] = set()

    for region in experience_plan.get(
        "regions",
        [],
    ):

        if not isinstance(region, dict):
            continue

        region_name = region.get(
            "name"
        )

        for candidate in region.get(
            "places",
            [],
        ):

            if not isinstance(candidate, dict):
                continue

            candidate_name = str(
                candidate.get("name") or ""
            ).strip()

            if not candidate_name:
                continue

            best_index = None
            best_score = 0.0

            for index, api_place in enumerate(
                api_places
            ):

                if index in used_api:
                    continue

                score = _similarity(
                    candidate_name,
                    api_place.get("name"),
                )

                if score > best_score:
                    best_score = score
                    best_index = index

            matched = (
                api_places[best_index]
                if (
                    best_index is not None
                    and best_score >= 0.70
                )
                else None
            )

            item = {
                "name": candidate_name,
                "category": candidate.get(
                    "category"
                ),
                "area": region_name,
                "reason": candidate.get(
                    "reason"
                ),
                "suggested_duration_minutes":
                    candidate.get(
                        "suggested_duration_minutes"
                    ),
                "latitude": None,
                "longitude": None,
                "formatted": None,
                "distance": None,
                "place_id": None,
                "categories": [],
                "rating": None,
            }

            if matched:

                used_api.add(best_index)

                item.update(
                    {
                        "latitude": matched.get(
                            "latitude"
                        ),
                        "longitude": matched.get(
                            "longitude"
                        ),
                        "formatted": matched.get(
                            "formatted"
                        ),
                        "distance": matched.get(
                            "distance"
                        ),
                        "place_id": matched.get(
                            "place_id"
                        ),
                        "categories": matched.get(
                            "categories",
                            [],
                        ),
                        "rating": matched.get(
                            "rating"
                        ),
                    }
                )

            merged.append(item)

    # If Gemini returned no places, use real API places
    if not merged:

        for place in api_places[:30]:

            categories = place.get(
                "categories",
                [],
            )

            category = (
                categories[0]
                if isinstance(
                    categories,
                    list,
                ) and categories
                else None
            )

            merged.append(
                {
                    "name": place.get(
                        "name"
                    ),
                    "category": category,
                    "area": place.get(
                        "search_area"
                    ),
                    "reason": None,
                    "suggested_duration_minutes":
                        None,
                    "latitude": place.get(
                        "latitude"
                    ),
                    "longitude": place.get(
                        "longitude"
                    ),
                    "formatted": place.get(
                        "formatted"
                    ),
                    "distance": place.get(
                        "distance"
                    ),
                    "place_id": place.get(
                        "place_id"
                    ),
                    "categories": categories,
                    "rating": place.get(
                        "rating"
                    ),
                }
            )

    return merged


# ============================================================
# TRANSPORT
# ============================================================

def _extract_flight_options(
    data: Any,
) -> list[dict[str, Any]]:

    if not isinstance(data, dict):
        return []

    options: list[
        dict[str, Any]
    ] = []

    for key in (
        "best_flights",
        "other_flights",
        "flights",
        "results",
    ):

        value = data.get(key)

        if isinstance(value, list):
            options.extend(
                item
                for item in value
                if isinstance(item, dict)
            )

    return options


def _extract_first_station_code(
    response: dict[str, Any],
) -> str | None:

    if not response:
        return None

    data = response.get(
        "data",
        response,
    )

    candidates: list[Any] = []

    if isinstance(data, list):
        candidates = data

    elif isinstance(data, dict):

        for key in (
            "stations",
            "results",
            "items",
            "data",
        ):

            value = data.get(key)

            if isinstance(value, list):
                candidates = value
                break

    for station in candidates:

        if not isinstance(station, dict):
            continue

        for key in (
            "code",
            "stationCode",
            "station_code",
        ):

            value = station.get(key)

            if value:
                return str(value).upper()

        nested = station.get("station")

        if isinstance(nested, dict):

            for key in (
                "code",
                "stationCode",
                "station_code",
            ):

                value = nested.get(key)

                if value:
                    return str(value).upper()

    return None


async def _resolve_airports(
    request: AgentTripRequest,
) -> tuple[
    str | None,
    str | None,
    dict[str, Any],
]:

    departure_id = request.departure_id
    arrival_id = request.arrival_id

    diagnostics = {
        "departure_query":
            request.starting_location,
        "arrival_query":
            request.destination,
        "departure_error": None,
        "arrival_error": None,
    }

    if not departure_id:

        result = await safe_api_call(
            resolve_flight_location,
            request.starting_location,
        )

        if result.get("status") == "success":

            airport = (
                result.get("data", {})
                .get("airport", {})
            )

            if isinstance(airport, dict):
                departure_id = airport.get(
                    "id"
                )

        else:
            diagnostics[
                "departure_error"
            ] = result.get("error")

    if not arrival_id:

        result = await safe_api_call(
            resolve_flight_location,
            request.destination,
        )

        if result.get("status") == "success":

            airport = (
                result.get("data", {})
                .get("airport", {})
            )

            if isinstance(airport, dict):
                arrival_id = airport.get(
                    "id"
                )

        else:
            diagnostics[
                "arrival_error"
            ] = result.get("error")

    diagnostics[
        "resolved_departure"
    ] = departure_id

    diagnostics[
        "resolved_arrival"
    ] = arrival_id

    return (
        departure_id,
        arrival_id,
        diagnostics,
    )


async def _research_transport(
    request: AgentTripRequest,
) -> tuple[
    dict[str, Any] | None,
    dict[str, Any] | None,
]:

    preference = (
        request.transport_preference
        or ""
    ).strip().lower()

    wants_flight = preference in {
        "flight",
        "flights",
        "air",
        "airplane",
    }

    wants_train = preference in {
        "train",
        "trains",
        "rail",
    }

    wants_both = preference in {
        "",
        "any",
        "both",
        "flight/train",
        "flight or train",
        "not sure",
    }

    flights = None
    trains = None

    # --------------------------------------------------------
    # FLIGHTS
    # --------------------------------------------------------

    if wants_flight or wants_both:

        (
            departure_id,
            arrival_id,
            diagnostics,
        ) = await _resolve_airports(request)

        if (
            departure_id
            and arrival_id
        ):

            outbound = await safe_api_call(
                search_flights,
                departure_id,
                arrival_id,
                request.start_date,
                request.adults,
            )

            return_flight = await safe_api_call(
                search_flights,
                arrival_id,
                departure_id,
                request.end_date,
                request.adults,
            )

            outbound_data = outbound.get(
                "data"
            )

            return_data = return_flight.get(
                "data"
            )

            combined: list[
                dict[str, Any]
            ] = []

            for item in _extract_flight_options(
                outbound_data
            ):

                item = dict(item)
                item["journey"] = "outbound"
                combined.append(item)

            for item in _extract_flight_options(
                return_data
            ):

                item = dict(item)
                item["journey"] = "return"
                combined.append(item)

            outbound_ok = (
                outbound.get("status")
                == "success"
            )

            return_ok = (
                return_flight.get("status")
                == "success"
            )

            flights = {
                "status": (
                    "success"
                    if combined
                    else (
                        "partial"
                        if outbound_ok or return_ok
                        else "error"
                    )
                ),
                "data": {
                    "outbound":
                        outbound_data,
                    "return":
                        return_data,
                    "flights":
                        combined,
                    "best_flights":
                        combined,
                },
                "error":
                    outbound.get("error"),
                "return_error":
                    return_flight.get("error"),
                "resolved_departure":
                    departure_id,
                "resolved_arrival":
                    arrival_id,
                "outbound_date":
                    request.start_date.isoformat(),
                "return_date":
                    request.end_date.isoformat(),
                "passenger_count":
                    request.adults,
            }

        else:

            flights = {
                "status": "error",
                "data": None,
                "error":
                    "Could not resolve a usable airport for the requested route.",
                "resolution":
                    diagnostics,
            }

    # --------------------------------------------------------
    # TRAINS
    # --------------------------------------------------------

    if wants_train or wants_both:

        train_source = request.train_source
        train_destination = (
            request.train_destination
        )

        if not train_source:

            result = await safe_api_call(
                search_train_stations,
                request.starting_location,
            )

            if result.get("status") == "success":

                train_source = (
                    _extract_first_station_code(
                        result.get(
                            "data",
                            {},
                        )
                    )
                )

        if not train_destination:

            result = await safe_api_call(
                search_train_stations,
                request.destination,
            )

            if result.get("status") == "success":

                train_destination = (
                    _extract_first_station_code(
                        result.get(
                            "data",
                            {},
                        )
                    )
                )

        if (
            train_source
            and train_destination
        ):

            search_result = await safe_api_call(
                search_trains,
                train_source,
                train_destination,
            )

            trains = {
                "status":
                    search_result.get(
                        "status"
                    ),
                "data":
                    search_result.get(
                        "data"
                    ),
                "error":
                    search_result.get(
                        "error"
                    ),
                "resolved_source":
                    train_source,
                "resolved_destination":
                    train_destination,
                "journey_date":
                    request.start_date.isoformat(),
            }

        else:

            trains = {
                "status": "error",
                "data": None,
                "error":
                    "Could not resolve railway stations for the requested route.",
            }

    return flights, trains


# ============================================================
# HOTELS
# ============================================================

async def _create_hotel_stay_plan(
    request: AgentTripRequest,
    experience_plan: dict[str, Any],
) -> list[dict[str, Any]]:

    total_nights = _total_nights(request)

    if total_nights <= 0:
        return []

    # Keep the prompt compact.
    compact_plan = {
        "summary":
            experience_plan.get("summary"),
        "regions": [
            {
                "name": r.get("name"),
                "recommended_days":
                    r.get("recommended_days"),
                "priority":
                    r.get("priority"),
            }
            for r in experience_plan.get(
                "regions",
                []
            )
            if isinstance(r, dict)
        ],
    }

    prompt = f"""
Plan hotel stays for this Travelto trip.

Destination: {request.destination}
Start: {request.start_date}
End: {request.end_date}
Total travelers: {request.travelers}
Adults: {request.adults}
Children: {request.children}
TOTAL group budget: ₹{request.budget}

Destination regions:
{json.dumps(
    compact_plan,
    ensure_ascii=False,
)}

Rules:

1. Cover exactly {total_nights} nights.
2. First check-in must be {request.start_date}.
3. Final check-out must be {request.end_date}.
4. Do not invent hotel names, prices or availability.
5. Group nearby regions.
6. Move hotels only when it materially reduces backtracking.
7. Prefer 1–3 sensible stays.
8. Every stay must have positive nights.
9. Use searchable region/area names.

Return ONLY JSON:

{{
  "stays": [
    {{
      "region": "searchable region",
      "check_in": "YYYY-MM-DD",
      "check_out": "YYYY-MM-DD",
      "nights": 2,
      "reason": "why this stay fits"
    }}
  ]
}}
"""

    try:
        result = await _generate_json(prompt)

        # Gemini may return either the expected {"stays": [...]} object
        # or a JSON list of stay objects. Normalize both shapes so a valid
        # list response does not crash on result.get(...).
        if isinstance(result, dict):
            stays = result.get("stays", [])
        elif isinstance(result, list):
            stays = result
        else:
            logger.warning(
                "Hotel stay planner returned unsupported response type: %s",
                type(result).__name__,
            )
            return []

        if not isinstance(stays, list):
            logger.warning(
                "Hotel stay planner returned a non-list 'stays' value: %s",
                type(stays).__name__,
            )
            return []

        # Keep only object-shaped stay entries. Invalid entries should not
        # break the complete AI-agent response.
        return [
            stay for stay in stays
            if isinstance(stay, dict)
        ]

    except RuntimeError as exc:
        logger.warning(
            "Hotel stay planning unavailable: %s",
            exc,
        )

        return []


def _extract_hotel_properties(
    search_response: dict[str, Any],
) -> list[dict[str, Any]]:

    if not isinstance(
        search_response,
        dict,
    ):
        return []

    raw = search_response.get("data")

    if not isinstance(raw, dict):
        return []

    properties = raw.get(
        "properties"
    )

    if not isinstance(properties, list):

        hotels = raw.get("hotels")

        if isinstance(hotels, list):
            properties = hotels

        else:

            results = raw.get(
                "results"
            )

            properties = (
                results
                if isinstance(results, list)
                else []
            )

    return [
        item
        for item in properties
        if isinstance(item, dict)
    ]


async def _research_hotels(
    request: AgentTripRequest,
    experience_plan: dict[str, Any],
) -> dict[str, Any]:

    raw_stays = await _create_hotel_stay_plan(
        request,
        experience_plan,
    )

    valid_stays: list[
        dict[str, Any]
    ] = []

    for stay in raw_stays:

        if not isinstance(stay, dict):
            continue

        region = str(
            stay.get("region") or ""
        ).strip()

        try:
            check_in = date.fromisoformat(
                str(
                    stay.get(
                        "check_in"
                    )
                )
            )

            check_out = date.fromisoformat(
                str(
                    stay.get(
                        "check_out"
                    )
                )
            )

        except (
            TypeError,
            ValueError,
        ):
            continue

        if (
            not region
            or check_out <= check_in
        ):
            continue

        check_in = max(
            check_in,
            request.start_date,
        )

        check_out = min(
            check_out,
            request.end_date,
        )

        if check_out <= check_in:
            continue

        valid_stays.append(
            {
                "region": region,
                "check_in":
                    check_in.isoformat(),
                "check_out":
                    check_out.isoformat(),
                "nights":
                    (check_out - check_in).days,
                "reason":
                    stay.get("reason"),
            }
        )

    valid_stays.sort(
        key=lambda x: x["check_in"]
    )

    total_nights = _total_nights(
        request
    )

    covered_nights = sum(
        item["nights"]
        for item in valid_stays
    )

    exact_start = (
        bool(valid_stays)
        and valid_stays[0]["check_in"]
        == request.start_date.isoformat()
    )

    exact_end = (
        bool(valid_stays)
        and valid_stays[-1]["check_out"]
        == request.end_date.isoformat()
    )

    if (
        not valid_stays
        or covered_nights != total_nights
        or not exact_start
        or not exact_end
    ):

        valid_stays = [
            {
                "region":
                    request.destination,
                "check_in":
                    request.start_date.isoformat(),
                "check_out":
                    request.end_date.isoformat(),
                "nights":
                    total_nights,
                "reason":
                    "Destination-wide fallback stay covering the complete trip.",
            }
        ]

    stay_results: list[
        dict[str, Any]
    ] = []

    all_properties: list[
        dict[str, Any]
    ] = []

    seen_property_keys: set[str] = set()

    for stay in valid_stays:

        search_result = await safe_api_call(
            search_hotels,
            stay["region"],
            date.fromisoformat(
                stay["check_in"]
            ),
            date.fromisoformat(
                stay["check_out"]
            ),
            request.adults,
        )

        properties = _extract_hotel_properties(
            search_result
        )

        enriched_properties = []

        for property_item in properties:

            item = dict(property_item)

            item["stay_region"] = (
                stay["region"]
            )

            item["check_in"] = (
                stay["check_in"]
            )

            item["check_out"] = (
                stay["check_out"]
            )

            item["nights"] = (
                stay["nights"]
            )

            key = str(
                item.get("property_token")
                or item.get("name")
                or item.get("hotel_id")
                or ""
            ).strip().lower()

            if (
                key
                and key in seen_property_keys
            ):
                continue

            if key:
                seen_property_keys.add(key)

            enriched_properties.append(item)
            all_properties.append(item)

        stay_results.append(
            {
                **stay,
                "search":
                    search_result,
                "properties":
                    enriched_properties,
            }
        )

    # Destination fallback
    if not all_properties:

        fallback = await safe_api_call(
            search_hotels,
            request.destination,
            request.start_date,
            request.end_date,
            request.adults,
        )

        fallback_properties = (
            _extract_hotel_properties(
                fallback
            )
        )

        for property_item in fallback_properties:

            item = dict(property_item)

            item["stay_region"] = (
                request.destination
            )

            item["check_in"] = (
                request.start_date.isoformat()
            )

            item["check_out"] = (
                request.end_date.isoformat()
            )

            item["nights"] = total_nights

            all_properties.append(item)

        stay_results.append(
            {
                "region":
                    request.destination,
                "check_in":
                    request.start_date.isoformat(),
                "check_out":
                    request.end_date.isoformat(),
                "nights":
                    total_nights,
                "reason":
                    "Destination-wide fallback hotel search.",
                "search":
                    fallback,
                "properties":
                    fallback_properties,
            }
        )

    has_data = bool(
        all_properties
    )

    return {
        "status":
            "success"
            if has_data
            else "empty",
        "data": {
            "properties":
                all_properties,
            "stays":
                stay_results,
        },
        "error":
            None
            if has_data
            else
            "No hotel properties were returned by the provider.",
    }


# ============================================================
# ROUTES
# ============================================================

async def _build_place_routes(
    places: list[dict[str, Any]],
) -> list[dict[str, Any]]:

    usable = [
        place
        for place in places
        if _valid_coordinates(
            place.get("latitude"),
            place.get("longitude"),
        )
    ]

    if len(usable) < 2:
        return []

    # Avoid too many route API calls.
    usable = usable[:20]

    routes: list[
        dict[str, Any]
    ] = []

    for start, end in zip(
        usable,
        usable[1:],
    ):

        result = await safe_api_call(
            get_route,
            start["latitude"],
            start["longitude"],
            end["latitude"],
            end["longitude"],
        )

        if result.get("status") != "success":
            continue

        route_items = (
            result.get(
                "data",
                {}
            ).get(
                "routes",
                []
            )
        )

        if not route_items:
            continue

        route = route_items[0]

        distance = float(
            route.get(
                "distance",
                0,
            ) or 0
        )

        duration = float(
            route.get(
                "duration",
                0,
            ) or 0
        )

        routes.append(
            {
                "from":
                    start.get("name"),
                "to":
                    end.get("name"),
                "distance_meters":
                    distance,
                "distance_km":
                    round(
                        distance / 1000,
                        2,
                    ),
                "duration_seconds":
                    duration,
                "duration_minutes":
                    round(
                        duration / 60
                    ),
            }
        )

    return routes


# ============================================================
# WEATHER
# ============================================================

async def _research_weather(
    coordinates: dict[str, Any],
    request: AgentTripRequest,
) -> dict[str, Any]:

    if not _valid_coordinates(
        coordinates.get("latitude"),
        coordinates.get("longitude"),
    ):
        return {
            "status": "error",
            "data": None,
            "error":
                "Invalid destination coordinates.",
        }

    return await safe_api_call(
        search_weather,
        coordinates["latitude"],
        coordinates["longitude"],
        request.start_date,
        request.end_date,
    )


# ============================================================
# BUDGET
# ============================================================

def _number(
    value: Any,
) -> float | None:

    if value is None:
        return None

    if isinstance(
        value,
        (int, float),
    ):
        return float(value)

    if isinstance(value, str):

        match = re.search(
            r"\d+(?:\.\d+)?",
            value.replace(",", ""),
        )

        return (
            float(match.group())
            if match
            else None
        )

    return None


def _item_price(
    item: dict[str, Any],
) -> tuple[
    float | None,
    str | None,
]:

    # Prefer explicit total prices.
    for key in (
        "total_rate",
        "total_price",
        "totalPrice",
        "total_fare",
        "totalFare",
        "group_total",
    ):

        value = _number(
            item.get(key)
        )

        if value is not None and value > 0:
            return value, "provider_total"

    # Then normal price.
    for key in (
        "price",
        "extracted_price",
    ):

        value = _number(
            item.get(key)
        )

        if value is not None and value > 0:
            return value, "provider_returned"

    # Finally nightly price.
    for key in (
        "rate_per_night",
        "ratePerNight",
        "price_per_night",
        "pricePerNight",
        "nightly_price",
    ):

        value = _number(
            item.get(key)
        )

        if value is not None and value > 0:
            return value, "provider_nightly"

    return None, None


def _budget_transport(
    flights: dict[str, Any] | None,
    trains: dict[str, Any] | None,
) -> dict[str, Any]:

    options: list[
        dict[str, Any]
    ] = []

    if (
        isinstance(flights, dict)
        and flights.get("status")
        in {"success", "partial"}
    ):

        for item in _extract_flight_options(
            flights.get("data") or {}
        ):

            amount, scope = _item_price(
                item
            )

            if amount is not None:

                options.append(
                    {
                        "journey":
                            item.get(
                                "journey"
                            ),
                        "amount":
                            round(
                                amount,
                                2,
                            ),
                        "pricing_scope":
                            scope,
                        "name":
                            item.get(
                                "airline"
                            )
                            or item.get(
                                "name"
                            ),
                        "flight_number":
                            item.get(
                                "flight_number"
                            ),
                    }
                )

    if (
        isinstance(trains, dict)
        and trains.get("status")
        == "success"
    ):

        data = trains.get(
            "data"
        ) or {}

        candidates = (
            data
            if isinstance(data, list)
            else []
        )

        if isinstance(data, dict):

            for key in (
                "trains",
                "results",
                "items",
                "data",
            ):

                value = data.get(key)

                if isinstance(value, list):
                    candidates = value
                    break

        for item in candidates:

            if not isinstance(item, dict):
                continue

            amount, scope = _item_price(
                item
            )

            if amount is not None:

                options.append(
                    {
                        "journey":
                            "train",
                        "amount":
                            round(
                                amount,
                                2,
                            ),
                        "pricing_scope":
                            scope,
                        "name":
                            item.get(
                                "train_name"
                            )
                            or item.get(
                                "name"
                            ),
                        "train_number":
                            item.get(
                                "train_number"
                            )
                            or item.get(
                                "number"
                            ),
                    }
                )

    outbound = [
        x for x in options
        if x.get("journey")
        == "outbound"
    ]

    returning = [
        x for x in options
        if x.get("journey")
        == "return"
    ]

    if outbound and returning:

        out = min(
            outbound,
            key=lambda x: x["amount"],
        )

        ret = min(
            returning,
            key=lambda x: x["amount"],
        )

        total = (
            out["amount"]
            + ret["amount"]
        )

        return {
            "amount":
                round(total, 2),
            "status":
                "verified",
            "source":
                "provider",
            "scope":
                "provider_search_configuration",
            "selection": {
                "outbound": out,
                "return": ret,
            },
        }

    if options:

        best = min(
            options,
            key=lambda x: x["amount"],
        )

        return {
            "amount":
                round(
                    best["amount"],
                    2,
                ),
            "status":
                "partial",
            "source":
                "provider",
            "scope":
                "provider_returned",
            "selection":
                best,
        }

    return {
        "amount": 0,
        "status":
            "unavailable",
        "source":
            "unavailable",
        "scope":
            "none",
        "selection":
            None,
    }


def _budget_hotels(
    hotels: dict[str, Any] | None,
) -> dict[str, Any]:

    properties: list[
        dict[str, Any]
    ] = []

    if isinstance(
        hotels,
        dict,
    ):

        data = hotels.get(
            "data"
        ) or {}

        if isinstance(data, dict):

            raw_properties = data.get(
                "properties",
                [],
            )

            if isinstance(
                raw_properties,
                list,
            ):
                properties = [
                    x
                    for x in raw_properties
                    if isinstance(
                        x,
                        dict,
                    )
                ]

    candidates = []

    for item in properties:

        amount, scope = _item_price(
            item
        )

        if amount is None:
            continue

        nights = int(
            item.get("nights")
            or 0
        )

        if scope == "provider_nightly":

            if nights <= 0:
                continue

            total = (
                amount * nights
            )

            pricing_scope = (
                "provider_nightly_rate_x_nights"
            )

        else:

            total = amount

            pricing_scope = (
                "provider_returned_total"
            )

        candidates.append(
            {
                "name":
                    item.get("name"),
                "region":
                    item.get(
                        "stay_region"
                    ),
                "nights":
                    nights,
                "amount":
                    round(
                        total,
                        2,
                    ),
                "pricing_scope":
                    pricing_scope,
            }
        )

    if not candidates:

        return {
            "amount": 0,
            "status":
                "unavailable",
            "source":
                "unavailable",
            "selection":
                None,
        }

    selected = min(
        candidates,
        key=lambda x: x["amount"],
    )

    return {
        "amount":
            selected["amount"],
        "status":
            "verified",
        "source":
            "provider",
        "selection":
            selected,
        "alternatives_count":
            len(candidates) - 1,
    }


def _budget_estimates(
    request: AgentTripRequest,
    experience_plan: dict[str, Any],
    routes: list[dict[str, Any]],
) -> tuple[
    dict[str, Any],
    dict[str, Any],
    dict[str, Any],
]:

    days = max(
        1,
        (
            request.end_date
            - request.start_date
        ).days + 1,
    )

    # Planning estimate only.
    food_amount = (
        request.adults * 800
        + request.children * 500
    ) * days

    food = {
        "amount":
            round(
                food_amount,
                2,
            ),
        "status":
            "estimated",
        "source":
            "planning_estimate",
        "assumption":
            "₹800/adult/day and ₹500/child/day for meals.",
    }

    place_count = sum(
        len(
            r.get("places", [])
        )
        for r in experience_plan.get(
            "regions",
            []
        )
        if isinstance(r, dict)
    )

    activity_amount = (
        request.adults * 450 * days
        + request.children * 250 * days
    )

    activities = {
        "amount":
            round(
                activity_amount,
                2,
            ),
        "status":
            "estimated",
        "source":
            "planning_estimate",
        "assumption":
            "Activity/entry allowance; actual ticket prices must be verified before booking.",
        "planned_places":
            place_count,
    }

    route_km = sum(
        float(
            r.get(
                "distance_km",
                0,
            ) or 0
        )
        for r in routes
        if isinstance(r, dict)
    )

    local_transport_amount = max(
        2500,
        route_km * 20
        + max(
            1,
            days - 1,
        ) * 900,
    )

    local_transport = {
        "amount":
            round(
                local_transport_amount,
                2,
            ),
        "status":
            "estimated",
        "source":
            "planning_estimate",
        "assumption":
            "Local taxi/cab allowance. Route API supplies distance/time, not a live fare.",
        "route_distance_km":
            round(
                route_km,
                2,
            ),
    }

    return (
        food,
        activities,
        local_transport,
    )


def _build_budget_breakdown(
    request: AgentTripRequest,
    experience_plan: dict[str, Any],
    flights: dict[str, Any] | None,
    trains: dict[str, Any] | None,
    hotels: dict[str, Any] | None,
    routes: list[dict[str, Any]],
) -> dict[str, Any]:

    transport = _budget_transport(
        flights,
        trains,
    )

    accommodation = _budget_hotels(
        hotels
    )

    (
        food,
        activities,
        local_transport,
    ) = _budget_estimates(
        request,
        experience_plan,
        routes,
    )

    components = {
        "transport":
            transport,
        "accommodation":
            accommodation,
        "food":
            food,
        "activities":
            activities,
        "local_transport":
            local_transport,
    }

    total = round(
        sum(
            float(
                component.get(
                    "amount",
                    0,
                ) or 0
            )
            for component in components.values()
        ),
        2,
    )

    remaining = round(
        float(request.budget)
        - total,
        2,
    )

    return {
        "currency":
            "INR",
        "budget_scope":
            "group_total",
        "travelers":
            request.travelers,
        "adults":
            request.adults,
        "children":
            request.children,
        "requested_budget":
            round(
                float(request.budget),
                2,
            ),
        "components":
            components,
        "estimated_total":
            total,
        "remaining_budget":
            remaining,
        "within_budget":
            remaining >= 0,
        "note":
            (
                "Provider-returned transport/accommodation "
                "prices keep their provider pricing scope. "
                "Food, activities and local transport are "
                "planning estimates."
            ),
    }


# ============================================================
# COMPACT DATA FOR GEMINI
# ============================================================

def _compact_flight(
    item: dict[str, Any],
) -> dict[str, Any]:

    return {
        "journey":
            item.get("journey"),
        "airline":
            item.get("airline"),
        "flight_number":
            item.get("flight_number"),
        "price":
            item.get("price")
            or item.get("extracted_price")
            or item.get("total_price"),
        "total_price":
            item.get("total_price"),
        "departure":
            item.get("departure_airport")
            or item.get("departure"),
        "arrival":
            item.get("arrival_airport")
            or item.get("arrival"),
        "duration":
            item.get("total_duration")
            or item.get("duration"),
        "stops":
            item.get("stops"),
    }


def _compact_flights(
    flights: dict[str, Any] | None,
) -> list[dict[str, Any]]:

    if not isinstance(
        flights,
        dict,
    ):
        return []

    items = _extract_flight_options(
        flights.get("data") or {}
    )

    compact = []

    for item in items[:12]:

        if isinstance(item, dict):
            compact.append(
                _compact_flight(item)
            )

    return compact


def _compact_hotel(
    item: dict[str, Any],
) -> dict[str, Any]:

    return {
        "name":
            item.get("name"),
        "region":
            item.get("stay_region"),
        "rating":
            item.get("rating"),
        "price":
            item.get("price")
            or item.get("extracted_price")
            or item.get("total_price"),
        "total_price":
            item.get("total_price"),
        "rate_per_night":
            item.get(
                "rate_per_night"
            )
            or item.get(
                "price_per_night"
            ),
        "nights":
            item.get("nights"),
        "check_in":
            item.get("check_in"),
        "check_out":
            item.get("check_out"),
        "amenities":
            (
                item.get("amenities", [])[:8]
                if isinstance(
                    item.get("amenities"),
                    list,
                )
                else []
            ),
    }


def _compact_hotels(
    hotels: dict[str, Any] | None,
) -> list[dict[str, Any]]:

    if not isinstance(
        hotels,
        dict,
    ):
        return []

    data = hotels.get(
        "data"
    ) or {}

    if not isinstance(
        data,
        dict,
    ):
        return []

    properties = data.get(
        "properties",
        [],
    )

    if not isinstance(
        properties,
        list,
    ):
        return []

    return [
        _compact_hotel(item)
        for item in properties[:20]
        if isinstance(
            item,
            dict,
        )
    ]


def _compact_places(
    places: list[dict[str, Any]],
) -> list[dict[str, Any]]:

    compact = []

    for item in places[:40]:

        if not isinstance(
            item,
            dict,
        ):
            continue

        compact.append(
            {
                "name":
                    item.get("name"),
                "category":
                    item.get("category"),
                "area":
                    item.get("area"),
                "reason":
                    item.get("reason"),
                "suggested_duration_minutes":
                    item.get(
                        "suggested_duration_minutes"
                    ),
                "latitude":
                    item.get("latitude"),
                "longitude":
                    item.get("longitude"),
                "rating":
                    item.get("rating"),
            }
        )

    return compact


def _compact_routes(
    routes: list[dict[str, Any]],
) -> list[dict[str, Any]]:

    return [
        {
            "from":
                item.get("from"),
            "to":
                item.get("to"),
            "distance_km":
                item.get(
                    "distance_km"
                ),
            "duration_minutes":
                item.get(
                    "duration_minutes"
                ),
        }
        for item in routes[:30]
        if isinstance(item, dict)
    ]


def _compact_weather(
    weather: dict[str, Any] | None,
) -> dict[str, Any]:

    if not isinstance(
        weather,
        dict,
    ):
        return {
            "status":
                "unavailable"
        }

    data = weather.get(
        "data"
    )

    if not isinstance(
        data,
        dict,
    ):
        return {
            "status":
                weather.get(
                    "status",
                    "unavailable",
                ),
            "error":
                weather.get(
                    "error"
                ),
        }

    # Only keep useful weather information.
    compact = {
        "status":
            weather.get(
                "status",
                "success",
            ),
    }

    for key in (
        "timezone",
        "daily",
        "daily_units",
    ):

        if key in data:
            value = data[key]

            if isinstance(
                value,
                dict,
            ):
                # Limit arrays.
                trimmed = {}

                for sub_key, sub_value in value.items():

                    if isinstance(
                        sub_value,
                        list,
                    ):
                        trimmed[sub_key] = (
                            sub_value[:14]
                        )
                    else:
                        trimmed[sub_key] = sub_value

                compact[key] = trimmed

            else:
                compact[key] = value

    return compact


def _compact_experience_plan(
    plan: dict[str, Any],
) -> dict[str, Any]:

    return {
        "summary":
            plan.get("summary"),
        "experience_categories":
            plan.get(
                "experience_categories",
                [],
            )[:12],
        "regions": [
            {
                "name":
                    region.get("name"),
                "reason":
                    region.get("reason"),
                "priority":
                    region.get("priority"),
                "recommended_days":
                    region.get(
                        "recommended_days"
                    ),
                "places": [
                    {
                        "name":
                            place.get("name"),
                        "category":
                            place.get("category"),
                        "reason":
                            place.get("reason"),
                        "suggested_duration_minutes":
                            place.get(
                                "suggested_duration_minutes"
                            ),
                    }
                    for place in region.get(
                        "places",
                        [],
                    )[:12]
                    if isinstance(
                        place,
                        dict,
                    )
                ],
            }
            for region in plan.get(
                "regions",
                [],
            )[:8]
            if isinstance(
                region,
                dict,
            )
        ],
        "special_considerations":
            plan.get(
                "special_considerations",
                [],
            )[:10],
    }


def _compact_budget(
    budget: dict[str, Any],
) -> dict[str, Any]:

    return {
        "currency":
            budget.get("currency"),
        "budget_scope":
            budget.get("budget_scope"),
        "travelers":
            budget.get("travelers"),
        "requested_budget":
            budget.get(
                "requested_budget"
            ),
        "estimated_total":
            budget.get(
                "estimated_total"
            ),
        "remaining_budget":
            budget.get(
                "remaining_budget"
            ),
        "within_budget":
            budget.get(
                "within_budget"
            ),
        "components":
            {
                key: {
                    "amount":
                        value.get("amount"),
                    "status":
                        value.get("status"),
                    "source":
                        value.get("source"),
                    "scope":
                        value.get(
                            "scope"
                        ),
                }
                for key, value
                in (
                    budget.get(
                        "components",
                        {},
                    ).items()
                    if isinstance(
                        budget.get(
                            "components",
                            {},
                        ),
                        dict,
                    )
                    else []
                )
                if isinstance(
                    value,
                    dict,
                )
            },
    }


# ============================================================
# FALLBACK ANALYSIS
# ============================================================

def _fallback_ai_analysis(
    request: AgentTripRequest,
    experience_plan: dict[str, Any],
    budget_breakdown: dict[str, Any],
    routes: list[dict[str, Any]],
    weather: dict[str, Any],
) -> dict[str, Any]:

    components = (
        budget_breakdown.get(
            "components",
            {},
        )
    )

    transport = components.get(
        "transport",
        {},
    )

    accommodation = components.get(
        "accommodation",
        {},
    )

    return {
        "summary": (
            "Travelto completed the real-world "
            "travel research. Gemini reconciliation "
            "was unavailable at this time, so the "
            "verified provider data and planning "
            "estimates are returned directly."
        ),
        "recommended_transport": {
            "type":
                request.transport_preference
                or "flight/train",
            "reason":
                "Use the available provider-returned option "
                "that best fits the trip dates and budget.",
            "option":
                transport.get(
                    "selection"
                ),
        },
        "hotel_strategy": [],
        "place_strategy": [
            {
                "region":
                    region.get("name"),
                "places": [
                    {
                        "name":
                            place.get("name"),
                        "category":
                            place.get("category"),
                        "reason":
                            place.get("reason"),
                        "suggested_duration_minutes":
                            place.get(
                                "suggested_duration_minutes"
                            ),
                    }
                    for place in region.get(
                        "places",
                        [],
                    )
                    if isinstance(
                        place,
                        dict,
                    )
                ],
            }
            for region in experience_plan.get(
                "regions",
                [],
            )
            if isinstance(
                region,
                dict,
            )
        ],
        "trip_flow": [],
        "budget_observation": (
            f"Estimated trip cost is "
            f"₹{budget_breakdown.get('estimated_total', 0):,.0f} "
            f"against the total group budget of "
            f"₹{request.budget:,.0f}. "
            f"Remaining budget is "
            f"₹{budget_breakdown.get('remaining_budget', 0):,.0f}."
        ),
        "weather_advice": (
            "Weather data available."
            if weather.get("status")
            == "success"
            else
            "Weather forecast is currently unavailable."
        ),
        "route_observations": [
            (
                f"{r.get('from')} → {r.get('to')}: "
                f"{r.get('distance_km')} km, "
                f"{r.get('duration_minutes')} min"
            )
            for r in routes[:10]
        ],
        "warnings": [
            "Some costs are planning estimates and must be verified before booking."
        ],
        "budget_verified_components": {
            "transport":
                transport,
            "accommodation":
                accommodation,
        },
    }


# ============================================================
# STAGE 3
# GEMINI RECONCILIATION
# ============================================================

async def _reconcile_trip(
    request: AgentTripRequest,
    experience_plan: dict[str, Any],
    places: list[dict[str, Any]],
    hotels: dict[str, Any],
    flights: dict[str, Any] | None,
    trains: dict[str, Any] | None,
    routes: list[dict[str, Any]],
    weather: dict[str, Any],
    budget_breakdown: dict[str, Any],
) -> dict[str, Any]:

    # --------------------------------------------------------
    # CRITICAL FIX:
    # NEVER send complete provider responses to Gemini.
    # --------------------------------------------------------

    compact_research = {
        "experience_plan":
            _compact_experience_plan(
                experience_plan
            ),
        "places":
            _compact_places(
                places
            ),
        "hotels":
            _compact_hotels(
                hotels
            ),
        "flights":
            _compact_flights(
                flights
            ),
        "trains":
            [],
        "routes":
            _compact_routes(
                routes
            ),
        "weather":
            _compact_weather(
                weather
            ),
        "budget":
            _compact_budget(
                budget_breakdown
            ),
    }

    # Compact train data separately.
    if isinstance(
        trains,
        dict,
    ):

        data = trains.get(
            "data"
        )

        candidates = []

        if isinstance(
            data,
            list,
        ):
            candidates = data

        elif isinstance(
            data,
            dict,
        ):

            for key in (
                "trains",
                "results",
                "items",
                "data",
            ):

                value = data.get(key)

                if isinstance(
                    value,
                    list,
                ):
                    candidates = value
                    break

        compact_trains = []

        for item in candidates[:10]:

            if not isinstance(
                item,
                dict,
            ):
                continue

            compact_trains.append(
                {
                    "name":
                        item.get(
                            "train_name"
                        )
                        or item.get(
                            "name"
                        ),
                    "number":
                        item.get(
                            "train_number"
                        )
                        or item.get(
                            "number"
                        ),
                    "price":
                        item.get(
                            "price"
                        )
                        or item.get(
                            "fare"
                        ),
                    "departure":
                        item.get(
                            "departure"
                        ),
                    "arrival":
                        item.get(
                            "arrival"
                        ),
                }
            )

        compact_research[
            "trains"
        ] = compact_trains

    prompt = f"""
You are the final travel intelligence engine for Travelto.

Create a coherent trip recommendation by combining:

1. Gemini destination intelligence.
2. Real-world provider/API research.

USER REQUEST
Starting location: {request.starting_location}
Destination: {request.destination}
Start date: {request.start_date}
End date: {request.end_date}
Travelers: {request.travelers}
Adults: {request.adults}
Children: {request.children}
TOTAL group budget: ₹{request.budget}
Transport preference: {request.transport_preference}
Travel style: {request.travel_style}
Interests: {request.interests}

COMPACT VERIFIED RESEARCH
{json.dumps(
    compact_research,
    ensure_ascii=False,
    default=str,
)}

BUDGET RULES

- ₹{request.budget} is the TOTAL budget for all travelers.
- Do not convert it into a per-person budget.
- Use the budget breakdown as the numerical baseline.
- Never multiply provider-returned group totals by travelers.
- Hotel pricing scope must be preserved.
- Food, activities and local transport are estimates unless a real provider price exists.
- Never call an estimated value verified/live.
- If total exceeds budget, explain the overage.
- Never invent availability, prices, schedules, opening hours or booking confirmations.

TRAVEL PLANNING RULES

- Keep useful destination experiences even when an API has no exact match.
- Group geographically close attractions.
- Avoid unnecessary backtracking.
- Connect arrival transport with the first practical region.
- Connect return transport with the final region.
- Restaurants are not a separate research workflow.
- This is a recommendation/research result, NOT a booking.
- If provider data is unavailable, say unavailable.

Return ONLY JSON:

{{
  "summary": "complete trip strategy",

  "recommended_transport": {{
    "type": "flight/train/other",
    "reason": "why this option fits",
    "option": {{}}
  }},

  "hotel_strategy": [
    {{
      "region": "region",
      "check_in": "YYYY-MM-DD",
      "check_out": "YYYY-MM-DD",
      "nights": 2,
      "recommended_hotel": {{}},
      "reason": "why"
    }}
  ],

  "place_strategy": [
    {{
      "region": "region",
      "places": [
        {{
          "name": "place",
          "category": "category",
          "reason": "why",
          "suggested_duration_minutes": 120
        }}
      ]
    }}
  ],

  "trip_flow": [
    {{
      "day": 1,
      "region": "region",
      "focus": "arrival + experiences",
      "movement": "movement"
    }}
  ],

  "budget_observation": "realistic TOTAL group budget explanation",

  "weather_advice": "weather advice or unavailable",

  "route_observations": [
    "useful route observation"
  ],

  "warnings": [
    "important limitation only"
  ]
}}
"""

    try:

        return await _generate_json(
            prompt
        )

    except RuntimeError as exc:

        # IMPORTANT:
        # Gemini quota failure should NOT destroy
        # the complete real API research.
        logger.warning(
            "Gemini reconciliation unavailable: %s",
            exc,
        )

        return _fallback_ai_analysis(
            request,
            experience_plan,
            budget_breakdown,
            routes,
            weather,
        )


# ============================================================
# MAIN AGENT
# ============================================================

async def arrange_trip(
    request: AgentTripRequest,
) -> dict[str, Any]:

    _validate_request(request)

    logger.info(
        "Starting Travelto Agent research | destination=%s | start=%s | end=%s",
        request.destination,
        request.start_date,
        request.end_date,
    )

    # --------------------------------------------------------
    # 1. DESTINATION COORDINATES
    # --------------------------------------------------------

    destination_coordinates = (
        await geocode_location(
            request.destination
        )
    )

    if not destination_coordinates:

        raise ValueError(
            f"Could not locate destination: "
            f"{request.destination}"
        )

    if not _valid_coordinates(
        destination_coordinates.get(
            "latitude"
        ),
        destination_coordinates.get(
            "longitude"
        ),
    ):

        raise ValueError(
            f"Invalid coordinates returned for destination: "
            f"{request.destination}"
        )

    # --------------------------------------------------------
    # 2. GEMINI DESTINATION INTELLIGENCE
    # --------------------------------------------------------

    experience_plan = (
        await _create_experience_plan(
            request
        )
    )

    # --------------------------------------------------------
    # 3. REGION-AWARE REAL PLACES
    # --------------------------------------------------------

    api_places = (
        await _search_places_for_experience_plan(
            experience_plan,
            destination_coordinates,
        )
    )

    places = _match_gemini_places(
        experience_plan,
        api_places,
    )

    # --------------------------------------------------------
    # 4. HOTEL RESEARCH
    # --------------------------------------------------------

    hotels = await _research_hotels(
        request,
        experience_plan,
    )

    # --------------------------------------------------------
    # 5. TRANSPORT
    # --------------------------------------------------------

    flights, trains = (
        await _research_transport(
            request
        )
    )

    # --------------------------------------------------------
    # 6. WEATHER
    # --------------------------------------------------------

    weather = await _research_weather(
        destination_coordinates,
        request,
    )

    # --------------------------------------------------------
    # 7. ROUTES
    # --------------------------------------------------------

    routes = await _build_place_routes(
        places
    )

    # --------------------------------------------------------
    # 8. COMPLETE GROUP BUDGET
    # --------------------------------------------------------

    budget_breakdown = (
        _build_budget_breakdown(
            request=request,
            experience_plan=experience_plan,
            flights=flights,
            trains=trains,
            hotels=hotels,
            routes=routes,
        )
    )

    # --------------------------------------------------------
    # 9. GEMINI RECONCILIATION
    # --------------------------------------------------------

    ai_analysis = await _reconcile_trip(
        request=request,
        experience_plan=experience_plan,
        places=places,
        hotels=hotels,
        flights=flights,
        trains=trains,
        routes=routes,
        weather=weather,
        budget_breakdown=budget_breakdown,
    )

    # --------------------------------------------------------
    # FINAL RESPONSE
    # --------------------------------------------------------

    return {
        "message": (
            "Travelto AI Agent completed "
            "destination research and trip analysis."
        ),

        "trip_request":
            request.model_dump(
                mode="json"
            ),

        "experience_plan":
            experience_plan,

        "places": {
            "status":
                "success"
                if places
                else "empty",
            "data":
                places,
            "error":
                None
                if places
                else
                "No place data was returned.",
        },

        "hotels":
            hotels,

        "flights":
            flights,

        "trains":
            trains,

        "weather":
            weather,

        "routes":
            routes,

        "budget_breakdown":
            budget_breakdown,

        "ai_analysis":
            ai_analysis,
    }