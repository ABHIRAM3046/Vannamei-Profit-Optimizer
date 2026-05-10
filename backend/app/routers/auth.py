"""
Authentication router — OTP-based phone authentication.
In development, OTP is always '123456'. In production, integrate with SMS gateway.
"""
import random
import string
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt

from app.database import get_db
from app.config import settings
from app.models import User
from app.schemas import OTPRequest, OTPVerify, TokenResponse, UserResponse, UserUpdate

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ─── Development mode: fixed OTP ───
DEV_OTP = "123456"
IS_DEV = True  # Set to False in production


def generate_otp() -> str:
    """Generate a 6-digit OTP."""
    if IS_DEV:
        return DEV_OTP
    return "".join(random.choices(string.digits, k=6))


def create_access_token(user_id: str) -> str:
    """Create a JWT token."""
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(
    token: str = Depends(lambda: None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency: extract user from JWT token."""
    # This will be overridden in main.py with proper header extraction
    pass


@router.post("/request-otp", summary="Request OTP for phone login")
async def request_otp(data: OTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Send OTP to the given phone number.
    Creates user if first time.
    In dev mode, OTP is always '123456'.
    """
    # Find or create user
    result = await db.execute(select(User).where(User.phone == data.phone))
    user = result.scalar_one_or_none()

    if not user:
        user = User(phone=data.phone)
        db.add(user)

    # Set OTP
    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(seconds=settings.OTP_EXPIRY_SECONDS)
    await db.commit()

    # In production: send OTP via SMS (Twilio/MSG91)
    return {
        "message": f"OTP sent to {data.phone}",
        "dev_otp": otp if IS_DEV else None,  # Only in development
    }


@router.post("/verify-otp", response_model=TokenResponse, summary="Verify OTP and get token")
async def verify_otp(data: OTPVerify, db: AsyncSession = Depends(get_db)):
    """Verify OTP and return JWT access token."""
    result = await db.execute(select(User).where(User.phone == data.phone))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found. Request OTP first.")

    if user.otp_code != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP.")

    if user.otp_expires_at and user.otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired. Request a new one.")

    # Clear OTP
    user.otp_code = None
    user.otp_expires_at = None
    await db.commit()
    await db.refresh(user)

    # Generate token
    token = create_access_token(user.id)

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.put("/profile", response_model=UserResponse, summary="Update user profile")
async def update_profile(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = None,  # Will be injected by auth middleware
):
    """Update the current user's profile (name, farm name)."""
    # For now, accept user_id as query param (simplified auth)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.name is not None:
        user.name = data.name
    if data.farm_name is not None:
        user.farm_name = data.farm_name

    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)
