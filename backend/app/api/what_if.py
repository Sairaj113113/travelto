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

from app.schemas.what_if import (
    WhatIfRequest,
    ApplyWhatIfRequest,
)

from app.services.what_if_service import (
    generate_what_if,
)


router = APIRouter(
    prefix="/what-if",
    tags=["What-If Simulator"]
)


# =========================================================
# SIMULATE WHAT-IF
# =========================================================

@router.post("/simulate")
def simulate_trip(
    request: WhatIfRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # -----------------------------------------------------
    # FIND TRIP
    # -----------------------------------------------------

    trip = (
        db.query(Trip)
        .filter(
            Trip.id == request.trip_id,
            Trip.user_id == current_user.id
        )
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found"
        )

    # -----------------------------------------------------
    # GET ITINERARY DAYS
    # -----------------------------------------------------

    days = (
        db.query(ItineraryDay)
        .filter(
            ItineraryDay.trip_id == trip.id
        )
        .order_by(
            ItineraryDay.day_number
        )
        .all()
    )

    if not days:
        raise HTTPException(
            status_code=400,
            detail="Trip does not have an itinerary"
        )

    # -----------------------------------------------------
    # BUILD ITINERARY DATA
    # -----------------------------------------------------

    itinerary_data = []

    for day in days:

        activities = (
            db.query(ItineraryActivity)
            .filter(
                ItineraryActivity.itinerary_day_id == day.id
            )
            .order_by(
                ItineraryActivity.activity_order
            )
            .all()
        )

        itinerary_data.append(
            {
                "day": day,
                "activities": activities,
            }
        )

    # -----------------------------------------------------
    # GENERATE SIMULATION
    # -----------------------------------------------------

    try:

        result = generate_what_if(
            request=request,
            trip=trip,
            existing_itinerary=itinerary_data,
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"What-if simulation failed: {str(e)}"
        )

    # -----------------------------------------------------
    # RETURN SIMULATION
    # -----------------------------------------------------

    return {
        "message": "What-if simulation generated successfully",

        "trip": {
            "id": trip.id,
            "destination": trip.destination,
            "start_date": trip.start_date,
            "end_date": trip.end_date,
        },

        "simulation": result.model_dump(
            mode="json"
        ),
    }


# =========================================================
# APPLY WHAT-IF SIMULATION
# =========================================================

@router.post("/apply")
def apply_simulation(
    request: ApplyWhatIfRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # -----------------------------------------------------
    # FIND TRIP
    # -----------------------------------------------------

    trip = (
        db.query(Trip)
        .filter(
            Trip.id == request.trip_id,
            Trip.user_id == current_user.id
        )
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found"
        )

    # -----------------------------------------------------
    # VALIDATE DAYS
    # -----------------------------------------------------

    if not request.days:

        raise HTTPException(
            status_code=400,
            detail="No simulation days provided"
        )

    expected_days = (
        trip.end_date - trip.start_date
    ).days + 1

    if len(request.days) != expected_days:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Simulation must contain exactly "
                f"{expected_days} days"
            )
        )

    # -----------------------------------------------------
    # DELETE OLD ITINERARY
    #
    # Activities are deleted first because they depend
    # on itinerary_days.
    # -----------------------------------------------------

    existing_days = (
        db.query(ItineraryDay)
        .filter(
            ItineraryDay.trip_id == trip.id
        )
        .all()
    )

    for day in existing_days:

        db.query(ItineraryActivity).filter(
            ItineraryActivity.itinerary_day_id == day.id
        ).delete(
            synchronize_session=False
        )

    db.query(ItineraryDay).filter(
        ItineraryDay.trip_id == trip.id
    ).delete(
        synchronize_session=False
    )

    # -----------------------------------------------------
    # CREATE NEW ITINERARY
    # -----------------------------------------------------

    for simulated_day in request.days:

        # ---------------------------------------------
        # Validate day date
        # ---------------------------------------------

        if (
            simulated_day.date < trip.start_date
            or simulated_day.date > trip.end_date
        ):

            db.rollback()

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Day {simulated_day.day_number} "
                    f"has a date outside the trip dates"
                )
            )

        # ---------------------------------------------
        # Create itinerary day
        # ---------------------------------------------

        new_day = ItineraryDay(
            trip_id=trip.id,

            day_number=simulated_day.day_number,

            date=simulated_day.date,

            title=simulated_day.title,

            summary=simulated_day.summary,

            estimated_cost=simulated_day.estimated_cost,
        )

        db.add(new_day)

        db.flush()

        # ---------------------------------------------
        # Create activities
        # ---------------------------------------------

        for index, activity in enumerate(
            simulated_day.activities,
            start=1
        ):

            new_activity = ItineraryActivity(

                itinerary_day_id=new_day.id,

                activity_order=index,

                start_time=activity.start_time,

                end_time=activity.end_time,

                activity_type=activity.activity_type,

                title=activity.title,

                description=activity.description,

                location=activity.location,

                estimated_cost=activity.estimated_cost,

                duration_minutes=activity.duration_minutes,

                status="planned",
            )

            db.add(new_activity)

    # -----------------------------------------------------
    # UPDATE TRIP
    # -----------------------------------------------------

    # The simulation may have changed the budget,
    # so update the trip budget if a new budget exists.

    simulated_total_cost = sum(
        float(day.estimated_cost)
        for day in request.days
    )

    if simulated_total_cost > 0:

        trip.budget = simulated_total_cost

    # -----------------------------------------------------
    # SAVE EVERYTHING
    # -----------------------------------------------------

    try:

        db.commit()

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to apply simulation: {str(e)}"
        )

    # -----------------------------------------------------
    # RETURN SUCCESS
    # -----------------------------------------------------

    return {
        "message": "What-if simulation applied successfully",

        "trip": {
            "id": trip.id,
            "destination": trip.destination,
            "budget": float(trip.budget),
            "start_date": trip.start_date,
            "end_date": trip.end_date,
        },

        "days": len(request.days),
    }