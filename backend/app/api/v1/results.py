"""SatQuery AI — Results API (GeoJSON map layers, reports)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.database import get_db
from app.core.security import get_current_user

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/{result_id}/map")
async def get_change_map(
    result_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return the GeoJSON change layer for a completed analysis result."""
    # TODO: Retrieve from storage, check ownership
    raise HTTPException(status_code=404, detail=f"Result {result_id} not found")


@router.get("/{result_id}/report")
async def get_report(
    result_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Download the analysis report (JSON) for a completed result."""
    # TODO: Generate and stream report
    raise HTTPException(status_code=404, detail=f"Result {result_id} not found")
