"""SatQuery AI — Image Validation and Geospatial Compatibility Checking.

All validation happens BEFORE model inference. Invalid inputs are rejected
with clear, actionable error messages—never passed to the model.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple
import structlog

logger = structlog.get_logger(__name__)

# Lazy imports to avoid load-time errors if rasterio/gdal not installed
try:
    import rasterio
    from rasterio.crs import CRS
    from rasterio.transform import array_bounds
    from rasterio.warp import transform_bounds
    import numpy as np
    RASTERIO_AVAILABLE = True
except ImportError:
    RASTERIO_AVAILABLE = False
    logger.warning("rasterio not available — image validation will be limited")


@dataclass
class ImageMetadata:
    """Extracted metadata from a satellite image file."""
    file_path: str
    file_size_mb: float
    format: str
    width: int
    height: int
    band_count: int
    crs_epsg: Optional[int]
    crs_wkt: Optional[str]
    resolution_x: float          # metres per pixel (x)
    resolution_y: float          # metres per pixel (y)
    bounds_wgs84: Tuple[float, float, float, float]  # (west, south, east, north)
    acquired_at: Optional[str]   # ISO date string from metadata if available
    driver: str


@dataclass
class CompatibilityReport:
    """Result of comparing two images for processing compatibility."""
    compatible: bool
    errors: list[str]
    warnings: list[str]
    overlap_ratio: float
    resolution_ratio: float
    same_crs: bool


class ImageValidator:
    """
    Validates satellite images against SatQuery AI's processing requirements.

    Rules enforced:
    - File must be GeoTIFF or JPEG2000
    - File must contain valid CRS and geotransform
    - File must not exceed configured size limit
    - For pairs: 80%+ spatial overlap, ≤4× resolution difference
    """

    SUPPORTED_DRIVERS = {"GTiff", "JP2OpenJPEG", "JP2ECW", "JP2KAK"}

    def __init__(self, max_size_mb: float = 500, min_overlap: float = 0.8, max_res_ratio: float = 4.0):
        self.max_size_mb = max_size_mb
        self.min_overlap = min_overlap
        self.max_res_ratio = max_res_ratio

    def validate_single(self, file_path: str) -> Tuple[bool, list[str], Optional[ImageMetadata]]:
        """
        Validate a single image file.
        Returns (is_valid, errors, metadata).
        """
        errors = []
        path = Path(file_path)

        # File existence and size
        if not path.exists():
            return False, [f"File not found: {file_path}"], None

        size_mb = path.stat().st_size / (1024 * 1024)
        if size_mb > self.max_size_mb:
            errors.append(
                f"File size {size_mb:.1f} MB exceeds the {self.max_size_mb} MB limit. "
                "Please crop or resample the image and retry."
            )

        if not RASTERIO_AVAILABLE:
            errors.append("Server-side geospatial libraries not installed. Contact support.")
            return False, errors, None

        try:
            with rasterio.open(file_path) as ds:
                # Driver check
                if ds.driver not in self.SUPPORTED_DRIVERS:
                    errors.append(
                        f"Unsupported file format (driver: {ds.driver}). "
                        "Please use GeoTIFF (.tif/.tiff) or JPEG2000 (.jp2)."
                    )

                # CRS check
                if ds.crs is None:
                    errors.append(
                        "Image has no coordinate reference system (CRS). "
                        "Please add spatial metadata and retry. "
                        "For GeoTIFF: use gdal_translate or QGIS to assign a CRS."
                    )
                    crs_epsg = None
                    crs_wkt = None
                else:
                    crs_epsg = ds.crs.to_epsg()
                    crs_wkt = ds.crs.to_wkt()

                # Geotransform check
                if ds.transform is None or ds.transform == rasterio.transform.IDENTITY:
                    errors.append(
                        "Image has no geotransform. "
                        "The file cannot be spatially located. Please geocode the image."
                    )

                # Resolution
                res_x = abs(ds.transform.a)
                res_y = abs(ds.transform.e)

                # Bounds in WGS84
                try:
                    bounds_wgs84 = transform_bounds(ds.crs, "EPSG:4326", *ds.bounds)
                except Exception:
                    bounds_wgs84 = (0.0, 0.0, 0.0, 0.0)
                    errors.append("Could not reproject image bounds to WGS84. CRS may be invalid.")

                # Acquisition date (from TIFF metadata if present)
                acquired_at = ds.tags().get("TIFFTAG_DATETIME") or ds.tags().get("DATE_ACQUIRED")

                metadata = ImageMetadata(
                    file_path=str(file_path),
                    file_size_mb=size_mb,
                    format=ds.driver,
                    width=ds.width,
                    height=ds.height,
                    band_count=ds.count,
                    crs_epsg=crs_epsg,
                    crs_wkt=crs_wkt,
                    resolution_x=res_x,
                    resolution_y=res_y,
                    bounds_wgs84=bounds_wgs84,
                    acquired_at=acquired_at,
                    driver=ds.driver,
                )

        except rasterio.errors.RasterioIOError as e:
            errors.append(f"Could not open image file: {e}. The file may be corrupt or unsupported.")
            return False, errors, None
        except Exception as e:
            logger.error("Unexpected error validating image", file=file_path, error=str(e))
            errors.append(f"Unexpected validation error: {e}")
            return False, errors, None

        is_valid = len(errors) == 0
        logger.info(
            "Image validation complete",
            file=path.name,
            valid=is_valid,
            errors=len(errors),
            size_mb=f"{size_mb:.1f}",
        )
        return is_valid, errors, metadata

    def check_pair_compatibility(
        self, meta_a: ImageMetadata, meta_b: ImageMetadata
    ) -> CompatibilityReport:
        """
        Check whether two images are compatible for change-detection processing.
        """
        errors = []
        warnings = []

        # CRS compatibility
        same_crs = meta_a.crs_epsg == meta_b.crs_epsg
        if not same_crs:
            warnings.append(
                f"Images have different CRS (Image A: EPSG:{meta_a.crs_epsg}, "
                f"Image B: EPSG:{meta_b.crs_epsg}). "
                "They will be reprojected to a common CRS automatically."
            )

        # Resolution ratio
        res_ratio = max(meta_a.resolution_x, meta_b.resolution_x) / max(
            min(meta_a.resolution_x, meta_b.resolution_x), 1e-9
        )
        if res_ratio > self.max_res_ratio:
            errors.append(
                f"Resolution difference is too large ({res_ratio:.1f}×). "
                f"The maximum allowed ratio is {self.max_res_ratio}×. "
                "Please resample one image to a compatible resolution."
            )
        elif res_ratio > 2.0:
            warnings.append(
                f"Resolution difference is {res_ratio:.1f}×. "
                "Results may be less accurate when resolutions differ significantly."
            )

        # Spatial overlap
        overlap_ratio = self._compute_overlap_ratio(
            meta_a.bounds_wgs84, meta_b.bounds_wgs84
        )
        if overlap_ratio < self.min_overlap:
            errors.append(
                f"Spatial overlap between images is only {overlap_ratio:.0%}, "
                f"but {self.min_overlap:.0%} is required. "
                "Please upload images that cover the same area."
            )

        compatible = len(errors) == 0
        return CompatibilityReport(
            compatible=compatible,
            errors=errors,
            warnings=warnings,
            overlap_ratio=overlap_ratio,
            resolution_ratio=res_ratio,
            same_crs=same_crs,
        )

    @staticmethod
    def _compute_overlap_ratio(
        bounds_a: Tuple[float, float, float, float],
        bounds_b: Tuple[float, float, float, float],
    ) -> float:
        """Compute intersection area / min(area_a, area_b) for two WGS84 bounding boxes."""
        west_a, south_a, east_a, north_a = bounds_a
        west_b, south_b, east_b, north_b = bounds_b

        inter_west = max(west_a, west_b)
        inter_south = max(south_a, south_b)
        inter_east = min(east_a, east_b)
        inter_north = min(north_a, north_b)

        if inter_east <= inter_west or inter_north <= inter_south:
            return 0.0

        inter_area = (inter_east - inter_west) * (inter_north - inter_south)
        area_a = (east_a - west_a) * (north_a - south_a)
        area_b = (east_b - west_b) * (north_b - south_b)
        min_area = min(area_a, area_b)

        return inter_area / max(min_area, 1e-12)
