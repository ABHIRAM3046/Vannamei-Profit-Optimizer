from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Device, SensorReading, Pond
from app.schemas import DeviceCreate, DeviceResponse, SensorReadingCreate, SensorReadingResponse

router = APIRouter(prefix="/api/iot", tags=["iot"])

@router.post("/devices", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def register_device(data: DeviceCreate, db: AsyncSession = Depends(get_db)):
    """Register a new IoT device."""
    # Check if device exists
    result = await db.execute(select(Device).where(Device.device_id == data.device_id))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Device already registered")
        
    device = Device(
        device_id=data.device_id,
        pond_id=data.pond_id,
        name=data.name
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return device

@router.get("/devices", response_model=List[DeviceResponse])
async def list_devices(db: AsyncSession = Depends(get_db)):
    """List all registered IoT devices."""
    result = await db.execute(select(Device).order_by(Device.created_at.desc()))
    return result.scalars().all()

@router.post("/telemetry", response_model=SensorReadingResponse, status_code=status.HTTP_201_CREATED)
async def ingest_telemetry(data: SensorReadingCreate, db: AsyncSession = Depends(get_db)):
    """Ingest a new telemetry reading from an IoT device."""
    # Find device
    result = await db.execute(select(Device).where(Device.device_id == data.device_id))
    device = result.scalar_one_or_none()
    
    if not device:
        # Auto-register device if not found to make it easy to plug and play
        device = Device(device_id=data.device_id, name=f"Auto-registered {data.device_id}")
        db.add(device)
        await db.commit()
        await db.refresh(device)
        
    # Update device last_seen
    device.last_seen = datetime.utcnow()
    
    reading = SensorReading(
        device_id=device.id,
        pond_id=device.pond_id, # Can be null if device is not assigned to a pond yet
        temperature_c=data.temperature_c,
        ph=data.ph,
        dissolved_oxygen=data.dissolved_oxygen,
        ammonia=data.ammonia
    )
    
    db.add(reading)
    await db.commit()
    await db.refresh(reading)
    return reading

@router.get("/ponds/{pond_id}/latest-telemetry", response_model=SensorReadingResponse)
async def get_latest_pond_telemetry(pond_id: str, db: AsyncSession = Depends(get_db)):
    """Get the latest telemetry reading for a specific pond."""
    result = await db.execute(
        select(SensorReading)
        .where(SensorReading.pond_id == pond_id)
        .order_by(SensorReading.timestamp.desc())
        .limit(1)
    )
    reading = result.scalar_one_or_none()
    
    if not reading:
        raise HTTPException(status_code=404, detail="No telemetry found for this pond")
        
    return reading
