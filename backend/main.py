"""
SatQuery AI — Backend Application Entry Point
FastAPI application factory with all routers, middleware, and startup hooks.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import structlog

from app.core.config import settings
from app.core.database import init_db
from app.core.logging import setup_logging
from app.api.v1 import router as api_v1_router
from app.api.health import router as health_router

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle manager."""
    # Startup
    setup_logging()
    logger.info("SatQuery AI starting up", version=settings.APP_VERSION, env=settings.APP_ENV)
    await init_db()
    logger.info("Database initialised")
    yield
    # Shutdown
    logger.info("SatQuery AI shutting down")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="SatQuery AI",
        description=(
            "Agentic multimodal satellite-image analysis platform. "
            "Upload satellite imagery, ask questions in natural language, "
            "and receive AI-assisted analysis with visual evidence."
        ),
        version=settings.APP_VERSION,
        docs_url="/api/docs" if settings.DEBUG else None,
        redoc_url="/api/redoc" if settings.DEBUG else None,
        openapi_url="/api/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # ── Middleware ─────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # ── Routers ───────────────────────────────────────────────────────────
    app.include_router(health_router, prefix="/api", tags=["health"])
    app.include_router(api_v1_router, prefix="/api/v1")

    # ── Exception handlers ────────────────────────────────────────────────
    @app.exception_handler(404)
    async def not_found_handler(request, exc):
        return JSONResponse(status_code=404, content={"detail": "Resource not found"})

    @app.exception_handler(500)
    async def internal_error_handler(request, exc):
        logger.error("Unhandled internal error", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal error occurred. Please try again or contact support."},
        )

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
