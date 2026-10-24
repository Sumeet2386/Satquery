"""SatQuery AI — Analysis Job ORM Model."""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Float, Integer, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Job state
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="pending", index=True
        # pending | validating | preprocessing | inferring | explaining | done | failed
    )
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    warnings: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)

    # User inputs
    query: Mapped[str] = mapped_column(Text, nullable=False)
    model_id: Mapped[str] = mapped_column(String(100), nullable=False, default="changeformer")

    # Results
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    limitations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    regions_detected: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    confidence_mean: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    change_geojson: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Provenance
    provenance: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Timing
    elapsed_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    image_uploads: Mapped[list["ImageUpload"]] = relationship(
        "ImageUpload", back_populates="analysis", cascade="all, delete-orphan"
    )
    spatial_results: Mapped[list["SpatialResult"]] = relationship(
        "SpatialResult", back_populates="analysis", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Analysis id={self.id} status={self.status}>"
