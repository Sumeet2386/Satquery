"""SatQuery AI — Analysis Service (data access layer for Analysis model)."""

import uuid
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import structlog

from app.models.analysis import Analysis

logger = structlog.get_logger(__name__)


class AnalysisService:
    """Handles all database operations for Analysis job records."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: str,
        query: str,
        model_id: str = "changeformer",
    ) -> Analysis:
        analysis = Analysis(
            user_id=uuid.UUID(user_id),
            query=query,
            model_id=model_id,
            status="pending",
        )
        self.db.add(analysis)
        await self.db.flush()
        logger.info("Analysis created", job_id=str(analysis.id), model=model_id)
        return analysis

    async def get_by_id(self, job_id: str, user_id: str) -> Optional[Analysis]:
        """Retrieve an analysis job, scoped to the owning user."""
        result = await self.db.execute(
            select(Analysis).where(
                Analysis.id == uuid.UUID(job_id),
                Analysis.user_id == uuid.UUID(user_id),
            )
        )
        return result.scalar_one_or_none()

    async def list_for_user(
        self, user_id: str, limit: int = 20, offset: int = 0
    ) -> List[Analysis]:
        result = await self.db.execute(
            select(Analysis)
            .where(Analysis.user_id == uuid.UUID(user_id))
            .order_by(desc(Analysis.created_at))
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def update_status(
        self,
        job_id: str,
        status: str,
        error: Optional[str] = None,
    ) -> Optional[Analysis]:
        result = await self.db.execute(
            select(Analysis).where(Analysis.id == uuid.UUID(job_id))
        )
        analysis = result.scalar_one_or_none()
        if analysis:
            analysis.status = status
            analysis.error = error
            analysis.updated_at = datetime.now(timezone.utc)
            await self.db.flush()
        return analysis

    async def save_results(
        self,
        job_id: str,
        explanation: str,
        limitations: str,
        change_geojson: dict,
        regions_detected: int,
        confidence_mean: float,
        elapsed_seconds: float,
        provenance: dict,
        warnings: List[str],
    ) -> Optional[Analysis]:
        result = await self.db.execute(
            select(Analysis).where(Analysis.id == uuid.UUID(job_id))
        )
        analysis = result.scalar_one_or_none()
        if analysis:
            analysis.status = "done"
            analysis.explanation = explanation
            analysis.limitations = limitations
            analysis.change_geojson = change_geojson
            analysis.regions_detected = regions_detected
            analysis.confidence_mean = confidence_mean
            analysis.elapsed_seconds = elapsed_seconds
            analysis.provenance = provenance
            analysis.warnings = warnings
            analysis.updated_at = datetime.now(timezone.utc)
            await self.db.flush()
            logger.info("Analysis results saved", job_id=job_id)
        return analysis

    async def delete(self, job_id: str, user_id: str) -> bool:
        """Soft delete — mark as deleted. Returns True if found and deleted."""
        analysis = await self.get_by_id(job_id, user_id)
        if analysis:
            await self.db.delete(analysis)
            await self.db.flush()
            return True
        return False
