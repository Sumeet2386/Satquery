"""SatQuery AI — Model Adapter Base Class and Model Registry.

All change-detection models implement the ChangeDetectionAdapter interface.
This keeps models replaceable without touching orchestration code.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import json
import structlog

logger = structlog.get_logger(__name__)

try:
    import numpy as np
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


@dataclass
class ModelMetadata:
    """Provenance record for a loaded model."""
    model_id: str
    model_name: str
    version: str
    checkpoint_path: str
    licence: str
    licence_url: str
    paper_url: str
    input_size: int              # Expected patch size (e.g., 256)
    input_bands: int             # Number of bands per image
    supports_probability: bool   # Whether it outputs soft probabilities
    evaluation_f1: Optional[float] = None
    evaluation_iou: Optional[float] = None
    evaluation_dataset: Optional[str] = None
    notes: str = ""


@dataclass
class InferenceResult:
    """Raw output from a change-detection model."""
    change_mask: Any             # np.ndarray — binary (0/1) or probability [0,1]
    is_probability: bool
    confidence_mean: float
    model_metadata: ModelMetadata
    inference_time_seconds: float
    preprocessing_applied: List[str] = field(default_factory=list)


class ChangeDetectionAdapter(ABC):
    """
    Abstract interface that all change-detection model adapters must implement.

    Design contract:
    - load() must be called before infer()
    - preprocess() converts raw raster arrays to model-ready tensors
    - infer() must return an InferenceResult with real model output
    - postprocess() converts the mask to a GeoDataFrame of change polygons
    - model_info() returns a ModelMetadata record (no inference required)
    """

    @abstractmethod
    def load(self, checkpoint_path: str, config: Dict[str, Any]) -> None:
        """Load model weights and config. Must be idempotent."""
        ...

    @abstractmethod
    def preprocess(self, image_a: Any, image_b: Any) -> Dict[str, Any]:
        """Convert numpy arrays (C, H, W) to model-ready inputs."""
        ...

    @abstractmethod
    def infer(self, inputs: Dict[str, Any]) -> InferenceResult:
        """Run model inference. Must use real model — no mocking."""
        ...

    @abstractmethod
    def postprocess(self, result: InferenceResult, threshold: float = 0.5) -> Any:
        """Convert change mask to GeoDataFrame of change polygons."""
        ...

    @abstractmethod
    def model_info(self) -> ModelMetadata:
        """Return model metadata without running inference."""
        ...

    @property
    def is_loaded(self) -> bool:
        return getattr(self, "_loaded", False)


class ModelRegistry:
    """
    Maintains the catalogue of available change-detection models.
    Loads from a JSON registry file and returns adapter instances.
    """

    def __init__(self, registry_path: str):
        self.registry_path = Path(registry_path)
        self._registry: Dict[str, Dict] = {}
        self._load_registry()

    def _load_registry(self) -> None:
        if not self.registry_path.exists():
            logger.warning("Model registry not found", path=str(self.registry_path))
            self._registry = {}
            return
        with open(self.registry_path) as f:
            self._registry = json.load(f)
        logger.info("Model registry loaded", models=list(self._registry.keys()))

    def list_models(self) -> List[str]:
        return list(self._registry.keys())

    def get_model_config(self, model_id: str) -> Dict:
        if model_id not in self._registry:
            raise ValueError(
                f"Model '{model_id}' not found in registry. "
                f"Available: {self.list_models()}"
            )
        return self._registry[model_id]

    def get_adapter(self, model_id: str) -> ChangeDetectionAdapter:
        """Return an instantiated (not yet loaded) adapter for the given model."""
        config = self.get_model_config(model_id)
        adapter_class = self._resolve_adapter(config["adapter_class"])
        return adapter_class()

    @staticmethod
    def _resolve_adapter(class_path: str) -> type:
        """Dynamically import adapter class from dotted path string."""
        module_path, class_name = class_path.rsplit(".", 1)
        import importlib
        module = importlib.import_module(module_path)
        return getattr(module, class_name)
