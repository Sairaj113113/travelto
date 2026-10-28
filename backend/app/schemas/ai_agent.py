from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, Field


class AgentTripRequest(BaseModel):
    starting_location: str = Field(..., min_length=2, max_length=150)
    destination: str = Field(..., min_length=2, max_length=150)
    start_date: date
    end_date: date
    travelers: int = Field(default=1, ge=1, le=50)
    adults: int = Field(default=1, ge=1, le=50)
    children: int = Field(default=0, ge=0, le=20)
    budget: float = Field(default=0, ge=0)
    transport_preference: Optional[str] = Field(default=None, max_length=50)
    travel_style: Optional[str] = Field(default=None, max_length=50)
    interests: list[str] = Field(default_factory=list)
    departure_id: Optional[str] = Field(default=None, max_length=20)
    arrival_id: Optional[str] = Field(default=None, max_length=20)
    train_source: Optional[str] = Field(default=None, max_length=10)
    train_destination: Optional[str] = Field(default=None, max_length=10)
    train_class_code: Optional[str] = Field(default="CC", max_length=10)
    train_quota_code: Optional[str] = Field(default="GN", max_length=10)


class AgentDataSource(BaseModel):
    name: Optional[str] = None
    status: str
    data: Any = None
    error: Optional[str] = None


class AgentPlace(BaseModel):
    name: str
    category: Optional[str] = None
    area: Optional[str] = None
    reason: Optional[str] = None
    suggested_duration_minutes: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    rating: Optional[float] = None
    distance_km: Optional[float] = None
    api_data: Optional[dict[str, Any]] = None


class AgentRegion(BaseModel):
    name: str
    reason: Optional[str] = None
    priority: Optional[str] = None
    recommended_days: Optional[int] = None
    places: list[AgentPlace] = Field(default_factory=list)


class AgentHotelStay(BaseModel):
    region: str
    check_in: date
    check_out: date
    nights: int
    reason: Optional[str] = None
    hotels: list[dict[str, Any]] = Field(default_factory=list)
    recommended_hotel: Optional[dict[str, Any]] = None


class AgentExperiencePlan(BaseModel):
    summary: Optional[str] = None
    regions: list[AgentRegion] = Field(default_factory=list)
    experience_categories: list[str] = Field(default_factory=list)
    special_considerations: list[str] = Field(default_factory=list)


class AgentAnalysis(BaseModel):
    summary: str
    recommended_transport: Optional[dict[str, Any]] = None
    hotel_strategy: list[dict[str, Any]] = Field(default_factory=list)
    place_strategy: list[dict[str, Any]] = Field(default_factory=list)
    trip_flow: list[dict[str, Any]] = Field(default_factory=list)
    budget_observation: Optional[str] = None
    budget_breakdown_summary: Optional[str] = None
    weather_advice: Optional[str] = None
    route_observations: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)



class AgentBudgetComponent(BaseModel):
    amount: float = 0
    status: str = "unavailable"
    source: str = "unavailable"
    scope: Optional[str] = None
    pricing_scope: Optional[str] = None
    assumption: Optional[str] = None
    selection: Any = None
    alternatives_count: Optional[int] = None
    planned_places: Optional[int] = None
    route_distance_km: Optional[float] = None



class AgentBudgetBreakdown(BaseModel):
    currency: str = "INR"
    budget_scope: str = "group_total"
    travelers: int
    adults: int
    children: int
    requested_budget: float
    components: dict[str, AgentBudgetComponent]
    estimated_total: float
    remaining_budget: float
    within_budget: bool
    note: Optional[str] = None


class AgentTripResponse(BaseModel):
    message: str
    trip_request: dict[str, Any]
    experience_plan: Optional[dict[str, Any]] = None
    places: Optional[AgentDataSource] = None
    hotels: Optional[AgentDataSource] = None
    flights: Optional[AgentDataSource] = None
    trains: Optional[AgentDataSource] = None
    weather: Optional[AgentDataSource] = None
    routes: list[dict[str, Any]] = Field(default_factory=list)
    budget_breakdown: Optional[AgentBudgetBreakdown] = None
    ai_analysis: Optional[dict[str, Any]] = None
