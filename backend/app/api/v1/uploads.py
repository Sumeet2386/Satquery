"""SatQuery AI — File Upload API Endpoints."""

import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user

logger = structlog.get_logger(__name__)
router = APIRouter()

STORAGE_DIR = Path(settings.STORAGE_LOCAL_DIR)


class UploadResponse(BaseModel):
    upload_id: str
    filename: str
    size_mb: float
    message: str


@router.post("", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(..., description="Satellite image file (GeoTIFF or JPEG2000)"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Upload a satellite image for analysis.

    Accepted formats: GeoTIFF (.tif, .tiff), JPEG2000 (.jp2)
    Maximum size: 500 MB
    """
    # Validate file extension
    ext = Path(file.filename).suffix.lower().lstrip(".")
    if ext not in settings.SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Unsupported file type '.{ext}'. "
                f"Accepted formats: {', '.join('.' + f for f in settings.SUPPORTED_FORMATS)}"
            ),
        )

    upload_id = str(uuid.uuid4())
    user_dir = STORAGE_DIR / str(current_user.id) / upload_id
    user_dir.mkdir(parents=True, exist_ok=True)
    dest_path = user_dir / file.filename

    # Stream to disk, checking size
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    total = 0
    try:
        with open(dest_path, "wb") as f:
            while chunk := await file.read(65536):
                total += len(chunk)
                if total > max_bytes:
                    dest_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=(
                            f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB limit. "
                            "Please crop or resample the image before uploading."
                        ),
                    )
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}") from e

    size_mb = total / (1024 * 1024)
    logger.info(
        "Image uploaded",
        upload_id=upload_id,
        filename=file.filename,
        size_mb=f"{size_mb:.1f}",
        user=str(current_user.id),
    )

    # TODO: Persist upload record to database

    return UploadResponse(
        upload_id=upload_id,
        filename=file.filename,
        size_mb=round(size_mb, 2),
        message="Image uploaded successfully. Use the upload_id when creating an analysis.",
    )
