"""SatQuery AI — API v1 Router (aggregates all sub-routers)."""

from fastapi import APIRouter
from app.api.v1 import auth, analyses, uploads, results

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
router.include_router(analyses.router, prefix="/analyses", tags=["analyses"])
router.include_router(results.router, prefix="/results", tags=["results"])
