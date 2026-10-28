import os
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_FILE = (BACKEND_DIR / "bizlens.db").resolve().as_posix()
DEFAULT_STORAGE_DIR = str((BACKEND_DIR / "storage").resolve())


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Application
    APP_ENV: str = "development"
    APP_NAME: str = "BizLens"
    SECRET_KEY: str = "default_insecure_secret_key_change_in_production"
    PORT: int = 8000
    FRONTEND_PORT: int = 5173

    # Database & Storage (Absolute paths so server never breaks based on cwd)
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_FILE}"
    STORAGE_ROOT: str = DEFAULT_STORAGE_DIR

    # Ingestion & Upload Security
    MAX_UPLOAD_MB: int = 50
    MAX_ROWS: int = 1000000
    MAX_COLS: int = 200
    MAX_SHEETS: int = 20
    MAX_CELL_CHARS: int = 10000
    MAX_DECOMPRESSED_MB: int = 200
    MAX_COMPRESSION_RATIO: int = 10

    # Auth & Security
    ACCESS_TOKEN_MINUTES: int = 15
    REFRESH_TOKEN_DAYS: int = 30
    LOGIN_MAX_ATTEMPTS: int = 5
    LOCKOUT_MINUTES: int = 15

    # Rate Limiting
    RATE_LIMIT_DEFAULT: str = "100/minute"
    RATE_LIMIT_AUTH: str = "10/minute"
    RATE_LIMIT_UPLOAD: str = "5/minute"
    RATE_LIMIT_AI: str = "20/minute"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000,http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # AI & Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"
    GEMINI_TIMEOUT_S: int = 30
    GEMINI_DAILY_TOKEN_BUDGET: int = 1000000
    AI_CACHE_TTL_S: int = 86400

    # Live Data
    LIVE_ALLOWED_HOSTS: str = "api.frankfurter.app,api.open-meteo.com"
    LIVE_CACHE_TTL_S: int = 3600

    @property
    def live_allowed_host_list(self) -> List[str]:
        return [h.strip() for h in self.LIVE_ALLOWED_HOSTS.split(",") if h.strip()]

    # Fiscal & Locale
    FISCAL_YEAR_START_MONTH_DEFAULT: int = 4
    DEFAULT_CURRENCY: str = "INR"

    # Sentry / Telemetry
    SENTRY_DSN: str = ""

    # Feature Flags
    FEATURE_FLAGS: str = ""


settings = Settings()
