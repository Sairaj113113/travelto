from datetime import timedelta
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user

from app.models.user import User
from app.models.trip import Trip
from app.models.itinerary import (
    ItineraryDay,
    ItineraryActivity,
)

from app.schemas.ai_trip import GenerateTripRequest
from app.services.ai_trip_service import generate_itinerary


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/ai",
    tags=["AI Trip Planner"],
)


# ============================================================
# GENERATE AI TRIP
# ============================================================

@router.post("/generate-trip")
def generate_trip(
    request: GenerateTripRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a personalized AI itinerary and save it
    as a new trip for the authenticated user.

    Flow:

        Plan Trip
            ↓
        Gemini
            ↓
        Validate AI response
            ↓
        Create Trip
            ↓
        Create Itinerary Days
            ↓
        Create Activities
            ↓
        Commit to PostgreSQL
    """

    # ========================================================
    # 1. REQUEST VALIDATION
    # ========================================================

    destination = request.destination.strip()

    if not destination:
        raise HTTPException(
            status_code=400,
            detail="Destination is required.",
        )

    if request.end_date < request.start_date:
        raise HTTPException(
            status_code=400,
            detail="End date cannot be before start date.",
        )

    expected_days = (
        request.end_date - request.start_date
    ).days + 1

    if expected_days <= 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid trip dates.",
        )

    # --------------------------------------------------------
    # Validate travelers
    # --------------------------------------------------------

    calculated_travelers = (
        request.adults + request.children
    )

    if calculated_travelers != request.travelers:
        raise HTTPException(
            status_code=400,
            detail=(
                "Total travelers must equal "
                "adults plus children."
            ),
        )

    # --------------------------------------------------------
    # Validate children ages
    # --------------------------------------------------------

    if len(request.children_ages) != request.children:
        raise HTTPException(
            status_code=400,
            detail=(
                "Please provide the age of every child."
            ),
        )

    for age in request.children_ages:
        if age < 0 or age > 12:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Children's ages must be between "
                    "0 and 12."
                ),
            )

    # ========================================================
    # 2. GENERATE ITINERARY WITH GEMINI
    # ========================================================

    try:
        itinerary = generate_itinerary(request)

    except Exception:
        logger.exception(
            "AI itinerary generation failed for user_id=%s",
            current_user.id,
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Travelto AI could not generate the itinerary "
                "right now. Please try again."
            ),
        )

    # ========================================================
    # 3. VALIDATE AI RESPONSE
    # ========================================================

    if not itinerary.days:
        raise HTTPException(
            status_code=502,
            detail="AI returned an empty itinerary.",
        )

    if len(itinerary.days) != expected_days:
        raise HTTPException(
            status_code=502,
            detail=(
                "AI generated an incorrect number "
                "of itinerary days."
            ),
        )

    for index, generated_day in enumerate(
        itinerary.days,
        start=1,
    ):
        expected_date = (
            request.start_date
            + timedelta(days=index - 1)
        )

        if generated_day.day_number != index:
            raise HTTPException(
                status_code=502,
                detail=(
                    "AI generated invalid itinerary "
                    "day numbering."
                ),
            )

        if generated_day.date != expected_date:
            raise HTTPException(
                status_code=502,
                detail=(
                    "AI generated itinerary dates that "
                    "do not match the requested trip dates."
                ),
            )

    # ========================================================
    # 4. CREATE TRIP
    # ========================================================

    trip = Trip(
        user_id=current_user.id,

        title=f"{destination} Trip",

        destination=destination,

        starting_location=(
            request.starting_location.strip()
            if request.starting_location
            else None
        ),

        start_date=request.start_date,

        end_date=request.end_date,

        flexible_dates=request.flexible_dates,

        travelers=request.travelers,

        adults=request.adults,

        children=request.children,

        children_ages=(
            ",".join(
                str(age)
                for age in request.children_ages
            )
            if request.children_ages
            else None
        ),

        budget=request.budget,

        budget_includes_transport=(
            request.budget_includes.transport
        ),

        budget_includes_accommodation=(
            request.budget_includes.accommodation
        ),

        budget_includes_food=(
            request.budget_includes.food
        ),

        budget_includes_activities=(
            request.budget_includes.activities
        ),

        budget_includes_local_travel=(
            request.budget_includes.local_travel
        ),

        transport_preference=(
            request.transport_preference.strip()
            if request.transport_preference
            else None
        ),

        travel_mode=(
            request.travel.mode
            if request.travel
            else None
        ),

        vehicle_type=(
            request.travel.vehicle.type
            if request.travel
            and request.travel.vehicle
            else None
        ),

        fuel_type=(
            request.travel.vehicle.fuel_type
            if request.travel
            and request.travel.vehicle
            else None
        ),

        mileage_kmpl=(
            request.travel.vehicle.mileage_kmpl
            if request.travel
            and request.travel.vehicle
            else None
        ),

        rental_type=(
            request.travel.rental.type
            if request.travel
            and request.travel.rental
            else None
        ),

        travel_style=request.travel_style,

        priority=request.priority,

        interests=(
            ", ".join(request.interests)
            if request.interests
            else None
        ),

        status="planned",
    )

    # ========================================================
    # 5. SAVE TRIP + ITINERARY
    # ========================================================

    try:
        db.add(trip)

        # Get trip.id before creating itinerary days
        db.flush()

        # ----------------------------------------------------
        # Create itinerary days
        # ----------------------------------------------------

        for generated_day in itinerary.days:

            itinerary_day = ItineraryDay(
                trip_id=trip.id,

                day_number=generated_day.day_number,

                date=generated_day.date,

                title=generated_day.title,

                summary=generated_day.summary,

                estimated_cost=(
                    generated_day.estimated_cost
                ),
            )

            db.add(itinerary_day)

            # Get itinerary_day.id
            db.flush()

            # ------------------------------------------------
            # Create activities
            # ------------------------------------------------

            for index, activity in enumerate(
                generated_day.activities,
                start=1,
            ):

                itinerary_activity = ItineraryActivity(
                    itinerary_day_id=itinerary_day.id,

                    activity_order=index,

                    start_time=activity.start_time,

                    end_time=activity.end_time,

                    activity_type=activity.activity_type,

                    title=activity.title,

                    description=activity.description,

                    location=activity.location,

                    estimated_cost=(
                        activity.estimated_cost
                    ),

                    duration_minutes=(
                        activity.duration_minutes
                    ),

                    status="planned",
                )

                db.add(itinerary_activity)

        db.commit()

    except Exception:
        db.rollback()

        logger.exception(
            "Failed to save AI-generated trip "
            "for user_id=%s",
            current_user.id,
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to save the generated trip.",
        )

    # ========================================================
    # 6. REFRESH
    # ========================================================

    db.refresh(trip)

    # ========================================================
    # 7. RETURN RESULT
    # ========================================================

    return {
        "message": "AI trip generated successfully",

        "trip": {
            "id": trip.id,
            "user_id": trip.user_id,

            "title": trip.title,

            "destination": trip.destination,

            "starting_location": trip.starting_location,

            "start_date": trip.start_date,

            "end_date": trip.end_date,

            "flexible_dates": trip.flexible_dates,

            "travelers": trip.travelers,

            "adults": trip.adults,

            "children": trip.children,

            "children_ages": trip.children_ages,

            "budget": float(trip.budget),

            "budget_includes_transport": (
                trip.budget_includes_transport
            ),

            "budget_includes_accommodation": (
                trip.budget_includes_accommodation
            ),

            "budget_includes_food": (
                trip.budget_includes_food
            ),

            "budget_includes_activities": (
                trip.budget_includes_activities
            ),

            "budget_includes_local_travel": (
                trip.budget_includes_local_travel
            ),

            "transport_preference": (
                trip.transport_preference
            ),

            "travel_mode": trip.travel_mode,

            "vehicle_type": trip.vehicle_type,

            "fuel_type": trip.fuel_type,

            "mileage_kmpl": (
                float(trip.mileage_kmpl)
                if trip.mileage_kmpl is not None
                else None
            ),

            "rental_type": trip.rental_type,

            "priority": trip.priority,

            "travel_style": trip.travel_style,

            "interests": trip.interests,

            "status": trip.status,

            "created_at": trip.created_at,

            "updated_at": trip.updated_at,
        },

        "itinerary": itinerary.model_dump(
            mode="json"
        ),
    }