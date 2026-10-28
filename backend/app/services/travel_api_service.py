import os

from datetime import date

from typing import Any, Optional



import httpx





# ============================================================

# API URLS

# ============================================================



SERPAPI_URL = (

    "https://serpapi.com/search.json"

)



RAILRADAR_BASE_URL = (

    "https://api.railradar.in/v1"

)



GEOAPIFY_PLACES_URL = (

    "https://api.geoapify.com/v2/places"

)



GEOAPIFY_GEOCODE_URL = (

    "https://api.geoapify.com/v1/geocode/search"

)



OPEN_METEO_URL = (

    "https://api.open-meteo.com/v1/forecast"

)



OSRM_BASE_URL = (

    "https://router.project-osrm.org/route/v1"

)





# ============================================================

# TIMEOUT

# ============================================================



HTTP_TIMEOUT = 30.0





# ============================================================

# HELPERS

# ============================================================



def _required_env(name: str) -> str:

    value = os.getenv(name)



    if not value:

        raise RuntimeError(

            f"{name} is not configured in backend/.env"

        )



    return value





def _headers() -> dict[str, str]:

    return {

        "Accept": "application/json",

        "User-Agent": "Travelto-AI-Agent/1.0",

    }





# ============================================================

# GEOCODING

# ============================================================



async def geocode_location(

    location: str,

) -> dict[str, Any]:

    """

    Dynamically convert a city/place name into coordinates.



    No destination-specific coordinates are hardcoded.

    """



    api_key = _required_env(

        "GEOAPIFY_API_KEY"

    )



    params = {

        "text": location,

        "limit": 1,

        "apiKey": api_key,

    }



    async with httpx.AsyncClient(

        timeout=HTTP_TIMEOUT,

        headers=_headers(),

    ) as client:



        response = await client.get(

            GEOAPIFY_GEOCODE_URL,

            params=params,

        )



        response.raise_for_status()



        data = response.json()



    features = data.get(

        "features",

        [],

    )



    if not features:

        raise RuntimeError(

            f"Could not find coordinates for {location}"

        )



    properties = features[0].get(

        "properties",

        {},

    )



    longitude = properties.get(

        "lon"

    )



    latitude = properties.get(

        "lat"

    )



    if longitude is None or latitude is None:

        raise RuntimeError(

            f"Coordinates not available for {location}"

        )



    return {

        "latitude": latitude,

        "longitude": longitude,

        "formatted": properties.get(

            "formatted"

        ),

        "city": properties.get(

            "city"

        ),

        "country": properties.get(

            "country"

        ),

    }





# ============================================================

# WEATHER — OPEN METEO

# ============================================================



async def search_weather(

    latitude: float,

    longitude: float,

    start_date: date,

    end_date: date,

) -> dict[str, Any]:

    """

    Get weather information for the requested trip period.



    Open-Meteo may reject dates that are outside its forecast

    range. The caller handles such failures gracefully.

    """



    params = {

        "latitude": latitude,

        "longitude": longitude,

        "current": (

            "temperature_2m,"

            "relative_humidity_2m,"

            "apparent_temperature,"

            "weather_code,"

            "wind_speed_10m"

        ),

        "daily": (

            "weather_code,"

            "temperature_2m_max,"

            "temperature_2m_min,"

            "precipitation_probability_max"

        ),

        "timezone": "auto",

        "start_date": start_date.isoformat(),

        "end_date": end_date.isoformat(),

    }



    async with httpx.AsyncClient(

        timeout=HTTP_TIMEOUT,

        headers=_headers(),

    ) as client:



        response = await client.get(

            OPEN_METEO_URL,

            params=params,

        )



        response.raise_for_status()



        return response.json()





# ============================================================

# PLACES — GEOAPIFY

# ============================================================



