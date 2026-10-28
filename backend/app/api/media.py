import os
import json
import urllib.parse
import urllib.request
import urllib.error

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

router = APIRouter(
    prefix="/media",
    tags=["Media"]
)

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")


def _google_json_request(url: str, payload: dict, headers: dict):
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            **headers,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(
            f"Google Places request failed: {exc.code} {detail}"
        )
    except Exception as exc:
        raise RuntimeError(str(exc))


def _google_get_bytes(url: str):
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Travelto/1.0"
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            content_type = response.headers.get(
                "Content-Type",
                "image/jpeg"
            )
            return response.read(), content_type
    except urllib.error.HTTPError as exc:
        raise RuntimeError(
            f"Google image request failed: {exc.code}"
        )
    except Exception as exc:
        raise RuntimeError(str(exc))


def _is_route_activity(
    title: str,
    location: str,
    activity_type: str,
) -> bool:
    text = f"{title} {location} {activity_type}".lower()

    route_words = (
        "route",
        "road trip",
        "scenic drive",
        "drive to",
        "drive from",
        "road journey",
        "highway",
        "transfer",
        "airport transfer",
        "travel to",
        "travel from",
        "bus ride",
        "train ride",
    )

    return any(word in text for word in route_words)


def _build_place_query(
    destination: str,
    title: str,
    location: str,
    activity_type: str,
) -> str:
    """
    Build a semantic place query from the generated itinerary.

    We deliberately do NOT maintain a destination dictionary such as
    Goa -> Morjim or Araku -> Coffee. The actual activity/place text
    drives the search.
    """
    title = title.strip()
    location = location.strip()
    destination = destination.strip()

    text = f"{title} {location} {activity_type}".lower()

    modifiers = []

    if any(word in text for word in (
        "nightlife",
        "night life",
        "night beach",
        "night walk",
        "night view",
        "sunset",
    )):
        modifiers.append("night")

    if any(word in text for word in (
        "coffee",
        "coffee plantation",
        "plantation",
    )):
        modifiers.append("coffee plantation")

    if any(word in text for word in (
        "waterfall",
        "falls",
        "cascade",
    )):
        modifiers.append("waterfall")

    if any(word in text for word in (
        "beach",
        "shore",
        "coast",
    )):
        modifiers.append("beach")

    if any(word in text for word in (
        "restaurant",
        "cafe",
        "café",
        "lunch",
        "dinner",
        "breakfast",
        "food",
        "dining",
        "shack",
    )):
        modifiers.append("restaurant")

    parts = []

    # The location usually contains the exact place name.
    if location:
        parts.append(location)

    if title and title.lower() not in location.lower():
        parts.append(title)

    parts.extend(modifiers)

    if destination:
        parts.append(destination)

    query = " ".join(parts)

    # Keep the query reasonably small while preserving the useful terms.
    return " ".join(query.split())[:300]


def _find_place_photo(
    destination: str,
    title: str,
    location: str,
    activity_type: str,
):
    query = _build_place_query(
        destination,
        title,
        location,
        activity_type,
    )

    if not query:
        return None

    data = _google_json_request(
        "https://places.googleapis.com/v1/places:searchText",
        {
            "textQuery": query,
            "languageCode": "en",
            "regionCode": "IN",
            "maxResultCount": 5,
        },
        {
            "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
            # Photos are needed so we can resolve the actual place photo.
            "X-Goog-FieldMask": (
                "places.name,"
                "places.displayName,"
                "places.formattedAddress,"
                "places.location,"
                "places.photos"
            ),
        },
    )

    places = data.get("places", [])

    for place in places:
        photos = place.get("photos") or []
        if not photos:
            continue

        photo_name = photos[0].get("name")
        if not photo_name:
            continue

        photo_url = (
            "https://places.googleapis.com/v1/"
            f"{photo_name}/media?"
            + urllib.parse.urlencode({
                "maxWidthPx": 1200,
                "maxHeightPx": 800,
                "key": GOOGLE_MAPS_API_KEY,
            })
        )

        return photo_url

    return None


def _build_street_view_url(
    destination: str,
    title: str,
    location: str,
):
    # Street View is appropriate for travel/road/transfer activities.
    # It gives a real road-level image near the supplied location.
    place = location.strip() or destination.strip()

    if not place:
        return None

    params = urllib.parse.urlencode({
        "size": "640x640",
        "location": place,
        "fov": "90",
        "pitch": "5",
        "return_error_code": "1",
        "key": GOOGLE_MAPS_API_KEY,
    })

    return (
        "https://maps.googleapis.com/maps/api/streetview?"
        + params
    )


@router.get("/activity-image")
def activity_image(
    destination: str = Query(default=""),
    title: str = Query(default=""),
    location: str = Query(default=""),
    activity_type: str = Query(default=""),
):
    if not GOOGLE_MAPS_API_KEY:
        raise HTTPException(
            status_code=503,
            detail=(
                "GOOGLE_MAPS_API_KEY is not configured. "
                "Add it to backend/.env."
            ),
        )

    try:
        # 1. For route/transfer activities, prefer a real road-level
        # Street View image instead of a generic destination photo.
        if _is_route_activity(
            title,
            location,
            activity_type,
        ):
            street_url = _build_street_view_url(
                destination,
                title,
                location,
            )

            if street_url:
                try:
                    image_bytes, content_type = _google_get_bytes(
                        street_url
                    )

                    return Response(
                        content=image_bytes,
                        media_type=content_type,
                        headers={
                            "Cache-Control": "no-store",
                        },
                    )
                except Exception:
                    # If Street View is unavailable at that location,
                    # continue to the place-photo resolver.
                    pass

        # 2. For POIs/experiences, resolve the actual place/activity
        # through Google Places instead of a hardcoded destination map.
        photo_url = _find_place_photo(
            destination,
            title,
            location,
            activity_type,
        )

        if photo_url:
            image_bytes, content_type = _google_get_bytes(photo_url)

            return Response(
                content=image_bytes,
                media_type=content_type,
                headers={
                    "Cache-Control": "no-store",
                },
            )

    except Exception:
        # The frontend has a safe fallback image. Do not break
        # the entire itinerary because one image provider failed.
        pass

    raise HTTPException(
        status_code=404,
        detail="No suitable activity image found."
    )
