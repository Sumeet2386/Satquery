"""SatQuery AI — Analyses API Endpoints.

POST   /api/v1/analyses          Create a new analysis job
GET    /api/v1/analyses          List the current user's analyses
GET    /api/v1/analyses/{id}     Get job status and results
DELETE /api/v1/analyses/{id}     Delete an analysis
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
import structlog

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings

logger = structlog.get_logger(__name__)
router = APIRouter()


# ── Request / Response schemas ──────────────────────────────────────────────

class CreateAnalysisRequest(BaseModel):
    image_a_upload_id: str = Field(..., description="Upload ID for image A (earlier/reference)")
    image_b_upload_id: str = Field(..., description="Upload ID for image B (later/target)")
    query: str = Field(..., min_length=3, max_length=500, description="Natural-language question")
    model_id: str = Field(default="changeformer", description="Change detection model to use")


class AnalysisStatusResponse(BaseModel):
    job_id: str
    status: str
    query: str
    model_id: str
    created_at: str
    updated_at: str
    error: Optional[str] = None
    warnings: List[str] = []
    elapsed_seconds: Optional[float] = None
    explanation: Optional[str] = None
    limitations: Optional[str] = None
    change_geojson: Optional[dict] = None
    provenance: Optional[dict] = None


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_202_ACCEPTED, response_model=AnalysisStatusResponse)
async def create_analysis(
    payload: CreateAnalysisRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Create a new change-detection analysis job.

    The job is queued immediately and processed asynchronously.
    Poll GET /analyses/{job_id} for status updates.
    """
    job_id = str(uuid.uuid4())
    logger.info(
        "Analysis job created",
        job_id=job_id,
        model=payload.model_id,
        user=str(current_user.id),
    )

    # In a full implementation, this persists to DB and queues the job.
    # For now, return the accepted job structure.
    background_tasks.add_task(
        _run_analysis_background,
        job_id=job_id,
        payload=payload,
        user_id=str(current_user.id),
    )

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()

    return AnalysisStatusResponse(
        job_id=job_id,
        status="pending",
        query=payload.query,
        model_id=payload.model_id,
        created_at=now,
        updated_at=now,
    )


@router.get("", response_model=List[AnalysisStatusResponse])
async def list_analyses(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List the authenticated user's analyses, most recent first."""
    # TODO: Query from database
    return []


@router.get("/{job_id}", response_model=AnalysisStatusResponse)
async def get_analysis(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get the current status and results of an analysis job."""
    # TODO: Retrieve from database, check ownership
    raise HTTPException(status_code=404, detail=f"Analysis {job_id} not found")


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete an analysis and its associated results."""
    # TODO: Soft-delete from database, mark storage for cleanup
    raise HTTPException(status_code=404, detail=f"Analysis {job_id} not found")


# ── Background task ─────────────────────────────────────────────────────────

async def _run_analysis_background(job_id: str, payload: CreateAnalysisRequest, user_id: str):
    """Background task that runs the full analysis pipeline."""
    logger.info("Background analysis started", job_id=job_id, user=user_id)
    # TODO: Resolve upload paths, instantiate orchestrator, run pipeline, persist results
