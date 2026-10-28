from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


# ============================================================
# TRAVEL PREFERENCES
# ============================================================

class VehicleDetails(BaseModel):

    type: Optional[str] = Field(
        default=None,
        max_length=20
    )

    fuel_type: Optional[str] = Field(
        default=None,
        max_length=20
    )

    mileage_kmpl: Optional[float] = Field(
        default=None,
        ge=0
    )


class RentalDetails(BaseModel):

    type: Optional[str] = Field(
        default=None,
        max_length=20
    )


class TravelPreferences(BaseModel):

    mode: Optional[str] = Field(
        default=None,
        max_length=50
    )

    mode_label: Optional[str] = Field(
        default=None,
        max_length=50
    )

    vehicle: Optional[VehicleDetails] = None

    rental: Optional[RentalDetails] = None


# ============================================================
# BUDGET
# ============================================================

class BudgetIncludes(BaseModel):

    transport: bool = True

    accommodation: bool = True

    food: bool = True

    activities: bool = True

    local_travel: bool = True


# ============================================================
# GENERATE TRIP REQUEST
# ============================================================

class GenerateTripRequest(BaseModel):

    # --------------------------------------------------------
    # LOCATION
    # --------------------------------------------------------

    starting_location: Optional[str] = Field(
        default=None,
        max_length=150
    )

    destination: str = Field(
        ...,
        min_length=2,
        max_length=150
    )

    # --------------------------------------------------------
    # DATES
    # --------------------------------------------------------

    start_date: date

    end_date: date

    flexible_dates: bool = False

    # --------------------------------------------------------
    # TRAVELERS
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # BUDGET
    # --------------------------------------------------------

    budget: float = Field(
        default=0,
        ge=0
    )

    budget_includes: BudgetIncludes = Field(
        default_factory=BudgetIncludes
    )

    # --------------------------------------------------------
    # TRANSPORT
    # --------------------------------------------------------

    transport_preference: Optional[str] = Field(
        default=None,
        max_length=50
    )

    travel: Optional[TravelPreferences] = None

    # --------------------------------------------------------
    # PLANNING PRIORITY
    # --------------------------------------------------------

    priority: str = Field(
        default="balanced",
        max_length=50
    )

    # --------------------------------------------------------
    # TRAVEL STYLE
    # --------------------------------------------------------

    travel_style: Optional[str] = Field(
        default=None,
        max_length=50
    )

    # --------------------------------------------------------
    # INTERESTS
    # --------------------------------------------------------

    interests: list[str] = Field(
        default_factory=list
    )


# ============================================================
# GENERATED ACTIVITY
# ============================================================

class GeneratedActivity(BaseModel):

    start_time: Optional[str] = None

    end_time: Optional[str] = None

    activity_type: str = Field(
        ...,
        min_length=1,
        max_length=50
    )

    title: str = Field(
        ...,
        min_length=1,
        max_length=200
    )

    description: Optional[str] = None

    location: Optional[str] = Field(
        default=None,
        max_length=200
    )

    estimated_cost: float = Field(
        default=0,
        ge=0
    )

    duration_minutes: Optional[int] = Field(
        default=None,
        ge=0
    )


# ============================================================
# GENERATED DAY
# ============================================================

class GeneratedDay(BaseModel):

    day_number: int = Field(
        ...,
        ge=1
    )

    date: date

    title: str = Field(
        ...,
        min_length=1,
        max_length=150
    )

    summary: Optional[str] = None

    estimated_cost: float = Field(
        default=0,
        ge=0
    )

    activities: list[GeneratedActivity] = Field(
        default_factory=list
    )


# ============================================================
# GENERATED ITINERARY
# ============================================================

class GeneratedItinerary(BaseModel):

    days: list[GeneratedDay] = Field(
        default_factory=list
    )