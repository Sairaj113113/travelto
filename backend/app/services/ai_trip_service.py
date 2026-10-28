import json
import logging
import os
import time

from google import genai

from app.schemas.ai_trip import (
    GenerateTripRequest,
    GeneratedItinerary,
)


logger = logging.getLogger(__name__)


# Models are attempted in this order.
# Add another available Gemini model here if needed.
MODELS = [
    "gemini-3.5-flash-lite",
]


def _build_prompt(request: GenerateTripRequest) -> str:
    """
    Build the Gemini prompt dynamically from the user's
    actual trip preferences.
    """

    interests = (
        ", ".join(request.interests)
        if request.interests
        else "General sightseeing"
    )

    starting_location = (
        request.starting_location
        if request.starting_location
        else "Not specified"
    )

    transport_preference = (
        request.transport_preference
        if request.transport_preference
        else "Flexible"
    )

    travel_style = (
        request.travel_style
        if request.travel_style
        else "General"
    )

    # --------------------------------------------------------
    # Travel details
    # --------------------------------------------------------

    travel_details = "Not specified"

    if request.travel:
        travel_parts = []

        if request.travel.mode:
            travel_parts.append(
                f"Mode: {request.travel.mode}"
            )

        if request.travel.mode_label:
            travel_parts.append(
                f"Mode label: {request.travel.mode_label}"
            )

        if request.travel.vehicle:
            vehicle = request.travel.vehicle

            if vehicle.type:
                travel_parts.append(
                    f"Vehicle type: {vehicle.type}"
                )

            if vehicle.fuel_type:
                travel_parts.append(
                    f"Fuel type: {vehicle.fuel_type}"
                )

            if vehicle.mileage_kmpl is not None:
                travel_parts.append(
                    f"Mileage: {vehicle.mileage_kmpl} km/l"
                )

        if request.travel.rental:
            if request.travel.rental.type:
                travel_parts.append(
                    f"Rental type: {request.travel.rental.type}"
                )

        if travel_parts:
            travel_details = "\n".join(
                f"- {item}"
                for item in travel_parts
            )

    # --------------------------------------------------------
    # Budget categories
    # --------------------------------------------------------

    budget_includes = request.budget_includes

    budget_categories = []

    if budget_includes.transport:
        budget_categories.append("Transport")

    if budget_includes.accommodation:
        budget_categories.append("Accommodation")

    if budget_includes.food:
        budget_categories.append("Food")

    if budget_includes.activities:
        budget_categories.append("Activities")

    if budget_includes.local_travel:
        budget_categories.append("Local travel")

    budget_scope = (
        ", ".join(budget_categories)
        if budget_categories
        else "No specific categories"
    )

    # --------------------------------------------------------
    # Children
    # --------------------------------------------------------

    children_ages = (
        ", ".join(
            str(age)
            for age in request.children_ages
        )
        if request.children_ages
        else "Not specified"
    )

    prompt = f"""
You are Travelto AI, an intelligent AI travel planning assistant.

Your task is to create a practical, realistic and personalized
day-by-day travel itinerary using ONLY the trip information
provided below.

============================================================
TRIP INFORMATION
============================================================

Starting location:
{starting_location}

Destination:
{request.destination}

Start date:
{request.start_date}

End date:
{request.end_date}

Flexible dates:
{"Yes" if request.flexible_dates else "No"}

============================================================
TRAVELERS
============================================================

Total travelers:
{request.travelers}

Adults:
{request.adults}

Children:
{request.children}

Children ages:
{children_ages}

============================================================
BUDGET
============================================================

Total trip budget:
₹{request.budget}

Budget currency:
INR

Budget should cover:
{budget_scope}

============================================================
TRANSPORT
============================================================

Transport preference:
{transport_preference}

Detailed travel information:
{travel_details}

============================================================
TRIP PREFERENCES
============================================================

Travel style:
{travel_style}

Priority:
{request.priority}

Interests:
{interests}

============================================================
ITINERARY RULES
============================================================

1. Create exactly one itinerary day for every date from
   the start date through the end date, inclusive.

2. Day numbers must start at 1 and increase sequentially.

3. Every generated date must exactly match the corresponding
   trip date.

4. The destination is dynamic. Do NOT assume a fixed destination.

5. Use activities that are genuinely appropriate for the
   requested destination.

6. Respect the user's travel style.

7. Prioritize the user's selected interests.

8. Consider the user's starting location when planning
   the journey.

9. Respect the selected transportation preference.

10. If the user provides vehicle information, consider it
    when estimating travel time and transportation cost.

11. If the user provides rental information, consider it
    when planning transportation.

12. Consider the number of adults and children.

13. If children's ages are provided, prefer activities
    appropriate for those age groups.

14. Respect the user's stated priority.

15. The total estimated trip cost should remain reasonably
    close to the provided budget.

16. Do not assume that the entire budget is spent every day.

17. Estimated activity costs must be realistic approximate
    values in Indian Rupees.

18. Do not create an excessive number of activities in one day.

19. Leave reasonable travel, meal and rest time between activities.

20. Include realistic start and end times.

21. Do not schedule overlapping activities.

22. Consider travel time between locations.

23. Include a reasonable mixture of sightseeing, food,
    relaxation and travel where appropriate.

24. Do not invent impossible or obviously unrealistic activities.

25. Do not invent exact booking confirmations, ticket numbers,
    hotel reservations or guaranteed availability.

26. Do not claim that something is currently available unless
    availability information was explicitly provided.

27. Activity locations should be relevant to the destination.

28. Keep descriptions concise and useful.

29. Return ONLY valid JSON.

============================================================
REQUIRED JSON STRUCTURE
============================================================

{{
  "days": [
    {{
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "title": "Day title",
      "summary": "Short summary",
      "estimated_cost": 2500,
      "activities": [
        {{
          "start_time": "09:00",
          "end_time": "11:00",
          "activity_type": "Sightseeing",
          "title": "Activity title",
          "description": "Activity description",
          "location": "Location",
          "estimated_cost": 500,
          "duration_minutes": 120
        }}
      ]
    }}
  ]
}}

IMPORTANT:

- Return only the JSON object.
- Do not include Markdown.
- Do not include ```json.
- Do not include explanations before or after the JSON.
"""

    return prompt


