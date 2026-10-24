"""SatQuery AI — Spatial Result ORM Model.

Stores individual change polygons produced by change-detection inference,
with geometry stored as GeoJSON for portability.
PostGIS geometry columns can be added in a later migration once PostGIS is confirmed.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class SpatialResult(Base):
    __tablename__ = "spatial_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    analysis_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("analyses.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    # Geometry (GeoJSON polygon as JSON column — upgrade to PostGIS geometry later)
    geometry: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Change attributes
    change_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    area_sqm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    model_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Provenance
    change_mask_s3_key: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    threshold_used: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship
    analysis: Mapped["Analysis"] = relationship(
        "Analysis", back_populates="spatial_results"
    )

    def __repr__(self) -> str:
        return f"<SpatialResult id={self.id} confidence={self.confidence}>"
