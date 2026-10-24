"""SatQuery AI — Image Upload ORM Model."""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Float, Integer, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class ImageUpload(Base):
    __tablename__ = "image_uploads"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    analysis_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("analyses.id", ondelete="SET NULL"), nullable=True
    )

    # File metadata
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(1000), nullable=False)
    size_mb: Mapped[float] = mapped_column(Float, nullable=False)
    file_format: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # GTiff, JP2

    # Spatial metadata (populated after validation)
    crs_epsg: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    crs_wkt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolution_x: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    resolution_y: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    width_px: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height_px: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    band_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    bounds_geojson: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    acquired_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Validation result
    validation_passed: Mapped[Optional[bool]] = mapped_column(nullable=True)
    validation_errors: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Role in analysis pair
    role: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # "a" or "b"

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship
    analysis: Mapped[Optional["Analysis"]] = relationship(
        "Analysis", back_populates="image_uploads"
    )

    def __repr__(self) -> str:
        return f"<ImageUpload id={self.id} file={self.filename}>"
