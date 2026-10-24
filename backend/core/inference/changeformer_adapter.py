"""SatQuery AI — ChangeFormer Model Adapter.

ChangeFormer: A Transformer-Based Siamese Network for Change Detection.
Paper: https://arxiv.org/abs/2201.01293
Licence: MIT (commercial use permitted)

This adapter wraps the ChangeFormer model for use in SatQuery AI's
inference pipeline. It follows the ChangeDetectionAdapter interface exactly.
"""

from pathlib import Path
from typing import Any, Dict, Optional
import time
import structlog

from core.inference.model_adapter import (
    ChangeDetectionAdapter,
    InferenceResult,
    ModelMetadata,
)

logger = structlog.get_logger(__name__)

try:
    import numpy as np
    import torch
    import torch.nn.functional as F
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

try:
    import geopandas as gpd
    from shapely.geometry import shape
    import rasterio
    from rasterio.features import shapes as rasterio_shapes
    from rasterio.transform import from_bounds
    GEO_AVAILABLE = True
except ImportError:
    GEO_AVAILABLE = False


CHANGEFORMER_METADATA = ModelMetadata(
    model_id="changeformer",
    model_name="ChangeFormer",
    version="v0.1",
    checkpoint_path="",   # Set at load() time
    licence="MIT",
    licence_url="https://github.com/wgcban/ChangeFormer/blob/main/LICENSE",
    paper_url="https://arxiv.org/abs/2201.01293",
    input_size=256,
    input_bands=3,         # RGB
    supports_probability=True,
    evaluation_f1=None,    # Populated after Phase 1 evaluation
    evaluation_iou=None,
    evaluation_dataset="LEVIR-CD",
    notes=(
        "Transformer-based Siamese network. Requires RGB input at ≤ 0.5m–10m resolution. "
        "Pre-trained on LEVIR-CD building change detection dataset."
    ),
)


