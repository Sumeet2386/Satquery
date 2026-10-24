"""SatQuery AI — Raster Preprocessing Pipeline.

Handles reprojection, resampling, co-registration, and normalisation
of image pairs before they are passed to change-detection models.
All operations are non-destructive — originals are never modified.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple
import tempfile
import structlog

logger = structlog.get_logger(__name__)

try:
    import numpy as np
    import rasterio
    from rasterio.crs import CRS
    from rasterio.enums import Resampling
    from rasterio.warp import calculate_default_transform, reproject
    from rasterio.merge import merge as rasterio_merge
    RASTERIO_AVAILABLE = True
except ImportError:
    RASTERIO_AVAILABLE = False


@dataclass
class PreprocessedPair:
    """Result of preprocessing an image pair, ready for model inference."""
    image_a_path: str          # Path to processed image A (temp file)
    image_b_path: str          # Path to processed image B (temp file)
    target_crs_epsg: int       # Common CRS used for both images
    resolution_m: float        # Common resolution in metres
    width: int
    height: int
    bounds_wgs84: Tuple[float, float, float, float]
    preprocessing_log: list[str]  # Human-readable record of operations applied


class RasterPreprocessor:
    """
    Preprocesses satellite image pairs for change detection.

    Operations:
    1. Reproject both images to a common CRS
    2. Resample both to the same resolution (coarser of the two)
    3. Clip to shared spatial extent
    4. Normalise pixel values to [0, 1] per band
    5. Ensure identical array dimensions

    All intermediate files are written to a temp directory.
    Caller is responsible for cleanup.
    """

    TARGET_RESAMPLING = Resampling.bilinear

    def preprocess_pair(
        self,
        path_a: str,
        path_b: str,
        target_crs_epsg: Optional[int] = None,
        output_dir: Optional[str] = None,
    ) -> PreprocessedPair:
        """
        Preprocess two satellite images into a compatible pair.

        Args:
            path_a: Path to image A (earlier / reference)
            path_b: Path to image B (later / target)
            target_crs_epsg: Override target CRS. If None, uses image A's CRS.
            output_dir: Directory for processed files. Uses tempdir if None.

        Returns:
            PreprocessedPair with paths to aligned, normalised images.

        Raises:
            ValueError: If preprocessing fails due to incompatible inputs.
            RuntimeError: If rasterio is not available.
        """
        if not RASTERIO_AVAILABLE:
            raise RuntimeError(
                "rasterio is not installed. Run: pip install rasterio"
            )

        out_dir = Path(output_dir) if output_dir else Path(tempfile.mkdtemp(prefix="satquery_prep_"))
        out_dir.mkdir(parents=True, exist_ok=True)
        log = []

        with rasterio.open(path_a) as src_a, rasterio.open(path_b) as src_b:
            # Determine target CRS
            if target_crs_epsg:
                target_crs = CRS.from_epsg(target_crs_epsg)
                log.append(f"Using specified target CRS: EPSG:{target_crs_epsg}")
            else:
                target_crs = src_a.crs
                target_crs_epsg = src_a.crs.to_epsg()
                log.append(f"Target CRS set to image A's CRS: EPSG:{target_crs_epsg}")

            # Determine target resolution (coarser of the two)
            res_a = abs(src_a.transform.a)
            res_b = abs(src_b.transform.a)
            target_res = max(res_a, res_b)
            log.append(
                f"Target resolution: {target_res:.2f}m "
                f"(A: {res_a:.2f}m, B: {res_b:.2f}m — using coarser)"
            )

            # Reproject and resample A
            path_a_proc = str(out_dir / "image_a_processed.tif")
            self._reproject_image(src_a, path_a_proc, target_crs, target_res)
            log.append(f"Image A reprojected and resampled → {path_a_proc}")

            # Reproject and resample B
            path_b_proc = str(out_dir / "image_b_processed.tif")
            self._reproject_image(src_b, path_b_proc, target_crs, target_res)
            log.append(f"Image B reprojected and resampled → {path_b_proc}")

        # Clip to common extent
        path_a_clipped = str(out_dir / "image_a_clipped.tif")
        path_b_clipped = str(out_dir / "image_b_clipped.tif")
        bounds = self._clip_to_common_extent(path_a_proc, path_b_proc, path_a_clipped, path_b_clipped)
        log.append(f"Both images clipped to common extent: {bounds}")

        # Normalise
        path_a_norm = str(out_dir / "image_a_norm.tif")
        path_b_norm = str(out_dir / "image_b_norm.tif")
        self._normalise(path_a_clipped, path_a_norm)
        self._normalise(path_b_clipped, path_b_norm)
        log.append("Pixel values normalised to [0, 1] per band")

        # Get final dimensions
        with rasterio.open(path_a_norm) as final:
            width, height = final.width, final.height

        return PreprocessedPair(
            image_a_path=path_a_norm,
            image_b_path=path_b_norm,
            target_crs_epsg=target_crs_epsg,
            resolution_m=target_res,
            width=width,
            height=height,
            bounds_wgs84=bounds,
            preprocessing_log=log,
        )

    def _reproject_image(
        self, src: "rasterio.DatasetReader", dst_path: str, target_crs: "CRS", target_res: float
    ) -> None:
        """Reproject and resample a rasterio dataset to target CRS and resolution."""
        transform, width, height = calculate_default_transform(
            src.crs, target_crs, src.width, src.height, *src.bounds, resolution=target_res
        )
        kwargs = src.meta.copy()
        kwargs.update({"crs": target_crs, "transform": transform, "width": width, "height": height})

        with rasterio.open(dst_path, "w", **kwargs) as dst:
            for i in range(1, src.count + 1):
                reproject(
                    source=rasterio.band(src, i),
                    destination=rasterio.band(dst, i),
                    src_transform=src.transform,
                    src_crs=src.crs,
                    dst_transform=transform,
                    dst_crs=target_crs,
                    resampling=self.TARGET_RESAMPLING,
                )

    def _clip_to_common_extent(
        self, path_a: str, path_b: str, out_a: str, out_b: str
    ) -> Tuple[float, float, float, float]:
        """Clip both images to their intersection and return WGS84 bounds."""
        from rasterio.warp import transform_bounds

        with rasterio.open(path_a) as ds_a, rasterio.open(path_b) as ds_b:
            # Intersection in the shared CRS
            west = max(ds_a.bounds.left, ds_b.bounds.left)
            south = max(ds_a.bounds.bottom, ds_b.bounds.bottom)
            east = min(ds_a.bounds.right, ds_b.bounds.right)
            north = min(ds_a.bounds.top, ds_b.bounds.top)

            from rasterio.windows import from_bounds
            for src, out_path in [(ds_a, out_a), (ds_b, out_b)]:
                window = from_bounds(west, south, east, north, src.transform)
                data = src.read(window=window)
                transform = src.window_transform(window)
                meta = src.meta.copy()
                meta.update({
                    "width": data.shape[2],
                    "height": data.shape[1],
                    "transform": transform,
                })
                with rasterio.open(out_path, "w", **meta) as dst:
                    dst.write(data)

            bounds_wgs84 = transform_bounds(ds_a.crs, "EPSG:4326", west, south, east, north)
        return bounds_wgs84

    def _normalise(self, src_path: str, dst_path: str) -> None:
        """Normalise pixel values to [0, 1] per band using 2nd/98th percentile stretch."""
        import numpy as np

        with rasterio.open(src_path) as src:
            meta = src.meta.copy()
            meta["dtype"] = "float32"
            with rasterio.open(dst_path, "w", **meta) as dst:
                for i in range(1, src.count + 1):
                    band = src.read(i).astype(np.float32)
                    nodata = src.nodata
                    if nodata is not None:
                        mask = band != nodata
                    else:
                        mask = np.ones_like(band, dtype=bool)

                    if mask.any():
                        p2 = np.percentile(band[mask], 2)
                        p98 = np.percentile(band[mask], 98)
                        band = np.clip((band - p2) / max(p98 - p2, 1e-6), 0, 1)

                    dst.write(band, i)
