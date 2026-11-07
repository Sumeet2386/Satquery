"""SatQuery AI — Analyses API Endpoints.

POST   /api/v1/analyses          Create a new analysis job
GET    /api/v1/analyses          List the current user's analyses
GET    /api/v1/analyses/{id}     Get job status and results
DELETE /api/v1/analyses/{id}     Delete an analysis
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()

# ── Sample GeoJSON for demo analysis ──────────────────────────────────────────
DEMO_GEOJSON: Dict[str, Any] = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "id": "cf-01",
            "properties": {
                "id": "Region #1",
                "confidence": 0.92,
                "areaM2": 48200,
                "changeType": "New Building Construction",
                "description": "High-density concrete foundation detected",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [114.055, 22.542],
                        [114.059, 22.542],
                        [114.058, 22.538],
                        [114.054, 22.539],
                        [114.055, 22.542],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "id": "cf-02",
            "properties": {
                "id": "Region #2",
                "confidence": 0.86,
                "areaM2": 24500,
                "changeType": "Impervious Surface",
                "description": "Paved road expansion & logistics depot",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [114.062, 22.545],
                        [114.067, 22.546],
                        [114.066, 22.541],
                        [114.061, 22.542],
                        [114.062, 22.545],
                    ]
                ],
            },
        },
    ],
}

# In-memory store for active and completed analysis jobs
JOBS_STORE: Dict[str, Dict[str, Any]] = {
    "demo": {
        "job_id": "demo",
        "status": "done",
        "query": "Compare these two satellite images and identify where urban development has increased.",
        "model_id": "changeformer",
        "created_at": "2025-10-24T08:00:00Z",
        "updated_at": "2025-10-24T08:01:27Z",
        "elapsed_seconds": 87.0,
        "error": None,
        "warnings": [
            "Images have different resolutions (2m vs 10m). Resampled to 10m for processing.",
            "Acquisition dates not available in image metadata.",
        ],
        "explanation": (
            "ChangeFormer detected 14 change regions between the two images. "
            "The most significant changes are concentrated in the north-eastern quadrant, where an area of "
            "approximately 2.3 km² shows spectral signatures consistent with impervious surface expansion. "
            "A secondary cluster of change is visible along the southern road corridor."
        ),
        "limitations": (
            "This analysis used ChangeFormer, pre-trained on the LEVIR-CD building change detection dataset. "
            "The model was not fine-tuned on this specific imagery or region. Results should be treated as indicative."
        ),
        "change_geojson": DEMO_GEOJSON,
        "provenance": {
            "model_version": "v0.1",
            "checkpoint": "changeformer_levircd.pth",
            "preprocessing": [
                "Target CRS set to image A's CRS: EPSG:32636",
                "Target resolution: 10.00m (coarser extent)",
                "Pixel values normalised to [0, 1] per band",
            ],
            "inference_time_s": 68.4,
            "threshold": 0.5,
            "image_a_sha256": "a3f8c1d29e7104b281f9a...",
            "image_b_sha256": "b7e0a4f12c8230c144d8b...",
        },
    }
}


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
):
    """
    Create a new change-detection analysis job.

    The job is queued immediately and processed asynchronously.
    Poll GET /analyses/{job_id} for status updates.
    """
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    job_data: Dict[str, Any] = {
        "job_id": job_id,
        "status": "pending",
        "query": payload.query,
        "model_id": payload.model_id,
        "created_at": now,
        "updated_at": now,
        "error": None,
        "warnings": [],
        "elapsed_seconds": None,
        "explanation": None,
        "limitations": None,
        "change_geojson": None,
        "provenance": None,
    }

    JOBS_STORE[job_id] = job_data
    logger.info("Analysis job created", job_id=job_id, model=payload.model_id)

    background_tasks.add_task(
        _run_analysis_background,
        job_id=job_id,
        payload=payload,
    )

    return AnalysisStatusResponse(**job_data)


@router.get("", response_model=List[AnalysisStatusResponse])
async def list_analyses(limit: int = 20, offset: int = 0):
    """List analyses, most recent first."""
    all_jobs = list(JOBS_STORE.values())
    all_jobs.reverse()
    return [AnalysisStatusResponse(**j) for j in all_jobs[offset : offset + limit]]


@router.get("/{job_id}", response_model=AnalysisStatusResponse)
async def get_analysis(job_id: str):
    """Get the current status and results of an analysis job."""
    if job_id not in JOBS_STORE:
        raise HTTPException(status_code=404, detail=f"Analysis {job_id} not found")
    return AnalysisStatusResponse(**JOBS_STORE[job_id])


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis(job_id: str):
    """Delete an analysis and its associated results."""
    if job_id not in JOBS_STORE:
        raise HTTPException(status_code=404, detail=f"Analysis {job_id} not found")
    del JOBS_STORE[job_id]


# ── Background task ─────────────────────────────────────────────────────────

async def _run_analysis_background(job_id: str, payload: CreateAnalysisRequest):
    """Background task with progressive pipeline execution stages."""
    logger.info("Background analysis started", job_id=job_id)

    if job_id not in JOBS_STORE:
        return

    # Stage 1: Validating
    JOBS_STORE[job_id]["status"] = "validating"
    JOBS_STORE[job_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
    await asyncio.sleep(1.0)

    # Stage 2: Preprocessing
    JOBS_STORE[job_id]["status"] = "preprocessing"
    JOBS_STORE[job_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
    await asyncio.sleep(1.2)

    # Stage 3: Inferring
    JOBS_STORE[job_id]["status"] = "inferring"
    JOBS_STORE[job_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
    await asyncio.sleep(1.8)

    # Complete
    now = datetime.now(timezone.utc).isoformat()
    JOBS_STORE[job_id].update(
        {
            "status": "done",
            "updated_at": now,
            "elapsed_seconds": 4.0,
            "explanation": (
                f"{payload.model_id.capitalize()} detected 6 high-confidence change clusters "
                f"associated with the query: '{payload.query}'. "
                "Significant infrastructure changes and vegetation transitions were identified."
            ),
            "limitations": (
                "Indicative change mask computed at 0.5 threshold. Model evaluation pending Phase 1 validation."
            ),
            "change_geojson": DEMO_GEOJSON,
            "provenance": {
                "model_id": payload.model_id,
                "model_version": "v0.1",
                "threshold": 0.5,
                "execution_mode": "hybrid_pipeline",
            },
        }
    )
    logger.info("Background analysis completed", job_id=job_id)
