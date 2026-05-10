"""
SQLAlchemy ORM models for the Vannamei Shrimp Profit Optimizer.
"""
import uuid
from datetime import datetime, date

from sqlalchemy import (
    Column, String, Float, Integer, Boolean, Text, Date, DateTime,
    ForeignKey, Enum as SAEnum, UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    phone = Column(String(15), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=True)
    farm_name = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # OTP fields (stored temporarily)
    otp_code = Column(String(6), nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)

    # Relationships
    ponds = relationship("Pond", back_populates="owner", cascade="all, delete-orphan")


class Pond(Base):
    __tablename__ = "ponds"

    id = Column(String, primary_key=True, default=generate_uuid)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    area_m2 = Column(Float, nullable=False)
    stocking_date = Column(Date, nullable=False)
    pl_stocked = Column(Integer, nullable=False)
    salinity_ppt = Column(Float, nullable=True, default=15.0)
    feed_type = Column(String(100), nullable=True, default="Standard Pellet")
    feed_cost_per_kg = Column(Float, nullable=False, default=65.0)
    selling_price_per_kg = Column(Float, nullable=False, default=350.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="ponds")
    daily_logs = relationship("DailyLog", back_populates="pond", cascade="all, delete-orphan",
                              order_by="DailyLog.log_date")
    alerts = relationship("Alert", back_populates="pond", cascade="all, delete-orphan",
                          order_by="Alert.created_at.desc()")


class DailyLog(Base):
    __tablename__ = "daily_logs"
    __table_args__ = (
        UniqueConstraint("pond_id", "log_date", name="uq_pond_date"),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    pond_id = Column(String, ForeignKey("ponds.id"), nullable=False)
    log_date = Column(Date, nullable=False)
    doc = Column(Integer, nullable=False)  # Day of Culture

    # Core inputs
    feed_given_kg = Column(Float, nullable=False, default=0.0)
    avg_body_weight_g = Column(Float, nullable=True)  # ABW from sampling
    mortality_count = Column(Integer, nullable=False, default=0)

    # Water parameters
    dissolved_oxygen = Column(Float, nullable=True)  # mg/L
    ph = Column(Float, nullable=True)
    ammonia = Column(Float, nullable=True)  # mg/L
    temperature_c = Column(Float, nullable=True)  # °C

    # Calculated fields (auto-filled by backend)
    cumulative_feed_kg = Column(Float, nullable=True)
    cumulative_mortality = Column(Integer, nullable=True)
    surviving_count = Column(Integer, nullable=True)
    survival_rate = Column(Float, nullable=True)  # percentage
    biomass_kg = Column(Float, nullable=True)
    fcr = Column(Float, nullable=True)
    adg = Column(Float, nullable=True)  # g/day

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    pond = relationship("Pond", back_populates="daily_logs")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=generate_uuid)
    pond_id = Column(String, ForeignKey("ponds.id"), nullable=False)
    alert_date = Column(Date, nullable=False, default=date.today)
    severity = Column(String(20), nullable=False, default="info")  # info, warning, critical
    category = Column(String(50), nullable=False)  # feed, disease, water, harvest, growth
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    pond = relationship("Pond", back_populates="alerts")


class MarketPrice(Base):
    __tablename__ = "market_prices"

    id = Column(String, primary_key=True, default=generate_uuid)
    date_recorded = Column(Date, nullable=False, default=date.today)
    count_per_kg = Column(Integer, nullable=False) # 10, 20, 30... 100
    price_per_kg = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