async def search_places(

    latitude: float,

    longitude: float,

    radius_meters: int = 50000,

    limit: int = 50,

) -> dict[str, Any]:

    """

    Search real places around the destination.



    IMPORTANT:

    This is NOT the source that decides which places belong

    in the trip.



    Gemini creates the destination-aware experience plan.

    This API enriches that plan with real-world place data

    such as coordinates, address, categories and place IDs.



    A larger radius and result limit are used because a

    destination can contain multiple tourist regions.

    """



    api_key = _required_env(

        "GEOAPIFY_API_KEY"

    )



    params = {

        "categories": (

            "tourism.sights,"

            "tourism.attraction,"

            "tourism.sights.natural,"

            "tourism.sights.historic"

        ),

        "filter": (

            f"circle:{longitude},"

            f"{latitude},"

            f"{radius_meters}"

        ),

        "bias": (

            f"proximity:{longitude},"

            f"{latitude}"

        ),

        "limit": limit,

        "apiKey": api_key,

    }



    async with httpx.AsyncClient(

        timeout=HTTP_TIMEOUT,

        headers=_headers(),

    ) as client:



        response = await client.get(

            GEOAPIFY_PLACES_URL,

            params=params,

        )



        response.raise_for_status()



        return response.json()





# ============================================================

# RESTAURANTS

# ============================================================



async def search_restaurants(

    latitude: float,

    longitude: float,

    radius_meters: int = 10000,

    limit: int = 20,

) -> dict[str, Any]:

    """

    Search restaurants near a location.



    The AI Agent does NOT use this as a mandatory selection

    step.



    This function remains available for future itinerary

    enrichment, where the final itinerary generator can

    automatically find suitable food stops.

    """



    api_key = _required_env(

        "GEOAPIFY_API_KEY"

    )



    params = {

        "categories": (

            "catering.restaurant"

        ),

        "filter": (

            f"circle:{longitude},"

            f"{latitude},"

            f"{radius_meters}"

        ),

        "bias": (

            f"proximity:{longitude},"

            f"{latitude}"

        ),

        "limit": limit,

        "apiKey": api_key,

    }



    async with httpx.AsyncClient(

        timeout=HTTP_TIMEOUT,

        headers=_headers(),

    ) as client:



        response = await client.get(

            GEOAPIFY_PLACES_URL,

            params=params,

        )



        response.raise_for_status()



        return response.json()





# ============================================================

# GOOGLE HOTELS — SERPAPI

# ============================================================



async def search_hotels(

    destination: str,

    check_in_date: date,

    check_out_date: date,

    adults: int,

) -> dict[str, Any]:

    """

    Search real hotels for a specific location and date range.



    The AI Agent can call this multiple times for different

    regions of the same trip.



    Example:



        North Goa

        Nov 19 -> Nov 21



        South Goa

        Nov 21 -> Nov 24

    """



    api_key = _required_env(

        "SERPAPI_API_KEY"

    )



    params = {

        "engine": "google_hotels",

        "q": destination,

        "check_in_date": (

            check_in_date.isoformat()

        ),

        "check_out_date": (

            check_out_date.isoformat()

        ),

        "adults": adults,

        "currency": "INR",

        "gl": "in",

        "hl": "en",

        "api_key": api_key,

    }



    async with httpx.AsyncClient(

        timeout=HTTP_TIMEOUT,

        headers=_headers(),

    ) as client:



        response = await client.get(

            SERPAPI_URL,

            params=params,

        )



        response.raise_for_status()



        return response.json()





# ============================================================

# GOOGLE FLIGHTS AUTOCOMPLETE

# ============================================================



