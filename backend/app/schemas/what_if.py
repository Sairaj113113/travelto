from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


# =========================================================
# WHAT-IF REQUEST
# =========================================================

class WhatIfRequest(BaseModel):
    trip_id: int

    scenario: str = Field(
        ...,
        min_length=3,
        max_length=500
    )

    new_budget: Optional[float] = Field(
        default=None,
        ge=0
    )

    new_travelers: Optional[int] = Field(
        default=None,
        ge=1,
        le=50
    )

    new_transport_preference: Optional[str] = Field(
        default=None,
        max_length=50
    )


# =========================================================
# WHAT-IF ACTIVITY
# =========================================================

class WhatIfActivity(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None

    activity_type: str

    title: str

    description: Optional[str] = None

    location: Optional[str] = None

    estimated_cost: float = Field(
        default=0,
        ge=0
    )

    duration_minutes: Optional[int] = Field(
        default=None,
        ge=0
    )


# =========================================================
# WHAT-IF DAY
# =========================================================

class WhatIfDay(BaseModel):
    day_number: int

    date: date

    title: str

    summary: Optional[str] = None

    estimated_cost: float = Field(
        default=0,
        ge=0
    )

    activities: list[WhatIfActivity] = Field(
        default_factory=list
    )


# =========================================================
# WHAT-IF RESULT
# =========================================================

class WhatIfResult(BaseModel):
    scenario: str

    original_budget: float

    simulated_budget: float

    days: list[WhatIfDay]


# =========================================================
# APPLY SIMULATION REQUEST
# =========================================================

class ApplyWhatIfRequest(BaseModel):
    trip_id: int

    days: list[WhatIfDay]