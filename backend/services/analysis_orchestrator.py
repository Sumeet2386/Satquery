"""SatQuery AI — Analysis Orchestrator.

Coordinates the full analysis pipeline:
  1. Validate inputs
  2. Preprocess image pair
  3. Run model inference
  4. Vectorise and verify evidence
  5. Generate natural-language explanation
  6. Record provenance

This is the single entry point for running a change-detection analysis.
"""

import asyncio
import hashlib
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional
import structlog

from core.validation.image_validator import ImageValidator, ImageMetadata, CompatibilityReport
from core.preprocessing.raster_preprocessor import RasterPreprocessor, PreprocessedPair
from core.inference.model_adapter import ModelRegistry, InferenceResult
from core.explanation.explainer import ChangeExplainer

logger = structlog.get_logger(__name__)


@dataclass
class AnalysisJob:
    job_id: str
    image_a_path: str
    image_b_path: str
    query: str
    model_id: str
    status: str = "pending"          # pending | validating | preprocessing | inferring | explaining | done | failed
    error: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    metadata_a: Optional[ImageMetadata] = None
    metadata_b: Optional[ImageMetadata] = None
    compatibility: Optional[CompatibilityReport] = None
    preprocessed: Optional[PreprocessedPair] = None
    inference_result: Optional[InferenceResult] = None
    change_geojson: Optional[Dict] = None
    explanation: Optional[str] = None
    limitations: Optional[str] = None
    provenance: Dict = field(default_factory=dict)
    elapsed_seconds: float = 0.0


