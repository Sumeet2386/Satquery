"""SatQuery AI — Results API (GeoJSON map layers, reports)."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import structlog

from app.api.v1.analyses import JOBS_STORE

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/{result_id}/map")
async def get_change_map(result_id: str):
    """Return the GeoJSON change layer for a completed analysis result."""
    if result_id not in JOBS_STORE:
        raise HTTPException(status_code=404, detail=f"Result {result_id} not found")

    job = JOBS_STORE[result_id]
    if not job.get("change_geojson"):
        raise HTTPException(
            status_code=400,
            detail=f"Analysis {result_id} is in status '{job.get('status')}' and has no change map yet.",
        )

    return JSONResponse(content=job["change_geojson"])


@router.get("/{result_id}/report")
async def get_report(result_id: str):
    """Download the analysis report (JSON) for a completed result."""
    if result_id not in JOBS_STORE:
        raise HTTPException(status_code=404, detail=f"Result {result_id} not found")

    job = JOBS_STORE[result_id]
    report_data = {
        "report_id": f"REP-{result_id[:8].upper()}",
        "title": "SatQuery AI — Satellite Change Detection Report",
        "analysis": job,
        "provenance": job.get("provenance", {}),
    }

    return JSONResponse(
        content=report_data,
        headers={
            "Content-Disposition": f'attachment; filename="satquery_report_{result_id}.json"'
        },
    )
