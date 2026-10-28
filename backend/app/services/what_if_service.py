import json
import os

from google import genai

from app.schemas.what_if import (
    WhatIfRequest,
    WhatIfResult,
)


def generate_what_if(
    request: WhatIfRequest,
    trip,
    existing_itinerary,
) -> WhatIfResult:

    # =====================================================
    # GEMINI API KEY
    # =====================================================

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured in .env"
        )

    client = genai.Client(
        api_key=api_key
    )

    # =====================================================
    # SIMULATION VALUES
    # =====================================================

    original_budget = float(trip.budget)

    simulated_budget = (
        request.new_budget
        if request.new_budget is not None
        else original_budget
    )

    simulated_travelers = (
        request.new_travelers
        if request.new_travelers is not None
        else trip.travelers
    )

    simulated_transport = (
        request.new_transport_preference
        if request.new_transport_preference
        else trip.transport_preference
    )

    # =====================================================
    # CONVERT DATABASE ITINERARY
    # INTO JSON-FRIENDLY STRUCTURE
    # =====================================================

    current_plan = []

    for item in existing_itinerary:

        day = item["day"]

        activities_from_db = item["activities"]

        activities = []

        for activity in activities_from_db:

            activities.append(
                {
                    "start_time": activity.start_time,
                    "end_time": activity.end_time,
                    "activity_type": activity.activity_type,
                    "title": activity.title,
                    "description": activity.description,
                    "location": activity.location,
                    "estimated_cost": float(
                        activity.estimated_cost
                    ),
                    "duration_minutes": activity.duration_minutes,
                }
            )

        current_plan.append(
            {
                "day_number": day.day_number,
                "date": str(day.date),
                "title": day.title,
                "summary": day.summary,
                "estimated_cost": float(
                    day.estimated_cost
                ),
                "activities": activities,
            }
        )

    # =====================================================
    # GEMINI PROMPT
    # =====================================================

    prompt = f"""
You are Travelto AI's What-If Travel Simulator.

The user already has a saved travel itinerary.

Your job is to create an ALTERNATIVE itinerary
based on the user's requested scenario.

IMPORTANT RULES:

1. Do NOT modify the original itinerary.

2. Return ONLY the simulated alternative itinerary.

3. Keep the same trip dates unless the scenario
   explicitly requires a date change.

4. Preserve activities that still make sense.

5. Replace or remove activities when necessary.

6. Keep the simulated itinerary realistic.

7. Respect the simulated budget.

8. Consider the number of travelers.

9. Consider transportation changes.

10. Keep the user's travel interests and travel style
    in mind.

11. Do not create impossible or unrealistic activities.

12. Estimated costs must be in Indian Rupees.

13. Return ONLY valid JSON.

14. Create exactly one day for every date in the
    original trip.

15. Day numbers must start from 1.

ORIGINAL TRIP

Destination:
{trip.destination}

Start date:
{trip.start_date}

End date:
{trip.end_date}

Original travelers:
{trip.travelers}

Original budget:
₹{original_budget}

Travel style:
{trip.travel_style or "General"}

Interests:
{trip.interests or "General"}

Original transport:
{trip.transport_preference or "Flexible"}


SIMULATED VALUES

Simulated travelers:
{simulated_travelers}

Simulated budget:
₹{simulated_budget}

Simulated transport:
{simulated_transport or "Flexible"}


USER SCENARIO:

{request.scenario}


CURRENT ITINERARY:

{json.dumps(current_plan, indent=2)}


Return EXACTLY this JSON structure:

{{
  "scenario": "{request.scenario}",

  "original_budget": {original_budget},

  "simulated_budget": {simulated_budget},

  "days": [
    {{
      "day_number": 1,

      "date": "YYYY-MM-DD",

      "title": "Day title",

      "summary": "Short summary",

      "estimated_cost": 2000,

      "activities": [
        {{
          "start_time": "09:00",

          "end_time": "11:00",

          "activity_type": "Sightseeing",

          "title": "Activity title",

          "description": "Activity description",

          "location": "Location",

          "estimated_cost": 300,

          "duration_minutes": 120
        }}
      ]
    }}
  ]
}}
"""

    # =====================================================
    # CALL GEMINI
    # =====================================================

    try:

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config={
                "response_mime_type": "application/json"
            }
        )

    except Exception as e:

        raise RuntimeError(
            f"Gemini request failed: {str(e)}"
        )

    # =====================================================
    # CHECK RESPONSE
    # =====================================================

    if not response.text:

        raise RuntimeError(
            "Gemini returned an empty response"
        )

    # =====================================================
    # PARSE JSON
    # =====================================================

    try:

        data = json.loads(
            response.text
        )

    except json.JSONDecodeError:

        raise RuntimeError(
            "Gemini returned invalid JSON"
        )

    # =====================================================
    # VALIDATE RESPONSE
    # =====================================================

    try:

        result = WhatIfResult.model_validate(
            data
        )

    except Exception as e:

        raise RuntimeError(
            f"Invalid What-If response structure: {str(e)}"
        )

    return result