from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user

from app.models.user import User
from app.models.trip import Trip
from app.models.itinerary import (
    ItineraryDay,
    ItineraryActivity,
)

from app.schemas.itinerary import (
    ItineraryDayCreate,
    ItineraryDayUpdate,
    ItineraryDayResponse,
    ItineraryActivityCreate,
    ItineraryActivityUpdate,
    ItineraryActivityResponse,
)


router = APIRouter(
    prefix="/itinerary",
    tags=["Itinerary"]
)


# =========================================================
# ITINERARY DAYS
# =========================================================

@router.post(
    "/days",
    response_model=ItineraryDayResponse,
    status_code=status.HTTP_201_CREATED
)
def create_itinerary_day(
    data: ItineraryDayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = (
        db.query(Trip)
        .filter(
            Trip.id == data.trip_id,
            Trip.user_id == current_user.id
        )
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found"
        )

    if data.date < trip.start_date or data.date > trip.end_date:
        raise HTTPException(
            status_code=400,
            detail="Itinerary date must be within trip dates"
        )

    existing_day = (
        db.query(ItineraryDay)
        .filter(
            ItineraryDay.trip_id == data.trip_id,
            ItineraryDay.day_number == data.day_number
        )
        .first()
    )

    if existing_day:
        raise HTTPException(
            status_code=400,
            detail="This itinerary day already exists"
        )

    day = ItineraryDay(
        trip_id=data.trip_id,
        day_number=data.day_number,
        date=data.date,
        title=data.title,
        summary=data.summary,
        estimated_cost=data.estimated_cost,
    )

    db.add(day)
    db.commit()
    db.refresh(day)

    return day


@router.get(
    "/trips/{trip_id}/days",
    response_model=list[ItineraryDayResponse]
)
def get_trip_itinerary_days(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
            status_code=404,
            detail="Trip not found"
        )

    return (
        db.query(ItineraryDay)
        .filter(ItineraryDay.trip_id == trip_id)
        .order_by(ItineraryDay.day_number)
        .all()
    )


@router.get(
    "/days/{day_id}",
    response_model=ItineraryDayResponse
)
def get_itinerary_day(
    day_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    day = (
        db.query(ItineraryDay)
        .join(Trip, Trip.id == ItineraryDay.trip_id)
        .filter(
            ItineraryDay.id == day_id,
            Trip.user_id == current_user.id
        )
        .first()
    )

    if not day:
        raise HTTPException(
            status_code=404,
            detail="Itinerary day not found"
        )

    return day


@router.put(
    "/days/{day_id}",
    response_model=ItineraryDayResponse
)
def update_itinerary_day(
    day_id: int,
    data: ItineraryDayUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    day = (
        db.query(ItineraryDay)
        .join(Trip, Trip.id == ItineraryDay.trip_id)
        .filter(
            ItineraryDay.id == day_id,
            Trip.user_id == current_user.id
        )
        .first()
    )

    if not day:
        raise HTTPException(
            status_code=404,
            detail="Itinerary day not found"
        )

    update_data = data.model_dump(
        exclude_unset=True
    )

    if "date" in update_data:
        trip = db.query(Trip).filter(
            Trip.id == day.trip_id
        ).first()

        if (
            update_data["date"] < trip.start_date
            or update_data["date"] > trip.end_date
        ):
            raise HTTPException(
                status_code=400,
                detail="Itinerary date must be within trip dates"
            )

    for key, value in update_data.items():
        setattr(day, key, value)

    db.commit()
    db.refresh(day)

    return day


@router.delete(
    "/days/{day_id}"
)
def delete_itinerary_day(
    day_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    day = (
        db.query(ItineraryDay)
        .join(Trip, Trip.id == ItineraryDay.trip_id)
        .filter(
            ItineraryDay.id == day_id,
            Trip.user_id == current_user.id
        )
        .first()
    )

    if not day:
        raise HTTPException(
            status_code=404,
            detail="Itinerary day not found"
        )

    db.delete(day)
    db.commit()

    return {
        "message": "Itinerary day deleted successfully"
    }


# =========================================================
# ACTIVITIES
# =========================================================

@router.post(
    "/activities",
    response_model=ItineraryActivityResponse,
    status_code=status.HTTP_201_CREATED
)
def create_activity(
    data: ItineraryActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    day = (
        db.query(ItineraryDay)
        .join(Trip, Trip.id == ItineraryDay.trip_id)
        .filter(
            ItineraryDay.id == data.itinerary_day_id,
            Trip.user_id == current_user.id
        )
        .first()
    )

    if not day:
        raise HTTPException(
            status_code=404,
            detail="Itinerary day not found"
        )

    activity = ItineraryActivity(
        itinerary_day_id=data.itinerary_day_id,
        activity_order=data.activity_order,
        start_time=data.start_time,
        end_time=data.end_time,
        activity_type=data.activity_type,
        title=data.title,
        description=data.description,
        location=data.location,
        estimated_cost=data.estimated_cost,
        duration_minutes=data.duration_minutes,
        status=data.status,
    )

    db.add(activity)
    db.commit()
    db.refresh(activity)

    return activity


@router.get(
    "/days/{day_id}/activities",
    response_model=list[ItineraryActivityResponse]
)
def get_day_activities(
    day_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    day = (
        db.query(ItineraryDay)
        .join(Trip, Trip.id == ItineraryDay.trip_id)
        .filter(
            ItineraryDay.id == day_id,
            Trip.user_id == current_user.id
        )
        .first()
    )

    if not day:
        raise HTTPException(
            status_code=404,
            detail="Itinerary day not found"
        )

    return (
        db.query(ItineraryActivity)
        .filter(
            ItineraryActivity.itinerary_day_id == day_id
        )
        .order_by(ItineraryActivity.activity_order)
        .all()
    )


@router.get(
    "/activities/{activity_id}",
    response_model=ItineraryActivityResponse
)
def get_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = (
        db.query(ItineraryActivity)
        .join(
            ItineraryDay,
            ItineraryDay.id == ItineraryActivity.itinerary_day_id
        )
        .join(
            Trip,
            Trip.id == ItineraryDay.trip_id
        )
        .filter(
            ItineraryActivity.id == activity_id,
            Trip.user_id == current_user.id
        )
        .first()
    )

    if not activity:
        raise HTTPException(
            status_code=404,
            detail="Activity not found"
        )

    return activity


@router.put(
    "/activities/{activity_id}",
    response_model=ItineraryActivityResponse
)
def update_activity(
    activity_id: int,
    data: ItineraryActivityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = (
        db.query(ItineraryActivity)
        .join(
            ItineraryDay,
            ItineraryDay.id == ItineraryActivity.itinerary_day_id
        )
        .join(
            Trip,
            Trip.id == ItineraryDay.trip_id
        )
        .filter(
            ItineraryActivity.id == activity_id,
            Trip.user_id == current_user.id
        )
        .first()
    )

    if not activity:
        raise HTTPException(
            status_code=404,
            detail="Activity not found"
        )

    update_data = data.model_dump(
        exclude_unset=True
    )

    for key, value in update_data.items():
        setattr(activity, key, value)

    db.commit()
    db.refresh(activity)

    return activity


@router.delete(
    "/activities/{activity_id}"
)
def delete_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = (
        db.query(ItineraryActivity)
        .join(
            ItineraryDay,
            ItineraryDay.id == ItineraryActivity.itinerary_day_id
        )
        .join(
            Trip,
            Trip.id == ItineraryDay.trip_id
        )
        .filter(
            ItineraryActivity.id == activity_id,
            Trip.user_id == current_user.id
        )
        .first()
    )

    if not activity:
        raise HTTPException(
            status_code=404,
            detail="Activity not found"
        )

    db.delete(activity)
    db.commit()

    return {
        "message": "Activity deleted successfully"
    }
# =========================================================
# AUTO GENERATE ITINERARY
# =========================================================
#
# This endpoint is intentionally kept inside the existing
# itinerary router so the frontend can call:
#
# POST /itinerary/trips/{trip_id}/generate
#
# It creates the missing itinerary days + activities from
# the Trip record. It is idempotent: if days already exist,
# it returns the existing itinerary instead of duplicating it.
#
# The endpoint is a reliable starter generator. It does not
# pretend to be an LLM. A Gemini/AI service can be plugged
# into this endpoint later without changing the database flow.
#

@router.post(
    "/trips/{trip_id}/generate"
)
def generate_trip_itinerary(
    trip_id: int,
    regenerate: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a varied starter itinerary for a trip.

    This is a deterministic itinerary generator (not an LLM call).
    It creates different locations and experiences for each day when
    the destination is recognized, with a varied fallback for other
    destinations.

    Use ?regenerate=true to replace an existing generated itinerary.
    """

    # -----------------------------------------------------
    # 1. Get trip + verify ownership
    # -----------------------------------------------------
    # Lock the trip row while generating.
    # The itinerary page can mount more than once in Next.js development
    # mode (React Strict Mode), which can otherwise cause two generation
    # requests to run at the same time. Both requests may see an empty
    # itinerary and then race to insert the same (trip_id, day_number).
    # PostgreSQL correctly rejects the second insert with unique_violation.
    # A row-level lock serializes generation for this trip.
    trip = (
        db.query(Trip)
        .filter(
            Trip.id == trip_id,
            Trip.user_id == current_user.id,
        )
        .with_for_update()
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found",
        )

    # -----------------------------------------------------
    # 2. Existing itinerary handling
    # -----------------------------------------------------
    existing_days = (
        db.query(ItineraryDay)
        .filter(ItineraryDay.trip_id == trip_id)
        .order_by(ItineraryDay.day_number)
        .all()
    )

    if existing_days and not regenerate:
        activities_count = (
            db.query(ItineraryActivity)
            .join(
                ItineraryDay,
                ItineraryDay.id == ItineraryActivity.itinerary_day_id,
            )
            .filter(ItineraryDay.trip_id == trip_id)
            .count()
        )

        return {
            "message": "Itinerary already exists",
            "trip_id": trip.id,
            "days_created": 0,
            "activities_created": 0,
            "days": existing_days,
            "activities_count": activities_count,
        }

    # -----------------------------------------------------
    # 3. Trip validation
    # -----------------------------------------------------
    if trip.end_date < trip.start_date:
        raise HTTPException(
            status_code=400,
            detail="Trip end date cannot be before start date",
        )

    total_days = (trip.end_date - trip.start_date).days + 1

    if total_days <= 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid trip duration",
        )

    destination = (
        trip.destination.strip()
        if trip.destination
        else "your destination"
    )

    raw_interests = trip.interests or ""
    interests = [
        item.strip()
        for item in raw_interests.split(",")
        if item.strip()
    ]
    interest_text = ", ".join(interests)

    total_budget = max(float(trip.budget or 0), 0.0)
    activity_budget = total_budget * 0.70 if total_budget > 0 else 0.0
    daily_activity_budget = (
        activity_budget / total_days if total_days else 0.0
    )

    # -----------------------------------------------------
    # 4. If regenerating, remove old activities first, then days
    # -----------------------------------------------------
    if existing_days and regenerate:
        old_day_ids = [day.id for day in existing_days]

        (
            db.query(ItineraryActivity)
            .filter(
                ItineraryActivity.itinerary_day_id.in_(old_day_ids)
            )
            .delete(synchronize_session=False)
        )

        (
            db.query(ItineraryDay)
            .filter(ItineraryDay.id.in_(old_day_ids))
            .delete(synchronize_session=False)
        )

        db.commit()

    # -----------------------------------------------------
    # 5. Destination-specific daily plans
    # -----------------------------------------------------
    # Each dictionary contains one full day. The generator cycles
    # through these plans if the trip is longer than the list.
    destination_key = destination.lower()

    if "switzerland" in destination_key or destination_key in {
        "swiss",
        "switzerland trip",
    }:
        daily_plans = [
            {
                "place": "Zurich",
                "focus": "Old Town, Bahnhofstrasse & Lake Zurich",
                "main": (
                    "Zurich Old Town walk",
                    "Explore Zurich's historic Old Town, narrow streets and lively local squares.",
                    "culture",
                ),
                "afternoon": (
                    "Lake Zurich & Bahnhofstrasse",
                    "Stroll around Lake Zurich and explore the city's famous shopping boulevard.",
                    "sightseeing",
                ),
            },
            {
                "place": "Lucerne",
                "focus": "Chapel Bridge, Old Town & lakeside views",
                "main": (
                    "Chapel Bridge & Lucerne Old Town",
                    "Discover Chapel Bridge, the old town lanes and the historic heart of Lucerne.",
                    "culture",
                ),
                "afternoon": (
                    "Lake Lucerne waterfront",
                    "Enjoy a relaxed walk along Lake Lucerne with views toward the surrounding mountains.",
                    "nature",
                ),
            },
            {
                "place": "Interlaken",
                "focus": "Interlaken town & Alpine viewpoints",
                "main": (
                    "Interlaken Alpine experience",
                    "Explore Interlaken and enjoy panoramic Alpine scenery around the town.",
                    "nature",
                ),
                "afternoon": (
                    "Harder Kulm viewpoint",
                    "Take in wide views over Interlaken, the lakes and surrounding mountains, subject to local conditions.",
                    "photography",
                ),
            },
            {
                "place": "Lauterbrunnen",
                "focus": "Valley scenery & waterfalls",
                "main": (
                    "Lauterbrunnen Valley",
                    "Walk through the dramatic valley surrounded by cliffs, waterfalls and Alpine scenery.",
                    "nature",
                ),
                "afternoon": (
                    "Waterfall & village photography",
                    "Spend the afternoon capturing Lauterbrunnen's waterfalls, village views and mountain landscapes.",
                    "photography",
                ),
            },
            {
                "place": "Grindelwald",
                "focus": "Mountain village & panoramic scenery",
                "main": (
                    "Grindelwald mountain experience",
                    "Explore Grindelwald village and enjoy its classic views of the Bernese Alps.",
                    "nature",
                ),
                "afternoon": (
                    "Grindelwald scenic viewpoint",
                    "Relax at a scenic viewpoint and photograph the surrounding peaks, subject to weather and lift conditions.",
                    "photography",
                ),
            },
            {
                "place": "Bern",
                "focus": "UNESCO Old Town & local culture",
                "main": (
                    "Bern Old Town heritage walk",
                    "Discover Bern's historic streets, fountains, arcades and landmark old-town architecture.",
                    "culture",
                ),
                "afternoon": (
                    "Bern local food experience",
                    "Try Swiss specialties and explore local cafés and food spots around the historic centre.",
                    "food",
                ),
            },
            {
                "place": "Zermatt",
                "focus": "Mountain village & Matterhorn views",
                "main": (
                    "Zermatt village exploration",
                    "Explore the car-free mountain village and discover viewpoints around the Matterhorn region.",
                    "nature",
                ),
                "afternoon": (
                    "Matterhorn photography session",
                    "Find scenic viewpoints for Matterhorn photography, subject to visibility and local conditions.",
                    "photography",
                ),
            },
            {
                "place": "Montreux",
                "focus": "Lake Geneva, Chillon & Riviera atmosphere",
                "main": (
                    "Montreux lakeside walk",
                    "Explore the Lake Geneva waterfront and the relaxed atmosphere of the Swiss Riviera.",
                    "nature",
                ),
                "afternoon": (
                    "Chillon Castle & lakeside views",
                    "Visit the historic Chillon area and enjoy Lake Geneva views around Montreux.",
                    "culture",
                ),
            },
        ]
    else:
        # Generic fallback: still different every day instead of
        # repeating the exact same activity names and locations.
        lower_interests = {item.lower() for item in interests}
        daily_plans = [
            {
                "place": f"{destination} Old Town",
                "focus": "heritage & local streets",
                "main": (
                    "Old Town exploration",
                    f"Discover the historic side of {destination} through local streets, landmarks and neighbourhoods.",
                    "culture",
                ),
                "afternoon": (
                    "Local photography walk",
                    f"Capture memorable architecture, street scenes and viewpoints around {destination}.",
                    "photography",
                ),
            },
            {
                "place": f"{destination} Nature Area",
                "focus": "scenery & outdoor experiences",
                "main": (
                    "Nature escape",
                    f"Spend time in a scenic natural area around {destination} and enjoy a slower outdoor experience.",
                    "nature",
                ),
                "afternoon": (
                    "Scenic viewpoint",
                    f"Visit a well-known viewpoint around {destination} and enjoy the surrounding landscape.",
                    "nature",
                ),
            },
            {
                "place": f"{destination} Food District",
                "focus": "local cuisine & markets",
                "main": (
                    "Local food discovery",
                    f"Explore local flavours, markets and popular food streets in {destination}.",
                    "food",
                ),
                "afternoon": (
                    "Market & café experience",
                    f"Discover local markets and cafés while experiencing everyday life in {destination}.",
                    "food",
                ),
            },
            {
                "place": f"{destination} Cultural Quarter",
                "focus": "history, art & culture",
                "main": (
                    "Culture & history experience",
                    f"Explore museums, heritage sites or cultural landmarks that represent {destination}.",
                    "culture",
                ),
                "afternoon": (
                    "Arts & local life",
                    f"Discover galleries, local art and cultural spaces around {destination}.",
                    "culture",
                ),
            },
            {
                "place": f"{destination} Adventure Zone",
                "focus": "active experiences",
                "main": (
                    "Adventure experience",
                    f"Enjoy an active experience around {destination} suited to the day's pace and conditions.",
                    "adventure",
                ),
                "afternoon": (
                    "Outdoor activity",
                    f"Spend the afternoon outdoors and explore another side of {destination}.",
                    "adventure",
                ),
            },
        ]

    # -----------------------------------------------------
    # 6. Create days + five varied activities per day
    # -----------------------------------------------------
    created_days = []
    activities_created = 0

    try:
        for day_number in range(1, total_days + 1):
            current_date = (
                trip.start_date + timedelta(days=day_number - 1)
            )

            plan = daily_plans[(day_number - 1) % len(daily_plans)]
            day_estimate = round(daily_activity_budget, 2)

            day = ItineraryDay(
                trip_id=trip.id,
                day_number=day_number,
                date=current_date,
                title=f"Day {day_number} — {plan['place']}",
                summary=(
                    f"Explore {plan['focus']} in {destination}"
                    + (
                        f", with a focus on {interest_text}."
                        if interest_text
                        else "."
                    )
                ),
                estimated_cost=day_estimate,
            )

            db.add(day)
            db.flush()

            activity_costs = [
                round(day_estimate * 0.10, 2),
                round(day_estimate * 0.25, 2),
                round(day_estimate * 0.10, 2),
                round(day_estimate * 0.35, 2),
                round(day_estimate * 0.20, 2),
            ]

            main_title, main_description, main_type = plan["main"]
            afternoon_title, afternoon_description, afternoon_type = plan["afternoon"]

            # Give food / photography / nature interests a little
            # more visibility while keeping every day different.
            breakfast_title = (
                f"Breakfast in {plan['place']}"
            )
            lunch_title = (
                f"Local lunch — {plan['place']}"
            )
            dinner_title = (
                f"Swiss dinner & evening in {plan['place']}"
                if "switzerland" in destination_key
                else f"Dinner & evening in {plan['place']}"
            )

            activities = [
                {
                    "start_time": "08:30",
                    "end_time": "09:30",
                    "activity_type": "food",
                    "title": breakfast_title,
                    "description": (
                        f"Start Day {day_number} with breakfast near {plan['place']} "
                        "and prepare for the day's experiences."
                    ),
                    "location": plan["place"],
                    "cost": activity_costs[0],
                    "duration": 60,
                },
                {
                    "start_time": "10:00",
                    "end_time": "12:30",
                    "activity_type": main_type,
                    "title": main_title,
                    "description": main_description,
                    "location": plan["place"],
                    "cost": activity_costs[1],
                    "duration": 150,
                },
                {
                    "start_time": "13:00",
                    "end_time": "14:00",
                    "activity_type": "food",
                    "title": lunch_title,
                    "description": (
                        f"Take a relaxed lunch break and try local options around {plan['place']}."
                    ),
                    "location": plan["place"],
                    "cost": activity_costs[2],
                    "duration": 60,
                },
                {
                    "start_time": "15:00",
                    "end_time": "18:00",
                    "activity_type": afternoon_type,
                    "title": afternoon_title,
                    "description": afternoon_description,
                    "location": plan["place"],
                    "cost": activity_costs[3],
                    "duration": 180,
                },
                {
                    "start_time": "19:30",
                    "end_time": "21:00",
                    "activity_type": "food",
                    "title": dinner_title,
                    "description": (
                        f"Relax with dinner and enjoy the evening atmosphere around {plan['place']}."
                    ),
                    "location": plan["place"],
                    "cost": activity_costs[4],
                    "duration": 90,
                },
            ]

            for order, item in enumerate(activities, start=1):
                activity = ItineraryActivity(
                    itinerary_day_id=day.id,
                    activity_order=order,
                    start_time=item["start_time"],
                    end_time=item["end_time"],
                    activity_type=item["activity_type"],
                    title=item["title"],
                    description=item["description"],
                    location=item["location"],
                    estimated_cost=item["cost"],
                    duration_minutes=item["duration"],
                    status="planned",
                )

                db.add(activity)
                activities_created += 1

            created_days.append(day)

        db.commit()

        for day in created_days:
            db.refresh(day)

        return {
            "message": "Itinerary regenerated successfully" if regenerate else "Itinerary generated successfully",
            "trip_id": trip.id,
            "days_created": len(created_days),
            "activities_created": activities_created,
            "days": created_days,
        }

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to generate itinerary: "
                f"{str(exc)}"
            ),
        )
