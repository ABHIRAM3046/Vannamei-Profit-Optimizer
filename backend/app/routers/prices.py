from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import MarketPrice
from app.schemas import MarketPriceCreate, MarketPriceResponse
from app.services.scraper import scrape_abgains_prices

router = APIRouter(prefix="/api/prices", tags=["prices"])

@router.post("", response_model=MarketPriceResponse, status_code=201)
async def create_market_price(data: MarketPriceCreate, db: AsyncSession = Depends(get_db)):
    """Add a new market price for a specific count."""
    record_date = data.date_recorded or date.today()
    result = await db.execute(
        select(MarketPrice)
        .where(MarketPrice.date_recorded == record_date, MarketPrice.count_per_kg == data.count_per_kg)
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.price_per_kg = data.price_per_kg
        await db.commit()
        await db.refresh(existing)
        return existing

    price = MarketPrice(
        date_recorded=record_date,
        count_per_kg=data.count_per_kg,
        price_per_kg=data.price_per_kg
    )
    db.add(price)
    await db.commit()
    await db.refresh(price)
    return price

@router.get("", response_model=list[MarketPriceResponse])
async def get_market_prices(db: AsyncSession = Depends(get_db)):
    """Get all latest market prices."""
    result = await db.execute(
        select(MarketPrice)
        .order_by(MarketPrice.date_recorded.desc(), MarketPrice.count_per_kg.asc())
    )
    prices = result.scalars().all()
    latest_prices = {}
    for p in prices:
        if p.count_per_kg not in latest_prices:
            latest_prices[p.count_per_kg] = p
            
    return sorted(list(latest_prices.values()), key=lambda x: x.count_per_kg)

@router.delete("/{price_id}", status_code=204)
async def delete_market_price(price_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a market price entry."""
    result = await db.execute(select(MarketPrice).where(MarketPrice.id == price_id))
    price = result.scalar_one_or_none()
    if not price:
        raise HTTPException(status_code=404, detail="Price not found")
    await db.delete(price)
    await db.commit()

@router.post("/scrape", response_model=list[MarketPriceResponse])
async def scrape_prices(db: AsyncSession = Depends(get_db)):
    """
    Scrape prices from AB Gains and save them to the database for today.
    Overwrites any existing prices for the same counts today.
    """
    scraped_data = await scrape_abgains_prices()
    
    if not scraped_data:
        raise HTTPException(status_code=400, detail="Failed to scrape any prices.")
        
    today = date.today()
    added_prices = []
    
    # Process the scraped prices
    for count, price in scraped_data.items():
        # Check if price already exists for today and this count
        result = await db.execute(
            select(MarketPrice)
            .where(MarketPrice.date_recorded == today, MarketPrice.count_per_kg == count)
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            existing.price_per_kg = price
            added_prices.append(existing)
        else:
            new_price = MarketPrice(
                date_recorded=today,
                count_per_kg=count,
                price_per_kg=price
            )
            db.add(new_price)
            added_prices.append(new_price)
            
    await db.commit()
    
    for p in added_prices:
        await db.refresh(p)
        
    return added_prices
