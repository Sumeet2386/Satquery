"""SatQuery AI — Application Configuration using Pydantic Settings."""

from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_ENV: str = "development"
    APP_NAME: str = "SatQuery AI"
    APP_VERSION: str = "0.1.0"
    APP_SECRET_KEY: str = "dev-secret-change-in-production"
    DEBUG: bool = True

    # Server
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://satquery:satquery_dev@localhost:5432/satquery_db"
    DATABASE_URL_SYNC: str = "postgresql://satquery:satquery_dev@localhost:5432/satquery_db"

    # Storage
    STORAGE_BACKEND: str = "local"
    STORAGE_LOCAL_DIR: str = "./storage/uploads"
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY_ID: str = "minioadmin"
    S3_SECRET_ACCESS_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "satquery-uploads"
    S3_REGION: str = "us-east-1"

    # Auth
    JWT_SECRET_KEY: str = "dev-jwt-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI / LLM
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    EXPLANATION_MODEL: str = "gpt-4o"

    # Model Inference
    MODEL_REGISTRY_PATH: str = "./ml/registry/models.json"
    DEFAULT_CHANGE_DETECTION_MODEL: str = "changeformer"
    INFERENCE_DEVICE: str = "cpu"
    MODEL_CACHE_DIR: str = "./ml/model_cache"
    MAX_INFERENCE_WORKERS: int = 2

    # Image Validation
    MAX_UPLOAD_SIZE_MB: int = 500
    SUPPORTED_FORMATS: List[str] = ["tif", "tiff", "jp2"]
    MAX_RESOLUTION_RATIO: float = 4.0
    MIN_OVERLAP_RATIO: float = 0.8

    # Job Queue
    MAX_CONCURRENT_JOBS: int = 5
    JOB_TIMEOUT_SECONDS: int = 600

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