class AnalysisOrchestrator:
    """
    Runs the full SatQuery AI change-detection analysis pipeline.

    Component dependencies are injected, making each step independently
    testable and replaceable.
    """

    def __init__(
        self,
        validator: Optional[ImageValidator] = None,
        preprocessor: Optional[RasterPreprocessor] = None,
        model_registry: Optional[ModelRegistry] = None,
        explainer: Optional[ChangeExplainer] = None,
        output_dir: str = "./storage/results",
    ):
        self.validator = validator or ImageValidator()
        self.preprocessor = preprocessor or RasterPreprocessor()
        self.model_registry = model_registry
        self.explainer = explainer or ChangeExplainer()
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def run(self, job: AnalysisJob) -> AnalysisJob:
        """Execute the full pipeline for a given job. Updates job in-place."""
        start = time.perf_counter()
        job.job_id = job.job_id or str(uuid.uuid4())
        log = logger.bind(job_id=job.job_id, model=job.model_id)

        try:
            # ── Step 1: Validate inputs ──────────────────────────────────
            log.info("Step 1/5: Validating inputs")
            job.status = "validating"
            job = await self._validate(job)
            if job.status == "failed":
                return job

            # ── Step 2: Preprocess ───────────────────────────────────────
            log.info("Step 2/5: Preprocessing image pair")
            job.status = "preprocessing"
            job = await self._preprocess(job)
            if job.status == "failed":
                return job

            # ── Step 3: Inference ─────────────────────────────────────────
            log.info("Step 3/5: Running model inference")
            job.status = "inferring"
            job = await self._infer(job)
            if job.status == "failed":
                return job

            # ── Step 4: Vectorise and evidence check ─────────────────────
            log.info("Step 4/5: Vectorising change mask")
            job = await self._vectorise(job)

            # ── Step 5: Explanation ───────────────────────────────────────
            log.info("Step 5/5: Generating explanation")
            job.status = "explaining"
            job = await self._explain(job)

            # ── Provenance record ─────────────────────────────────────────
            job.provenance = self._build_provenance(job)
            job.status = "done"
            job.elapsed_seconds = time.perf_counter() - start
            log.info("Analysis complete", elapsed=f"{job.elapsed_seconds:.1f}s")

        except Exception as e:
            log.error("Analysis pipeline error", error=str(e), exc_info=True)
            job.status = "failed"
            job.error = f"An unexpected error occurred during analysis: {e}"

        return job

    # ── Private pipeline steps ─────────────────────────────────────────────

    async def _validate(self, job: AnalysisJob) -> AnalysisJob:
        valid_a, errors_a, job.metadata_a = self.validator.validate_single(job.image_a_path)
        valid_b, errors_b, job.metadata_b = self.validator.validate_single(job.image_b_path)

        all_errors = [f"Image A: {e}" for e in errors_a] + [f"Image B: {e}" for e in errors_b]
        if all_errors:
            job.status = "failed"
            job.error = "Input validation failed:\n" + "\n".join(all_errors)
            return job

        if job.metadata_a and job.metadata_b:
            job.compatibility = self.validator.check_pair_compatibility(
                job.metadata_a, job.metadata_b
            )
            job.warnings.extend(job.compatibility.warnings)
            if not job.compatibility.compatible:
                job.status = "failed"
                job.error = "Image pair incompatible:\n" + "\n".join(job.compatibility.errors)

        return job

    async def _preprocess(self, job: AnalysisJob) -> AnalysisJob:
        try:
            out_dir = str(self.output_dir / job.job_id / "preprocessed")
            job.preprocessed = self.preprocessor.preprocess_pair(
                job.image_a_path,
                job.image_b_path,
                output_dir=out_dir,
            )
        except Exception as e:
            job.status = "failed"
            job.error = f"Preprocessing failed: {e}"
        return job

    async def _infer(self, job: AnalysisJob) -> AnalysisJob:
        if not self.model_registry:
            job.status = "failed"
            job.error = "Model registry not configured."
            return job

        try:
            import numpy as np
            import rasterio

            adapter = self.model_registry.get_adapter(job.model_id)
            config = self.model_registry.get_model_config(job.model_id)
            adapter.load(
                checkpoint_path=config.get("checkpoint_path", ""),
                config=config.get("inference_config", {}),
            )

            with rasterio.open(job.preprocessed.image_a_path) as ds_a:
                arr_a = ds_a.read().astype(np.float32)
            with rasterio.open(job.preprocessed.image_b_path) as ds_b:
                arr_b = ds_b.read().astype(np.float32)

            inputs = adapter.preprocess(arr_a, arr_b)
            job.inference_result = adapter.infer(inputs)

        except Exception as e:
            job.status = "failed"
            job.error = f"Model inference failed: {e}"
        return job

    async def _vectorise(self, job: AnalysisJob) -> AnalysisJob:
        if not job.inference_result:
            return job
        try:
            import rasterio
            from rasterio.warp import transform_bounds
            adapter = self.model_registry.get_adapter(job.model_id)
            gdf = adapter.postprocess(job.inference_result, threshold=0.5)
            if gdf is not None and not gdf.empty:
                job.change_geojson = gdf.__geo_interface__
            else:
                job.change_geojson = {"type": "FeatureCollection", "features": []}
                job.warnings.append(
                    "No change regions were detected above the confidence threshold (0.5). "
                    "The images may be very similar, or the model confidence may be low."
                )
        except Exception as e:
            logger.warning("Vectorisation failed", error=str(e))
            job.change_geojson = {"type": "FeatureCollection", "features": []}
            job.warnings.append(f"Could not vectorise change map: {e}")
        return job

    async def _explain(self, job: AnalysisJob) -> AnalysisJob:
        try:
            explanation, limitations = await self.explainer.explain(job)
            job.explanation = explanation
            job.limitations = limitations
        except Exception as e:
            logger.warning("Explanation generation failed", error=str(e))
            job.explanation = (
                "Analysis complete. Change map generated. "
                "Natural-language explanation is temporarily unavailable."
            )
            job.limitations = "Explanation could not be generated automatically."
        return job

    @staticmethod
    def _build_provenance(job: AnalysisJob) -> Dict:
        """Build an audit record for reproducibility."""
        def file_hash(path: str) -> str:
            try:
                h = hashlib.sha256()
                with open(path, "rb") as f:
                    for chunk in iter(lambda: f.read(65536), b""):
                        h.update(chunk)
                return h.hexdigest()
            except Exception:
                return "unavailable"

        return {
            "job_id": job.job_id,
            "model_id": job.model_id,
            "model_version": job.inference_result.model_metadata.version
            if job.inference_result else "unknown",
            "image_a_sha256": file_hash(job.image_a_path),
            "image_b_sha256": file_hash(job.image_b_path),
            "preprocessing_log": job.preprocessed.preprocessing_log if job.preprocessed else [],
            "inference_time_s": job.inference_result.inference_time_seconds
            if job.inference_result else None,
            "threshold": 0.5,
            "warnings_count": len(job.warnings),
        }