class ChangeFormerAdapter(ChangeDetectionAdapter):
    """
    SatQuery AI adapter for the ChangeFormer change-detection model.

    Usage:
        adapter = ChangeFormerAdapter()
        adapter.load(checkpoint_path="path/to/checkpoint.pth", config={})
        inputs = adapter.preprocess(array_a, array_b)
        result = adapter.infer(inputs)
        geodf = adapter.postprocess(result, threshold=0.5)
    """

    def __init__(self):
        self._model = None
        self._device = "cpu"
        self._loaded = False
        self._config: Dict = {}

    # ── Interface implementation ──────────────────────────────────────────

    def load(self, checkpoint_path: str, config: Dict[str, Any]) -> None:
        if self._loaded:
            logger.info("ChangeFormer already loaded — skipping reload")
            return

        if not TORCH_AVAILABLE:
            raise RuntimeError("PyTorch is required. Run: pip install torch")

        self._config = config
        self._device = config.get("device", "cpu")

        # Attempt to import ChangeFormer from local ml/adapters directory
        # Falls back to a lightweight placeholder for Phase 1 feasibility testing
        try:
            from ml.changeformer.models.changeformer import ChangeFormer
            self._model = ChangeFormer(
                input_nc=CHANGEFORMER_METADATA.input_bands * 2,
                output_nc=2,
                **config.get("model_kwargs", {}),
            )
            if checkpoint_path and Path(checkpoint_path).exists():
                state = torch.load(checkpoint_path, map_location=self._device)
                self._model.load_state_dict(state.get("state_dict", state))
                logger.info("ChangeFormer weights loaded", checkpoint=checkpoint_path)
            else:
                logger.warning(
                    "ChangeFormer checkpoint not found — using random weights (FOR TESTING ONLY)",
                    checkpoint=checkpoint_path,
                )
            self._model.to(self._device)
            self._model.eval()
        except ImportError:
            logger.warning(
                "ChangeFormer model code not found at ml/changeformer. "
                "Using stub adapter — install model code for real inference."
            )
            self._model = None   # Stub mode

        CHANGEFORMER_METADATA.checkpoint_path = checkpoint_path
        self._loaded = True
        logger.info("ChangeFormerAdapter loaded", device=self._device)

    def preprocess(self, image_a: Any, image_b: Any) -> Dict[str, Any]:
        """
        Convert numpy arrays (C, H, W) float32 [0,1] to model-ready tensors.
        Pads or crops to CHANGEFORMER_METADATA.input_size if needed.
        """
        if not TORCH_AVAILABLE:
            raise RuntimeError("PyTorch required for preprocessing")

        import numpy as np

        patch_size = CHANGEFORMER_METADATA.input_size

        def to_tensor(arr: np.ndarray) -> torch.Tensor:
            if arr.ndim == 2:
                arr = arr[np.newaxis, ...]   # add channel dim
            t = torch.from_numpy(arr).float()
            if t.shape[0] > CHANGEFORMER_METADATA.input_bands:
                t = t[:CHANGEFORMER_METADATA.input_bands]  # select first N bands
            # Resize to patch_size
            t = F.interpolate(
                t.unsqueeze(0), size=(patch_size, patch_size), mode="bilinear", align_corners=False
            ).squeeze(0)
            return t

        t_a = to_tensor(image_a)
        t_b = to_tensor(image_b)

        return {
            "image_a": t_a.unsqueeze(0).to(self._device),   # (1, C, H, W)
            "image_b": t_b.unsqueeze(0).to(self._device),
            "original_shape": (image_a.shape[-2], image_a.shape[-1]),
        }

    def infer(self, inputs: Dict[str, Any]) -> InferenceResult:
        """Run ChangeFormer inference and return probability change mask."""
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load() first.")

        import numpy as np

        start = time.perf_counter()

        if self._model is not None:
            with torch.no_grad():
                output = self._model(inputs["image_a"], inputs["image_b"])
                # ChangeFormer outputs list of predictions; use the last one
                if isinstance(output, (list, tuple)):
                    output = output[-1]
                # Softmax over class dim → get change probability (class 1)
                probs = torch.softmax(output, dim=1)[:, 1, :, :]  # (1, H, W)
                change_mask = probs.squeeze().cpu().numpy()
        else:
            # Stub: return zero mask (for UI/integration testing only)
            logger.warning("STUB INFERENCE — not real model output. Do not use for analysis.")
            h = w = CHANGEFORMER_METADATA.input_size
            change_mask = np.zeros((h, w), dtype=np.float32)

        elapsed = time.perf_counter() - start
        confidence_mean = float(np.mean(change_mask)) if "np" in dir() else 0.0

        logger.info(
            "ChangeFormer inference complete",
            inference_time=f"{elapsed:.2f}s",
            confidence_mean=f"{confidence_mean:.4f}",
            is_stub=self._model is None,
        )

        return InferenceResult(
            change_mask=change_mask,
            is_probability=True,
            confidence_mean=confidence_mean,
            model_metadata=self.model_info(),
            inference_time_seconds=elapsed,
        )

    def postprocess(self, result: InferenceResult, threshold: float = 0.5) -> Any:
        """
        Convert probability mask to a GeoDataFrame of change polygons.
        Returns None if geo libraries are unavailable.
        """
        if not GEO_AVAILABLE:
            logger.warning("geopandas/rasterio not available — cannot vectorise change mask")
            return None

        mask = (result.change_mask >= threshold).astype(np.uint8)

        # Vectorise using rasterio shapes
        # We use a dummy identity transform here; caller should attach real transform
        transform = from_bounds(0, 0, 1, 1, mask.shape[1], mask.shape[0])
        geoms = []
        for geom, val in rasterio_shapes(mask, transform=transform):
            if val == 1:
                geoms.append({
                    "geometry": shape(geom),
                    "change_probability": float(result.confidence_mean),
                    "model": result.model_metadata.model_id,
                })

        if not geoms:
            logger.info("No change regions detected above threshold", threshold=threshold)
            return gpd.GeoDataFrame(columns=["geometry", "change_probability", "model"], crs="EPSG:4326")

        gdf = gpd.GeoDataFrame(geoms, crs="EPSG:4326")
        logger.info("Change polygons generated", count=len(gdf))
        return gdf

    def model_info(self) -> ModelMetadata:
        return CHANGEFORMER_METADATA