def generate_itinerary(
    request: GenerateTripRequest,
) -> GeneratedItinerary:
    """
    Generate an AI itinerary using Gemini.

    The function does not save anything to the database.
    Database persistence is handled by the API layer.
    """

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured in .env"
        )

    client = genai.Client(
        api_key=api_key
    )

    prompt = _build_prompt(request)

    last_error: Exception | None = None

    # --------------------------------------------------------
    # Try configured Gemini models
    # --------------------------------------------------------

    for model_name in MODELS:

        # Retry each model twice for temporary failures.
        for attempt in range(2):

            try:
                logger.info(
                    "Trying Gemini model %s "
                    "(attempt %s/2)",
                    model_name,
                    attempt + 1,
                )

                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                    },
                )

                raw_text = getattr(
                    response,
                    "text",
                    None,
                )

                if not raw_text:
                    raise RuntimeError(
                        "Gemini returned an empty response"
                    )

                raw_text = raw_text.strip()

                try:
                    data = json.loads(raw_text)

                except json.JSONDecodeError as exc:
                    logger.error(
                        "Gemini returned invalid JSON: %s",
                        exc,
                    )

                    raise RuntimeError(
                        "Gemini returned invalid JSON"
                    ) from exc

                # Validate Gemini's response against our
                # Pydantic schema before returning it.
                itinerary = (
                    GeneratedItinerary.model_validate(data)
                )

                if not itinerary.days:
                    raise RuntimeError(
                        "Gemini returned an itinerary with no days"
                    )

                return itinerary

            except Exception as exc:

                last_error = exc

                logger.exception(
                    "Gemini error with model %s "
                    "(attempt %s/2)",
                    model_name,
                    attempt + 1,
                )

                # Retry once after a short delay.
                if attempt == 0:
                    time.sleep(2)

        logger.warning(
            "Gemini model %s failed. "
            "Trying next configured model.",
            model_name,
        )

    raise RuntimeError(
        "All configured Gemini models failed. "
        f"Last error: {last_error}"
    )