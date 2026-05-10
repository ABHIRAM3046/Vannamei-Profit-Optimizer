"""
Analytics, feed recommendation, alerts, and harvest planning routers.
"""
from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Pond, DailyLog, Alert, MarketPrice
from app.schemas import (
    AnalyticsResponse, TrendData, FeedRecommendation, PondMetrics,
    AlertResponse, HarvestPlanResponse, HarvestScenario
)
from app.services.feed_engine import calculate_feed_recommendation
from app.services.harvest_engine import calculate_harvest_scenarios


# ─── Analytics Router ───────────────────────────────────

analytics_router = APIRouter(prefix="/api/ponds/{pond_id}/analytics", tags=["analytics"])


@analytics_router.get("", response_model=AnalyticsResponse, summary="Get pond analytics dashboard")
async def get_analytics(pond_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get full analytics for a pond including:
    - Current metrics (biomass, FCR, survival, ADG)
    - Trend data for charts
    - Feed recommendation
    - Active alerts
    """
    # Get pond with logs
    result = await db.execute(
        select(Pond)
        .where(Pond.id == pond_id)
        .options(selectinload(Pond.daily_logs), selectinload(Pond.alerts))
    )
    pond = result.scalar_one_or_none()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")

    doc = (date.today() - pond.stocking_date).days
    logs = pond.daily_logs  # already ordered by date

    # Current metrics from latest log
    if logs:
        latest = logs[-1]
        current_metrics = PondMetrics(
            doc=doc,
            biomass_kg=latest.biomass_kg,
            fcr=latest.fcr,
            survival_rate=latest.survival_rate,
            adg=latest.adg,
            avg_body_weight_g=latest.avg_body_weight_g,
            total_feed_kg=latest.cumulative_feed_kg,
            surviving_count=latest.surviving_count,
            cumulative_mortality=latest.cumulative_mortality,
        )
    else:
        current_metrics = PondMetrics(doc=doc)

    # Trend data
    trends = TrendData(
        dates=[l.log_date for l in logs],
        biomass=[l.biomass_kg for l in logs],
        fcr=[l.fcr for l in logs],
        survival=[l.survival_rate for l in logs],
        adg=[l.adg for l in logs],
        feed_daily=[l.feed_given_kg for l in logs],
        abw=[l.avg_body_weight_g for l in logs],
    )

    # Feed recommendation
    if logs and latest.biomass_kg and latest.biomass_kg > 0:
        # Calculate mortality trend
        recent_mortalities = [l.mortality_count for l in logs[-7:]]
        if len(recent_mortalities) >= 3:
            avg_mort = sum(recent_mortalities[:-1]) / max(len(recent_mortalities) - 1, 1)
            mortality_trend = recent_mortalities[-1] / max(avg_mort, 0.1) if avg_mort > 0 else None
        else:
            mortality_trend = None

        feed_rec = calculate_feed_recommendation(
            biomass_kg=latest.biomass_kg,
            doc=doc,
            fcr=latest.fcr,
            dissolved_oxygen=latest.dissolved_oxygen,
            ammonia=latest.ammonia,
            ph=latest.ph,
            recent_mortality_trend=mortality_trend,
            current_daily_feed=latest.feed_given_kg,
        )
    else:
        feed_rec = {
            "recommended_feed_kg": 0,
            "current_feed_kg": 0,
            "change_percent": 0,
            "feeding_frequency": 4,
            "reasons": ["Add daily logs with ABW data to get feed recommendations."],
            "fcr_status": "unknown",
        }

    # Active alerts (unread, last 7 days)
    active_alerts = [
        AlertResponse(
            **{**{c.key: getattr(a, c.key) for c in Alert.__table__.columns},
               "pond_name": pond.name}
        )
        for a in pond.alerts
        if not a.is_read and (date.today() - a.alert_date).days <= 7
    ][:10]  # Max 10

    return AnalyticsResponse(
        pond_id=pond_id,
        pond_name=pond.name,
        doc=doc,
        current_metrics=current_metrics,
        trends=trends,
        feed_recommendation=FeedRecommendation(**feed_rec),
        active_alerts=active_alerts,
    )


# ─── Feed Recommendation Router ─────────────────────────

feed_router = APIRouter(prefix="/api/ponds/{pond_id}/feed-recommendation", tags=["feed"])


@feed_router.get("", response_model=FeedRecommendation, summary="Get feed recommendation")
async def get_feed_recommendation(pond_id: str, db: AsyncSession = Depends(get_db)):
    """Get today's feed recommendation for a pond."""
    result = await db.execute(
        select(Pond).where(Pond.id == pond_id).options(selectinload(Pond.daily_logs))
    )
    pond = result.scalar_one_or_none()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")

    doc = (date.today() - pond.stocking_date).days
    logs = pond.daily_logs

    if not logs:
        return FeedRecommendation(
            recommended_feed_kg=0,
            current_feed_kg=0,
            change_percent=0,
            feeding_frequency=4,
            reasons=["No daily logs yet — add data to get recommendations."],
            fcr_status="unknown",
        )

    latest = logs[-1]
    biomass = latest.biomass_kg or 0

    # Mortality trend
    recent_morts = [l.mortality_count for l in logs[-7:]]
    avg_mort = sum(recent_morts[:-1]) / max(len(recent_morts) - 1, 1) if len(recent_morts) > 1 else 0
    mort_trend = recent_morts[-1] / max(avg_mort, 0.1) if avg_mort > 0 else None

    rec = calculate_feed_recommendation(
        biomass_kg=biomass,
        doc=doc,
        fcr=latest.fcr,
        dissolved_oxygen=latest.dissolved_oxygen,
        ammonia=latest.ammonia,
        ph=latest.ph,
        recent_mortality_trend=mort_trend,
        current_daily_feed=latest.feed_given_kg,
    )

    return FeedRecommendation(**rec)


# ─── Alerts Router ──────────────────────────────────────

alerts_router = APIRouter(tags=["alerts"])


@alerts_router.get(
    "/api/ponds/{pond_id}/alerts",
    response_model=List[AlertResponse],
    summary="Get alerts for a pond",
)
async def get_pond_alerts(
    pond_id: str,
    unread_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """Get alerts for a specific pond."""
    query = select(Alert).where(Alert.pond_id == pond_id)
    if unread_only:
        query = query.where(Alert.is_read == False)
    query = query.order_by(Alert.created_at.desc()).limit(50)

    result = await db.execute(query)
    alerts = result.scalars().all()

    # Get pond name
    pond_result = await db.execute(select(Pond.name).where(Pond.id == pond_id))
    pond_name = pond_result.scalar_one_or_none() or "Unknown"

    return [
        AlertResponse(**{
            **{c.key: getattr(a, c.key) for c in Alert.__table__.columns},
            "pond_name": pond_name,
        })
        for a in alerts
    ]


@alerts_router.get(
    "/api/alerts",
    response_model=List[AlertResponse],
    summary="Get all alerts across ponds",
)
async def get_all_alerts(
    owner_id: str = Query(...),
    unread_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """Get all alerts across all ponds for a user."""
    query = (
        select(Alert, Pond.name.label("pond_name"))
        .join(Pond, Alert.pond_id == Pond.id)
        .where(Pond.owner_id == owner_id)
    )
    if unread_only:
        query = query.where(Alert.is_read == False)
    query = query.order_by(Alert.created_at.desc()).limit(100)

    result = await db.execute(query)
    rows = result.all()

    return [
        AlertResponse(**{
            **{c.key: getattr(alert, c.key) for c in Alert.__table__.columns},
            "pond_name": pond_name,
        })
        for alert, pond_name in rows
    ]


@alerts_router.put("/api/alerts/{alert_id}/read", summary="Mark alert as read")
async def mark_alert_read(alert_id: str, db: AsyncSession = Depends(get_db)):
    """Mark an alert as read."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_read = True
    await db.commit()
    return {"message": "Alert marked as read"}


# ─── Harvest Planner Router ─────────────────────────────

harvest_router = APIRouter(prefix="/api/ponds/{pond_id}/harvest-plan", tags=["harvest"])


@harvest_router.get("", response_model=HarvestPlanResponse, summary="Get harvest plan")
async def get_harvest_plan(pond_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get harvest timing scenarios with projected profits.
    Shows comparison of harvesting now vs waiting X days.
    """
    result = await db.execute(
        select(Pond).where(Pond.id == pond_id).options(selectinload(Pond.daily_logs))
    )
    pond = result.scalar_one_or_none()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")

    logs = pond.daily_logs
    doc = (date.today() - pond.stocking_date).days

    if not logs or len(logs) < 3:
        raise HTTPException(
            status_code=400,
            detail="Need at least 3 daily logs to generate harvest plan."
        )

    latest = logs[-1]

    if not latest.biomass_kg or latest.biomass_kg <= 0:
        raise HTTPException(
            status_code=400,
            detail="Need ABW data to generate harvest plan. Enter average body weight."
        )

    # Calculate daily mortality rate from recent data
    recent_logs = logs[-7:] if len(logs) >= 7 else logs
    total_recent_mortality = sum(l.mortality_count for l in recent_logs)
    avg_surviving = latest.surviving_count or (pond.pl_stocked - (latest.cumulative_mortality or 0))
    daily_mort_rate = (total_recent_mortality / len(recent_logs)) / max(avg_surviving, 1) if avg_surviving > 0 else 0.001

    # ADG — use recent trend if available
    adg = latest.adg or 0.2  # default if not calculable

    # Fetch market prices
    market_result = await db.execute(
        select(MarketPrice)
        .order_by(MarketPrice.date_recorded.desc(), MarketPrice.count_per_kg.asc())
    )
    prices_all = market_result.scalars().all()
    market_prices = {}
    for p in prices_all:
        if p.count_per_kg not in market_prices:
            market_prices[p.count_per_kg] = p.price_per_kg

    plan = calculate_harvest_scenarios(
        current_biomass_kg=latest.biomass_kg,
        current_abw_g=latest.avg_body_weight_g or 0,
        adg=adg,
        surviving_count=latest.surviving_count or 0,
        daily_mortality_rate=daily_mort_rate,
        total_feed_cost_so_far=(latest.cumulative_feed_kg or 0) * pond.feed_cost_per_kg,
        feed_cost_per_kg=pond.feed_cost_per_kg,
        default_selling_price=pond.selling_price_per_kg,
        doc=doc,
        daily_feed_kg=latest.feed_given_kg,
        market_prices=market_prices if market_prices else None,
    )

    return HarvestPlanResponse(
        pond_id=pond_id,
        pond_name=pond.name,
        current_doc=doc,
        scenarios=[HarvestScenario(**s) for s in plan["scenarios"]],
        optimal_harvest_day=plan["optimal_harvest_day"],
        optimal_profit=plan["optimal_profit"],
        harvest_now_profit=plan["harvest_now_profit"],
        recommendation=plan["recommendation"],
    )