async def resolve_flight_location(
    location: str,
) -> dict[str, Any]:
    """
    Dynamically resolve a city/place to a usable airport.

    The exact location is tried first. If it is a destination that
    does not have an airport of its own, generic airport-oriented
    queries are tried. No destination-specific airport mapping is
    hardcoded.
    """

    api_key = _required_env("SERPAPI_API_KEY")

    queries: list[str] = []
    for candidate in (
        location,
        f"{location} airport",
        f"{location} nearest airport",
    ):
        candidate = str(candidate).strip()
        if candidate and candidate not in queries:
            queries.append(candidate)

    async with httpx.AsyncClient(
        timeout=HTTP_TIMEOUT,
        headers=_headers(),
    ) as client:

        last_error: str | None = None

        for query in queries:
            params = {
                "engine": "google_flights_autocomplete",
                "q": query,
                "gl": "in",
                "hl": "en",
                "exclude_regions": "true",
                "api_key": api_key,
            }

            try:
                response = await client.get(
                    SERPAPI_URL,
                    params=params,
                )
                response.raise_for_status()
                data = response.json()
            except Exception as exc:
                last_error = str(exc)
                continue

            suggestions = data.get("suggestions", [])
            if not isinstance(suggestions, list):
                continue

            for suggestion in suggestions:
                if not isinstance(suggestion, dict):
                    continue

                airports = suggestion.get("airports", [])
                if (
                    suggestion.get("type") == "city"
                    and isinstance(airports, list)
                    and airports
                ):
                    return {
                        "query": query,
                        "location": {
                            "name": suggestion.get("name"),
                            "type": suggestion.get("type"),
                            "description": suggestion.get("description"),
                            "id": suggestion.get("id"),
                        },
                        "airport": airports[0],
                        "airports": airports,
                    }

            for suggestion in suggestions:
                if not isinstance(suggestion, dict):
                    continue

                airports = suggestion.get("airports", [])
                if isinstance(airports, list) and airports:
                    return {
                        "query": query,
                        "location": {
                            "name": suggestion.get("name"),
                            "type": suggestion.get("type"),
                            "description": suggestion.get("description"),
                            "id": suggestion.get("id"),
                        },
                        "airport": airports[0],
                        "airports": airports,
                    }

        detail = (
            f" Last provider error: {last_error}"
            if last_error
            else ""
        )

        raise RuntimeError(
            f"No usable airport found for {location}.{detail}"
        )


# ============================================================



async def search_flights(

    departure_id: str,

    arrival_id: str,

    outbound_date: date,

    adults: int,

    return_date: Optional[date] = None,

) -> dict[str, Any]:

    """
    Search real Google Flights options.

    The Agent uses the returned schedules and prices as real
    transport data. Gemini is responsible for choosing the
    option that best fits the overall trip.

    If return_date is supplied, Google Flights is searched as a
    round trip so the response can contain both outbound and
    return flight options.

    No airline, airport, route, price, or schedule is hardcoded.
    """

    api_key = _required_env(
        "SERPAPI_API_KEY"
    )

    params = {
        "engine": "google_flights",

        "departure_id": departure_id,

        "arrival_id": arrival_id,

        "outbound_date": outbound_date.isoformat(),

        "currency": "INR",

        "hl": "en",

        "gl": "in",

        "adults": adults,

        # SerpApi: 1 = round trip, 2 = one-way.
        "type": 1 if return_date else 2,

        "api_key": api_key,
    }

    if return_date is not None:
        params["return_date"] = return_date.isoformat()

    async with httpx.AsyncClient(
        timeout=HTTP_TIMEOUT,

        headers=_headers(),

    ) as client:

        response = await client.get(
            SERPAPI_URL,

            params=params,

        )

        response.raise_for_status()

        return response.json()


# ============================================================



async def search_train_stations(

    query: str,

    limit: int = 10,

) -> dict[str, Any]:

    """

    Dynamically search railway stations.

    """



    api_key = _required_env(

        "RAILRADAR_API_KEY"

    )



    url = (

        f"{RAILRADAR_BASE_URL}/"

        "lookup/search/stations"

    )



    params = {

        "q": query,

        "limit": limit,

    }



    headers = {

        **_headers(),

        "Authorization": (

            f"Bearer {api_key}"

        ),

    }



    async with httpx.AsyncClient(

        timeout=HTTP_TIMEOUT,

        headers=headers,

    ) as client:



        response = await client.get(

            url,

            params=params,

        )



        response.raise_for_status()



        return response.json()





# ============================================================

# RAILRADAR — TRAIN SEARCH

# ============================================================



