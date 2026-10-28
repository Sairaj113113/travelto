from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user

from app.models.user import User
from app.models.trip import Trip

from app.schemas.trip import (
    TripCreate,
    TripUpdate,
    TripResponse,
)


router = APIRouter(
    prefix="/trips",
    tags=["Trips"]
)


# ============================================================
# CONSTANTS
# ============================================================

ALLOWED_STATUSES = {
    "draft",
    "planned",
    "active",
    "completed",
    "cancelled",
}


# ============================================================
# CREATE TRIP
# ============================================================

@router.post(
    "/",
    response_model=TripResponse,
    status_code=status.HTTP_201_CREATED
)
def create_trip(
    trip_data: TripCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # VALIDATE DATES
    # --------------------------------------------------------

    if trip_data.end_date < trip_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date cannot be before start date"
        )

    # --------------------------------------------------------
    # VALIDATE TRAVELERS
    # --------------------------------------------------------

    if trip_data.adults + trip_data.children != trip_data.travelers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Adults + children must equal total travelers"
        )

    # --------------------------------------------------------
    # VALIDATE CHILDREN AGES
    # --------------------------------------------------------

    if len(trip_data.children_ages) != trip_data.children:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Children ages must be provided for every child"
        )

    for age in trip_data.children_ages:
        if age < 0 or age > 17:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Child age must be between 0 and 17"
            )

    # --------------------------------------------------------
    # VALIDATE STATUS
    # --------------------------------------------------------

    if trip_data.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid trip status"
        )

    # --------------------------------------------------------
    # CREATE TRIP
    # --------------------------------------------------------

    trip = Trip(
        user_id=current_user.id,

        title=trip_data.title.strip(),

        destination=trip_data.destination.strip(),

        starting_location=(
            trip_data.starting_location.strip()
            if trip_data.starting_location
            else None
        ),

        start_date=trip_data.start_date,

        end_date=trip_data.end_date,

        flexible_dates=trip_data.flexible_dates,

        travelers=trip_data.travelers,

        adults=trip_data.adults,

        children=trip_data.children,

        children_ages=(
            ",".join(
                str(age)
                for age in trip_data.children_ages
            )
            if trip_data.children_ages
            else None
        ),

        budget=trip_data.budget,

        budget_includes_transport=(
            trip_data.budget_includes_transport
        ),

        budget_includes_accommodation=(
            trip_data.budget_includes_accommodation
        ),

        budget_includes_food=(
            trip_data.budget_includes_food
        ),

        budget_includes_activities=(
            trip_data.budget_includes_activities
        ),

        budget_includes_local_travel=(
            trip_data.budget_includes_local_travel
        ),

        travel_mode=(
            trip_data.travel_mode.strip()
            if trip_data.travel_mode
            else None
        ),

        vehicle_type=(
            trip_data.vehicle_type.strip()
            if trip_data.vehicle_type
            else None
        ),

        fuel_type=(
            trip_data.fuel_type.strip()
            if trip_data.fuel_type
            else None
        ),

        mileage_kmpl=trip_data.mileage_kmpl,

        rental_type=(
            trip_data.rental_type.strip()
            if trip_data.rental_type
            else None
        ),

        priority=trip_data.priority.strip(),

        travel_style=(
            trip_data.travel_style.strip()
            if trip_data.travel_style
            else None
        ),

        interests=(
            trip_data.interests.strip()
            if trip_data.interests
            else None
        ),

        transport_preference=(
            trip_data.transport_preference.strip()
            if trip_data.transport_preference
            else None
        ),

        status=trip_data.status,
    )

    db.add(trip)

    db.commit()

    db.refresh(trip)

    return trip


# ============================================================
# GET MY TRIPS
# ============================================================

@router.get(
    "/",
    response_model=list[TripResponse]
)
def get_my_trips(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    trips = (
        db.query(Trip)
        .filter(
            Trip.user_id == current_user.id
        )
        .order_by(
            Trip.created_at.desc()
        )
        .all()
    )

    return trips


# ============================================================
# GET SINGLE TRIP
# ============================================================

@router.get(
    "/{trip_id}",
    response_model=TripResponse
)
def get_trip(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    trip = (
        db.query(Trip)
        .filter(
            Trip.id == trip_id,
            Trip.user_id == current_user.id
        )
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )

    return trip


# ============================================================
# UPDATE TRIP
# ============================================================

@router.put(
    "/{trip_id}",
    response_model=TripResponse
)
def update_trip(
    trip_id: int,
    trip_data: TripUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    trip = (
        db.query(Trip)
        .filter(
            Trip.id == trip_id,
            Trip.user_id == current_user.id
        )
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )

    # --------------------------------------------------------
    # GET ONLY PROVIDED FIELDS
    # --------------------------------------------------------

    update_data = trip_data.model_dump(
        exclude_unset=True
    )

    # --------------------------------------------------------
    # NORMALIZE STRING VALUES
    # --------------------------------------------------------

    for field, value in update_data.items():

        if isinstance(value, str):
            value = value.strip()

        setattr(
            trip,
            field,
            value
        )

    # --------------------------------------------------------
    # VALIDATE DATES
    # --------------------------------------------------------

    if trip.end_date < trip.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date cannot be before start date"
        )

    # --------------------------------------------------------
    # VALIDATE TRAVELERS
    # --------------------------------------------------------

    if trip.adults + trip.children != trip.travelers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Adults + children must equal total travelers"
        )

    # --------------------------------------------------------
    # VALIDATE CHILDREN AGES
    # --------------------------------------------------------

    if trip.children_ages:
        try:
            children_ages = [
                int(age.strip())
                for age in trip.children_ages.split(",")
                if age.strip()
            ]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid children ages format"
            )

        if len(children_ages) != trip.children:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Children ages must match number of children"
            )

        for age in children_ages:
            if age < 0 or age > 17:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Child age must be between 0 and 17"
                )

    elif trip.children > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Children ages must be provided when children are present"
        )

    # --------------------------------------------------------
    # VALIDATE STATUS
    # --------------------------------------------------------

    if trip.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid trip status"
        )

    # --------------------------------------------------------
    # SAVE
    # --------------------------------------------------------

    db.commit()

    db.refresh(trip)

    return trip


# ============================================================
# DELETE TRIP
# ============================================================

@router.delete(
    "/{trip_id}"
)
def delete_trip(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    trip = (
        db.query(Trip)
        .filter(
            Trip.id == trip_id,
            Trip.user_id == current_user.id
        )
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )

    db.delete(trip)

    db.commit()

    return {
        "message": "Trip deleted successfully",
        "trip_id": trip_id
    }