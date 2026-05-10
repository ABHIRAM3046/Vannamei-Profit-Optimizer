"""
Configuration settings loaded from environment variables.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./vannamei.db"
    SECRET_KEY: str = "vannamei-shrimp-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    OTP_EXPIRY_SECONDS: int = 300  # 5 minutes

    class Config:
        env_file = ".env"


settings = Settings()
