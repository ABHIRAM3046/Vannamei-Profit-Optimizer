"""
Pydantic schemas for request/response validation.
"""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ─── Auth ───────────────────────────────────────────────

class OTPRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15, examples=["+919876543210"])


class OTPVerify(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)
    otp: str = Field(..., min_length=6, max_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    phone: str
    name: Optional[str] = None
    farm_name: Optional[str] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    farm_name: Optional[str] = None


# ─── Pond ───────────────────────────────────────────────

class PondCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, examples=["Pond A1"])
    area_m2: float = Field(..., gt=0, examples=[5000.0])
    stocking_date: date
    pl_stocked: int = Field(..., gt=0, examples=[300000])
    salinity_ppt: Optional[float] = Field(15.0, ge=0, le=45)
    feed_type: Optional[str] = "Standard Pellet"
    feed_cost_per_kg: float = Field(65.0, gt=0)
    selling_price_per_kg: float = Field(350.0, gt=0)


class PondUpdate(BaseModel):
    name: Optional[str] = None
    area_m2: Optional[float] = None
    salinity_ppt: Optional[float] = None
    feed_type: Optional[str] = None
    feed_cost_per_kg: Optional[float] = None
    selling_price_per_kg: Optional[float] = None


class PondResponse(BaseModel):
    id: str
    name: str
    area_m2: float
    stocking_date: date
    pl_stocked: int
    salinity_ppt: Optional[float]
    feed_type: Optional[str]
    feed_cost_per_kg: float
    selling_price_per_kg: float
    is_active: bool
    created_at: datetime
    doc: Optional[int] = None  # Computed: days since stocking
    latest_metrics: Optional["PondMetrics"] = None

    class Config:
        from_attributes = True


class PondMetrics(BaseModel):
    """Latest computed metrics for a pond."""
    doc: int
    biomass_kg: Optional[float] = None
    fcr: Optional[float] = None
    survival_rate: Optional[float] = None
    adg: Optional[float] = None
    avg_body_weight_g: Optional[float] = None
    total_feed_kg: Optional[float] = None
    surviving_count: Optional[int] = None
    cumulative_mortality: Optional[int] = None


# ─── Daily Log ──────────────────────────────────────────

class DailyLogCreate(BaseModel):
    log_date: date
    feed_given_kg: float = Field(..., ge=0)
    avg_body_weight_g: Optional[float] = Field(None, ge=0)
    mortality_count: int = Field(0, ge=0)
    dissolved_oxygen: Optional[float] = Field(None, ge=0)
    ph: Optional[float] = Field(None, ge=0, le=14)
    ammonia: Optional[float] = Field(None, ge=0)
    temperature_c: Optional[float] = Field(None, ge=0, le=50)
    notes: Optional[str] = None


class DailyLogResponse(BaseModel):
    id: str
    pond_id: str
    log_date: date
    doc: int
    feed_given_kg: float
    avg_body_weight_g: Optional[float]
    mortality_count: int
    dissolved_oxygen: Optional[float]
    ph: Optional[float]
    ammonia: Optional[float]
    temperature_c: Optional[float]
    cumulative_feed_kg: Optional[float]
    cumulative_mortality: Optional[int]
    surviving_count: Optional[int]
    survival_rate: Optional[float]
    biomass_kg: Optional[float]
    fcr: Optional[float]
    adg: Optional[float]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Analytics ──────────────────────────────────────────

class AnalyticsResponse(BaseModel):
    pond_id: str
    pond_name: str
    doc: int
    current_metrics: PondMetrics
    trends: "TrendData"
    feed_recommendation: "FeedRecommendation"
    active_alerts: List["AlertResponse"]


class TrendData(BaseModel):
    dates: List[date]
    biomass: List[Optional[float]]
    fcr: List[Optional[float]]
    survival: List[Optional[float]]
    adg: List[Optional[float]]
    feed_daily: List[Optional[float]]
    abw: List[Optional[float]]


# ─── Feed Recommendation ────────────────────────────────

class FeedRecommendation(BaseModel):
    recommended_feed_kg: float
    current_feed_kg: float
    change_percent: float  # positive = increase, negative = decrease
    feeding_frequency: int  # meals per day
    reasons: List[str]
    fcr_status: str  # "excellent", "good", "concerning", "critical"


# ─── Alerts ─────────────────────────────────────────────

class AlertResponse(BaseModel):
    id: str
    pond_id: str
    pond_name: Optional[str] = None
    alert_date: date
    severity: str
    category: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Market Prices ──────────────────────────────────────

class MarketPriceCreate(BaseModel):
    date_recorded: Optional[date] = None
    count_per_kg: int = Field(..., gt=0)
    price_per_kg: float = Field(..., gt=0)

class MarketPriceResponse(BaseModel):
    id: str
    date_recorded: date
    count_per_kg: int
    price_per_kg: float
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Transfers ──────────────────────────────────────────

class TransferRequest(BaseModel):
    source_pond_id: str
    target_pond_id: Optional[str] = None # None means creating a new pond
    target_pond_name: Optional[str] = None
    pl_count: int = Field(..., gt=0)


# ─── Harvest ────────────────────────────────────────────

class HarvestScenario(BaseModel):
    days_from_now: int
    projected_abw_g: float
    projected_biomass_kg: float
    projected_survival: float
    total_feed_cost: float
    total_revenue: float
    total_profit: float
    profit_per_kg: float
    projected_fcr: float


class HarvestPlanResponse(BaseModel):
    pond_id: str
    pond_name: str
    current_doc: int
    scenarios: List[HarvestScenario]
    optimal_harvest_day: int
    optimal_profit: float
    harvest_now_profit: float
    recommendation: str


# Forward references
TokenResponse.model_rebuild()
PondResponse.model_rebuild()
AnalyticsResponse.model_rebuild()
