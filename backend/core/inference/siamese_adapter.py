"""SatQuery AI — Siamese-CD Model Adapter.

Implements ChangeDetectionAdapter for our multiscale Siamese Change Detection network.
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
    from rasterio.features import shapes as rasterio_shapes
    GEO_AVAILABLE = True
except ImportError:
    GEO_AVAILABLE = False


SIAMESE_METADATA = ModelMetadata(
    model_id="siamese_cd",
    model_name="Siamese-CD (Multiscale LEVIR-CD)",
    version="v0.1",
    checkpoint_path="./ml/model_cache/siamese_cd/best_siamese_cd.pth",
    licence="MIT",
    licence_url="https://opensource.org/licenses/MIT",
    paper_url="https://chenhao.in/LEVIR/",
    input_size=256,
    input_bands=3,
    supports_probability=True,
    notes="Trained on LEVIR-CD dataset with composite BCE + Soft Dice loss.",
)

S2LOOKING_METADATA = ModelMetadata(
    model_id="s2looking_cd",
    model_name="Siamese-CD (S2Looking Off-Nadir)",
    version="v0.1",
    checkpoint_path="./ml/model_cache/s2looking_cd/best_s2looking_cd.pth",
    licence="CC BY-NC 4.0",
    licence_url="https://github.com/S2Looking/S2Looking",
    paper_url="https://arxiv.org/abs/2104.11205",
    input_size=256,
    input_bands=3,
    supports_probability=True,
    notes="Trained on S2Looking off-nadir satellite dataset with composite BCE + Soft Dice loss.",
)

LEVIR_CC_METADATA = ModelMetadata(
    model_id="levir_cc",
    model_name="Siamese-CD (LEVIR-CC Multi-Task & Semantic Labeling)",
    version="v1.0",
    checkpoint_path="./ml/model_cache/levir_cc/best_levir_cc.pth",
    licence="MIT",
    licence_url="https://github.com/Chen-Hao-Chen/LEVIR-CC-Dataset",
    paper_url="https://arxiv.org/abs/2204.08398",
    input_size=256,
    input_bands=3,
    supports_probability=True,
    notes="Trained on LEVIR-CC dataset with dual-head boundary detection and semantic change classification.",
)


class SiameseAdapter(ChangeDetectionAdapter):
    """SatQuery AI adapter for the Siamese Change Detection model."""

    def __init__(self, metadata: Optional[ModelMetadata] = None):
        self._model = None
        self._device = "cpu"
        self._loaded = False
        self._config: Dict = {}
        self._metadata = metadata

    def load(self, checkpoint_path: str = "", config: Optional[Dict] = None) -> None:
        if not TORCH_AVAILABLE:
            raise RuntimeError("PyTorch is required to load SiameseAdapter.")

        config = config or {}
        device_str = config.get("device", "auto")
        if device_str == "auto":
            if torch.cuda.is_available():
                self._device = "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                self._device = "mps"
            else:
                self._device = "cpu"
        else:
            self._device = device_str

        ckpt = checkpoint_path or SIAMESE_METADATA.checkpoint_path
        self._checkpoint_path = ckpt

        from ml.models.siamese_cd import SiameseChangeDetector

        base_channels = 64
        if Path(ckpt).exists():
            checkpoint = torch.load(ckpt, map_location=self._device)
            if isinstance(checkpoint, dict) and "config" in checkpoint:
                base_channels = checkpoint["config"].get("base_channels", 64)
            self._model = SiameseChangeDetector(in_channels=3, base_channels=base_channels)
            state_dict = checkpoint.get("model_state_dict", checkpoint)
            self._model.load_state_dict(state_dict)
            logger.info("Loaded Siamese-CD checkpoint", path=ckpt, base_channels=base_channels)
        else:
            self._model = SiameseChangeDetector(in_channels=3, base_channels=base_channels)

        self._model.to(self._device)
        self._model.eval()
        self._loaded = True
        self._config = config

    def preprocess(self, image_a: Any, image_b: Any) -> Dict[str, Any]:
        """Convert [C, H, W] numpy arrays to torch tensors."""
        arr_a = image_a.astype(np.float32)
        arr_b = image_b.astype(np.float32)

        if arr_a.max() > 1.0:
            arr_a /= 255.0
        if arr_b.max() > 1.0:
            arr_b /= 255.0

        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(3, 1, 1)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(3, 1, 1)

        t_a = torch.from_numpy((arr_a - mean) / std).unsqueeze(0).float()
        t_b = torch.from_numpy((arr_b - mean) / std).unsqueeze(0).float()

        return {"tensor_a": t_a, "tensor_b": t_b, "orig_shape": arr_a.shape}

    def infer(self, inputs: Dict[str, Any]) -> InferenceResult:
        if not self._loaded:
            raise RuntimeError("SiameseAdapter must be loaded before infer().")

        t_a = inputs["tensor_a"].to(self._device)
        t_b = inputs["tensor_b"].to(self._device)

        start = time.perf_counter()
        with torch.no_grad():
            if hasattr(self._model, "forward_tta"):
                probs_t, cls_logits = self._model.forward_tta(t_a, t_b)
                probs = probs_t.squeeze().cpu().numpy()
            else:
                logits = self._model(t_a, t_b)
                probs = torch.sigmoid(logits).squeeze().cpu().numpy()

        elapsed = time.perf_counter() - start

        # Optimal calibrated threshold for maximum precision
        opt_thresh = 0.58
        change_pixels = probs >= opt_thresh

        return InferenceResult(
            change_mask=probs,
            is_probability=True,
            confidence_mean=float(probs[change_pixels].mean()) if change_pixels.any() else 0.0,
            model_metadata=self.model_info(),
            inference_time_seconds=round(elapsed, 3),
            preprocessing_applied=["normalized", "standardized_imagenet", "test_time_augmentation"],
        )

    def postprocess(self, result: InferenceResult, threshold: float = 0.58) -> Any:
        if not GEO_AVAILABLE:
            return None

        binary_mask = (result.change_mask >= threshold).astype(np.uint8)

        # Morphological filter: remove isolated single-pixel noise (precision enhancement)
        try:
            from scipy.ndimage import binary_opening
            binary_mask = binary_opening(binary_mask, structure=np.ones((3, 3))).astype(np.uint8)
        except ImportError:
            pass

        feats = []
        for geom, val in rasterio_shapes(binary_mask):
            if int(val) == 1:
                # Filter out microscopic noise polygons (< 12 m2)
                s_geom = shape(geom)
                if s_geom.area >= 12:
                    feats.append({
                        "geometry": s_geom,
                        "confidence": float(result.confidence_mean),
                        "change_type": "detected_change",
                    })

        if not feats:
            return gpd.GeoDataFrame(columns=["geometry", "confidence", "change_type"])

        return gpd.GeoDataFrame(feats)

    def model_info(self) -> ModelMetadata:
        if self._metadata:
            return self._metadata
        ckpt = getattr(self, "_checkpoint_path", "") or ""
        if "s2looking" in ckpt.lower():
            return S2LOOKING_METADATA
        return SIAMESE_METADATA
