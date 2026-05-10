"""
Pond CRUD router.
"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Pond, DailyLog
from app.schemas import PondCreate, PondUpdate, PondResponse, PondMetrics, TransferRequest

router = APIRouter(prefix="/api/ponds", tags=["ponds"])


def _compute_latest_metrics(pond: Pond) -> PondMetrics | None:
    """Compute latest metrics from the most recent daily log."""
    if not pond.daily_logs:
        doc = (date.today() - pond.stocking_date).days
        return PondMetrics(doc=doc)

    latest = pond.daily_logs[-1]
    doc = (date.today() - pond.stocking_date).days

    return PondMetrics(
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


@router.post("", response_model=PondResponse, status_code=201, summary="Create a new pond")
async def create_pond(
    data: PondCreate,
    owner_id: str = Query(..., description="Owner user ID"),
    db: AsyncSession = Depends(get_db),
):
    """Create a new pond for the farmer."""
    pond = Pond(
        owner_id=owner_id,
        name=data.name,
        area_m2=data.area_m2,
        stocking_date=data.stocking_date,
        pl_stocked=data.pl_stocked,
        salinity_ppt=data.salinity_ppt,
        feed_type=data.feed_type,
        feed_cost_per_kg=data.feed_cost_per_kg,
        selling_price_per_kg=data.selling_price_per_kg,
    )
    db.add(pond)
    await db.commit()
    await db.refresh(pond)

    response = PondResponse.model_validate(pond)
    response.doc = (date.today() - pond.stocking_date).days
    return response


@router.get("", response_model=list[PondResponse], summary="List all ponds")
async def list_ponds(
    owner_id: str = Query(..., description="Owner user ID"),
    db: AsyncSession = Depends(get_db),
):
    """List all ponds for the authenticated user."""
    result = await db.execute(
        select(Pond)
        .where(Pond.owner_id == owner_id, Pond.is_active == True)
        .options(selectinload(Pond.daily_logs))
        .order_by(Pond.created_at.desc())
    )
    ponds = result.scalars().all()

    responses = []
    for pond in ponds:
        resp = PondResponse.model_validate(pond)
        resp.doc = (date.today() - pond.stocking_date).days
        resp.latest_metrics = _compute_latest_metrics(pond)
        responses.append(resp)
    return responses


@router.get("/{pond_id}", response_model=PondResponse, summary="Get pond details")
async def get_pond(pond_id: str, db: AsyncSession = Depends(get_db)):
    """Get details for a specific pond."""
    result = await db.execute(
        select(Pond)
        .where(Pond.id == pond_id)
        .options(selectinload(Pond.daily_logs))
    )
    pond = result.scalar_one_or_none()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")

    resp = PondResponse.model_validate(pond)
    resp.doc = (date.today() - pond.stocking_date).days
    resp.latest_metrics = _compute_latest_metrics(pond)
    return resp


@router.put("/{pond_id}", response_model=PondResponse, summary="Update pond")
async def update_pond(pond_id: str, data: PondUpdate, db: AsyncSession = Depends(get_db)):
    """Update pond settings (name, costs, etc.)."""
    result = await db.execute(select(Pond).where(Pond.id == pond_id))
    pond = result.scalar_one_or_none()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(pond, field, value)

    await db.commit()
    await db.refresh(pond)

    resp = PondResponse.model_validate(pond)
    resp.doc = (date.today() - pond.stocking_date).days
    return resp


@router.delete("/{pond_id}", status_code=204, summary="Delete pond")
async def delete_pond(pond_id: str, db: AsyncSession = Depends(get_db)):
    """Soft-delete a pond."""
    result = await db.execute(select(Pond).where(Pond.id == pond_id))
    pond = result.scalar_one_or_none()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")

    pond.is_active = False
    await db.commit()

@router.post("/transfer", summary="Transfer PLs between ponds")
async def transfer_pls(data: TransferRequest, db: AsyncSession = Depends(get_db)):
    """Transfer shrimp from one pond to another."""
    result = await db.execute(select(Pond).where(Pond.id == data.source_pond_id))
    source_pond = result.scalar_one_or_none()
    if not source_pond:
        raise HTTPException(status_code=404, detail="Source pond not found")
        
    if source_pond.pl_stocked < data.pl_count:
        raise HTTPException(status_code=400, detail="Not enough PLs in source pond")
        
    source_pond.pl_stocked -= data.pl_count
    
    if data.target_pond_id:
        result = await db.execute(select(Pond).where(Pond.id == data.target_pond_id))
        target_pond = result.scalar_one_or_none()
        if not target_pond:
            raise HTTPException(status_code=404, detail="Target pond not found")
        target_pond.pl_stocked += data.pl_count
    else:
        if not data.target_pond_name:
            raise HTTPException(status_code=400, detail="Target pond name required for new pond")
        target_pond = Pond(
            owner_id=source_pond.owner_id,
            name=data.target_pond_name,
            area_m2=source_pond.area_m2,
            stocking_date=date.today(),
            pl_stocked=data.pl_count,
            salinity_ppt=source_pond.salinity_ppt,
            feed_type=source_pond.feed_type,
            feed_cost_per_kg=source_pond.feed_cost_per_kg,
            selling_price_per_kg=source_pond.selling_price_per_kg
        )
        db.add(target_pond)
        
    await db.commit()
    return {"message": "Transfer successful"}
