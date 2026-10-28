from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# CREATE TRIP
# ============================================================

class TripCreate(BaseModel):

    title: str = Field(
        ...,
        min_length=2,
        max_length=150
    )

    destination: str = Field(
        ...,
        min_length=2,
        max_length=150
    )

    starting_location: str | None = Field(
        default=None,
        max_length=150
    )

    start_date: date

    end_date: date

    flexible_dates: bool = False

    travelers: int = Field(
        default=1,
        ge=1,
        le=50
    )

    adults: int = Field(
        default=1,
        ge=1,
        le=50
    )

    children: int = Field(
        default=0,
        ge=0,
        le=20
    )

    children_ages: list[int] = Field(
        default_factory=list
    )

    budget: float = Field(
        default=0,
        ge=0
    )

    budget_includes_transport: bool = True

    budget_includes_accommodation: bool = True

    budget_includes_food: bool = True

    budget_includes_activities: bool = True

    budget_includes_local_travel: bool = True

    travel_mode: str | None = Field(
        default=None,
        max_length=50
    )

    vehicle_type: str | None = Field(
        default=None,
        max_length=20
    )

    fuel_type: str | None = Field(
        default=None,
        max_length=20
    )

    mileage_kmpl: float | None = Field(
        default=None,
        ge=0
    )

    rental_type: str | None = Field(
        default=None,
        max_length=20
    )

    priority: str = Field(
        default="balanced",
        max_length=50
    )

    travel_style: str | None = Field(
        default=None,
        max_length=50
    )

    interests: str | None = None

    transport_preference: str | None = Field(
        default=None,
        max_length=50
    )

    status: str = Field(
        default="draft",
        max_length=20
    )


# ============================================================
# UPDATE TRIP
# ============================================================

class TripUpdate(BaseModel):

    title: str | None = Field(
        default=None,
        min_length=2,
        max_length=150
    )

    destination: str | None = Field(
        default=None,
        min_length=2,
        max_length=150
    )

    starting_location: str | None = Field(
        default=None,
        max_length=150
    )

    start_date: date | None = None

    end_date: date | None = None

    flexible_dates: bool | None = None

    travelers: int | None = Field(
        default=None,
        ge=1,
        le=50
    )

    adults: int | None = Field(
        default=None,
        ge=1,
        le=50
    )

    children: int | None = Field(
        default=None,
        ge=0,
        le=20
    )

    children_ages: list[int] | None = None

    budget: float | None = Field(
        default=None,
        ge=0
    )

    budget_includes_transport: bool | None = None

    budget_includes_accommodation: bool | None = None

    budget_includes_food: bool | None = None

    budget_includes_activities: bool | None = None

    budget_includes_local_travel: bool | None = None

    travel_mode: str | None = Field(
        default=None,
        max_length=50
    )

    vehicle_type: str | None = Field(
        default=None,
        max_length=20
    )

    fuel_type: str | None = Field(
        default=None,
        max_length=20
    )

    mileage_kmpl: float | None = Field(
        default=None,
        ge=0
    )

    rental_type: str | None = Field(
        default=None,
        max_length=20
    )

    priority: str | None = Field(
        default=None,
        max_length=50
    )

    travel_style: str | None = Field(
        default=None,
        max_length=50
    )

    interests: str | None = None

    transport_preference: str | None = Field(
        default=None,
        max_length=50
    )

    status: str | None = Field(
        default=None,
        max_length=20
    )


# ============================================================
# TRIP RESPONSE
# ============================================================

class TripResponse(BaseModel):

    id: int

    user_id: int

    title: str

    destination: str

    starting_location: str | None

    start_date: date

    end_date: date

    flexible_dates: bool

    travelers: int

    adults: int

    children: int

    children_ages: str | None

    budget: float

    budget_includes_transport: bool

    budget_includes_accommodation: bool

    budget_includes_food: bool

    budget_includes_activities: bool

    budget_includes_local_travel: bool

    travel_mode: str | None

    vehicle_type: str | None

    fuel_type: str | None

    mileage_kmpl: float | None

    rental_type: str | None

    priority: str

    travel_style: str | None

    interests: str | None

    transport_preference: str | None

    status: str

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )