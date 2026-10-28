from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# =========================================================
# ITINERARY DAY SCHEMAS
# =========================================================

class ItineraryDayCreate(BaseModel):
    trip_id: int

    day_number: int = Field(
        ...,
        ge=1
    )

    date: date

    title: Optional[str] = Field(
        default=None,
        max_length=150
    )

    summary: Optional[str] = None

    estimated_cost: float = Field(
        default=0,
        ge=0
    )


class ItineraryDayUpdate(BaseModel):
    day_number: Optional[int] = Field(
        default=None,
        ge=1
    )

    date: Optional[date] = None

    title: Optional[str] = Field(
        default=None,
        max_length=150
    )

    summary: Optional[str] = None

    estimated_cost: Optional[float] = Field(
        default=None,
        ge=0
    )


class ItineraryDayResponse(BaseModel):
    id: int
    trip_id: int
    day_number: int
    date: date
    title: Optional[str]
    summary: Optional[str]
    estimated_cost: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# =========================================================
# ITINERARY ACTIVITY SCHEMAS
# =========================================================

class ItineraryActivityCreate(BaseModel):
    itinerary_day_id: int

    activity_order: int = Field(
        default=1,
        ge=1
    )

    start_time: Optional[str] = None

    end_time: Optional[str] = None

    activity_type: str = Field(
        ...,
        min_length=2,
        max_length=50
    )

    title: str = Field(
        ...,
        min_length=2,
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

    status: str = Field(
        default="planned",
        max_length=30
    )


class ItineraryActivityUpdate(BaseModel):
    activity_order: Optional[int] = Field(
        default=None,
        ge=1
    )

    start_time: Optional[str] = None

    end_time: Optional[str] = None

    activity_type: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=50
    )

    title: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=200
    )

    description: Optional[str] = None

    location: Optional[str] = Field(
        default=None,
        max_length=200
    )

    estimated_cost: Optional[float] = Field(
        default=None,
        ge=0
    )

    duration_minutes: Optional[int] = Field(
        default=None,
        ge=0
    )

    status: Optional[str] = Field(
        default=None,
        max_length=30
    )


class ItineraryActivityResponse(BaseModel):
    id: int
    itinerary_day_id: int
    activity_order: int
    start_time: Optional[str]
    end_time: Optional[str]
    activity_type: str
    title: str
    description: Optional[str]
    location: Optional[str]
    estimated_cost: float
    duration_minutes: Optional[int]
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )