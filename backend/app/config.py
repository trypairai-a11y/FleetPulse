from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # Database - async URL for app (uses fleetpulse_app role, subject to RLS)
    DATABASE_URL: str = "postgresql+asyncpg://fleetpulse_app:fleetpulse_app_dev@localhost:5432/fleetpulse"
    # Database - sync URL for Alembic (uses fleetpulse owner role, bypasses RLS)
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://fleetpulse:fleetpulse_dev@localhost:5432/fleetpulse"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: str = '["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"]'

    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.CORS_ORIGINS)

    # AI
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"

    # S3 Storage (optional — local fallback if unset)
    S3_ENDPOINT: str = ""
    S3_BUCKET: str = "fleetpulse-media"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_REGION: str = "me-south-1"

    # Debug
    DEBUG: bool = True

    model_config = {"env_file": "../.env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
