"""
Daily log router — data entry + auto-calculations.
"""
from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Pond, DailyLog, Alert
from app.schemas import DailyLogCreate, DailyLogResponse
from app.services.calculations import compute_all_metrics
from app.services.risk_engine import analyze_risks

router = APIRouter(prefix="/api/ponds/{pond_id}/daily-logs", tags=["daily-logs"])


@router.post("", response_model=DailyLogResponse, status_code=201, summary="Add daily log")
async def create_daily_log(
    pond_id: str,
    data: DailyLogCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Add a daily data entry for a pond.
    Auto-calculates: DOC, cumulative feed, cumulative mortality,
    surviving count, survival rate, biomass, FCR, ADG.
    Also triggers risk analysis and generates alerts.
    """
    # Get pond
    result = await db.execute(
        select(Pond).where(Pond.id == pond_id).options(selectinload(Pond.daily_logs))
    )
    pond = result.scalar_one_or_none()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")

    # Check for duplicate date
    existing = await db.execute(
        select(DailyLog).where(DailyLog.pond_id == pond_id, DailyLog.log_date == data.log_date)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Log already exists for {data.log_date}")

    # Calculate DOC
    doc = (data.log_date - pond.stocking_date).days
    if doc < 0:
        raise HTTPException(status_code=400, detail="Log date cannot be before stocking date")

    # Calculate cumulative feed from previous logs
    prev_feed_result = await db.execute(
        select(func.coalesce(func.sum(DailyLog.feed_given_kg), 0.0))
        .where(DailyLog.pond_id == pond_id, DailyLog.log_date < data.log_date)
    )
    prev_cumulative_feed = prev_feed_result.scalar() or 0.0
    total_feed = prev_cumulative_feed + data.feed_given_kg

    # Calculate cumulative mortality from previous logs
    prev_mort_result = await db.execute(
        select(func.coalesce(func.sum(DailyLog.mortality_count), 0))
        .where(DailyLog.pond_id == pond_id, DailyLog.log_date < data.log_date)
    )
    prev_cumulative_mortality = prev_mort_result.scalar() or 0
    total_mortality = prev_cumulative_mortality + data.mortality_count

    # Compute all metrics
    metrics = compute_all_metrics(
        stocking_date=pond.stocking_date,
        pl_stocked=pond.pl_stocked,
        log_date=data.log_date,
        total_feed_kg=total_feed,
        cumulative_mortality=total_mortality,
        avg_body_weight_g=data.avg_body_weight_g,
    )

    # Create log entry
    log = DailyLog(
        pond_id=pond_id,
        log_date=data.log_date,
        doc=doc,
        feed_given_kg=data.feed_given_kg,
        avg_body_weight_g=data.avg_body_weight_g,
        mortality_count=data.mortality_count,
        dissolved_oxygen=data.dissolved_oxygen,
        ph=data.ph,
        ammonia=data.ammonia,
        temperature_c=data.temperature_c,
        notes=data.notes,
        **metrics,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)

    # ─── Run risk analysis and create alerts ───
    # Get recent logs for risk analysis
    recent_result = await db.execute(
        select(DailyLog)
        .where(DailyLog.pond_id == pond_id)
        .order_by(DailyLog.log_date.desc())
        .limit(10)
    )
    recent_logs = list(reversed(recent_result.scalars().all()))

    log_dicts = []
    for l in recent_logs:
        log_dicts.append({
            "doc": l.doc,
            "feed_given_kg": l.feed_given_kg,
            "avg_body_weight_g": l.avg_body_weight_g,
            "mortality_count": l.mortality_count,
            "dissolved_oxygen": l.dissolved_oxygen,
            "ph": l.ph,
            "ammonia": l.ammonia,
            "fcr": l.fcr,
            "adg": l.adg,
            "biomass_kg": l.biomass_kg,
            "survival_rate": l.survival_rate,
        })

    risk_alerts = analyze_risks(pond_id, log_dicts, pond.pl_stocked)

    for alert_data in risk_alerts:
        alert = Alert(
            pond_id=pond_id,
            alert_date=data.log_date,
            **alert_data,
        )
        db.add(alert)

    if risk_alerts:
        await db.commit()

    return DailyLogResponse.model_validate(log)


@router.get("", response_model=List[DailyLogResponse], summary="Get all daily logs")
async def list_daily_logs(pond_id: str, db: AsyncSession = Depends(get_db)):
    """Get all daily log entries for a pond, ordered by date."""
    result = await db.execute(
        select(DailyLog)
        .where(DailyLog.pond_id == pond_id)
        .order_by(DailyLog.log_date.asc())
    )
    logs = result.scalars().all()
    return [DailyLogResponse.model_validate(l) for l in logs]


@router.get("/latest", response_model=DailyLogResponse, summary="Get latest daily log")
async def get_latest_log(pond_id: str, db: AsyncSession = Depends(get_db)):
    """Get the most recent daily log entry."""
    result = await db.execute(
        select(DailyLog)
        .where(DailyLog.pond_id == pond_id)
        .order_by(DailyLog.log_date.desc())
        .limit(1)
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="No daily logs found")
    return DailyLogResponse.model_validate(log)