async def search_trains(

    source: str,

    destination: str,

) -> dict[str, Any]:

    """

    Search real trains between two railway stations.

    """



    api_key = _required_env(

        "RAILRADAR_API_KEY"

    )



    url = (

        f"{RAILRADAR_BASE_URL}/"

        f"trains/between/"

        f"{source}/{destination}"

    )



    params = {

        "byCity": "true",

    }



    headers = {

        **_headers(),

        "Authorization": (

            f"Bearer {api_key}"

        ),

    }



    async with httpx.AsyncClient(

        timeout=HTTP_TIMEOUT,

        headers=headers,

    ) as client:



        response = await client.get(

            url,

            params=params,

        )



        response.raise_for_status()



        return response.json()





# ============================================================

# RAILRADAR — SEAT AVAILABILITY

# ============================================================



async def search_train_seats(

    train_number: str,

    journey_date: date,

    source: str,

    destination: str,

    class_code: str = "CC",

    quota_code: str = "GN",

) -> dict[str, Any]:

    """

    Search real train seat availability.

    """



    api_key = _required_env(

        "RAILRADAR_API_KEY"

    )



    url = (

        f"{RAILRADAR_BASE_URL}/"

        f"trains/{train_number}/seats"

    )



    params = {

        "journeyDate": (

            journey_date.isoformat()

        ),

        "source": source,

        "destination": destination,

        "classCode": class_code,

        "quotaCode": quota_code,

    }



    headers = {

        **_headers(),

        "Authorization": (

            f"Bearer {api_key}"

        ),

    }



    async with httpx.AsyncClient(

        timeout=HTTP_TIMEOUT,

        headers=headers,

    ) as client:



        response = await client.get(

            url,

            params=params,

        )



        response.raise_for_status()



        return response.json()





# ============================================================

# RAILRADAR — FARE

# ============================================================



async def search_train_fare(

    train_number: str,

    journey_date: date,

    source: str,

    destination: str,

    class_code: str = "CC",

    quota_code: str = "GN",

) -> dict[str, Any]:

    """

    Search real train fare.

    """



    api_key = _required_env(

        "RAILRADAR_API_KEY"

    )



    url = (

        f"{RAILRADAR_BASE_URL}/"

        f"trains/{train_number}/fare"

    )



    params = {

        "journeyDate": (

            journey_date.isoformat()

        ),

        "source": source,

        "destination": destination,

        "classCode": class_code,

        "quotaCode": quota_code,

    }



    headers = {

        **_headers(),

        "Authorization": (

            f"Bearer {api_key}"

        ),

    }



    async with httpx.AsyncClient(

        timeout=HTTP_TIMEOUT,

        headers=headers,

    ) as client:



        response = await client.get(

            url,

            params=params,

        )



        response.raise_for_status()



        return response.json()





# ============================================================

# OSRM ROUTING

# ============================================================



async def get_route(

    start_latitude: float,

    start_longitude: float,

    end_latitude: float,

    end_longitude: float,

) -> dict[str, Any]:

    """

    Calculate real road distance and driving duration.

    """



    coordinates = (

        f"{start_longitude},"

        f"{start_latitude};"

        f"{end_longitude},"

        f"{end_latitude}"

    )



    url = (

        f"{OSRM_BASE_URL}/"

        f"driving/{coordinates}"

    )



    params = {

        "overview": "false",

        "steps": "true",

    }



    async with httpx.AsyncClient(

        timeout=HTTP_TIMEOUT,

        headers=_headers(),

    ) as client:



        response = await client.get(

            url,

            params=params,

        )



        response.raise_for_status()



        return response.json()





# ============================================================

# SAFE API CALL

# ============================================================



async def safe_api_call(

    function,

    *args,

    **kwargs,

) -> dict[str, Any]:

    """

    Execute an external API safely.



    A failed API should not automatically destroy the entire

    AI Agent flow. Gemini can continue using the information

    that is available from the other sources.

    """



    try:



        data = await function(

            *args,

            **kwargs,

        )



        return {

            "status": "success",

            "data": data,

            "error": None,

        }



    except Exception as exc:



        return {

            "status": "error",

            "data": None,

            "error": str(exc),

        }