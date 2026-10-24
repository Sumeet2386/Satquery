"""SatQuery AI — LLM-based Change Explanation Generator.

Explains analysis results in natural language. The LLM is constrained to
describe only what the model actually found — it cannot invent measurements
or claim changes occurred without analytical evidence.
"""

from typing import Optional, Tuple
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


SYSTEM_PROMPT = """You are a geospatial analysis assistant for SatQuery AI.
Your role is to explain satellite image change-detection results clearly and honestly.

STRICT RULES:
1. Only describe what the change-detection model actually detected.
2. Never invent measurements, areas, or statistics not present in the model output.
3. Always acknowledge uncertainty when model confidence is low.
4. Always list known limitations of the analysis.
5. Use plain language — avoid jargon where possible.
6. If no changes were detected, say so clearly and explain why that might be.
7. Do not speculate about causes unless directly observable in the data.

Your response must have two parts:
EXPLANATION: <clear, evidence-based description of detected changes>
LIMITATIONS: <known limitations of this specific analysis>"""


class ChangeExplainer:
    """
    Generates natural-language explanations of change-detection results.
    Uses the configured LLM (OpenAI or Anthropic) with strict evidence constraints.
    Falls back to a template-based explanation if no LLM is configured.
    """

    def __init__(self):
        self._openai_client = None
        self._anthropic_client = None
        self._initialise_clients()

    def _initialise_clients(self) -> None:
        if settings.OPENAI_API_KEY:
            try:
                from openai import AsyncOpenAI
                self._openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                logger.info("OpenAI client initialised for explanations")
            except ImportError:
                logger.warning("openai package not installed")

        if settings.ANTHROPIC_API_KEY and not self._openai_client:
            try:
                from anthropic import AsyncAnthropic
                self._anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
                logger.info("Anthropic client initialised for explanations")
            except ImportError:
                logger.warning("anthropic package not installed")

    async def explain(self, job: "AnalysisJob") -> Tuple[str, str]:
        """
        Generate explanation and limitations text for a completed analysis job.
        Returns (explanation, limitations).
        """
        context = self._build_context(job)

        if self._openai_client:
            return await self._explain_openai(context)
        elif self._anthropic_client:
            return await self._explain_anthropic(context)
        else:
            return self._template_explanation(job)

    def _build_context(self, job) -> str:
        """Build a structured context string from analysis job results."""
        model_meta = job.inference_result.model_metadata if job.inference_result else None
        features_count = (
            len(job.change_geojson.get("features", []))
            if job.change_geojson
            else 0
        )
        confidence = (
            f"{job.inference_result.confidence_mean:.2%}"
            if job.inference_result
            else "unknown"
        )

        return f"""
User query: "{job.query}"

Analysis results:
- Model used: {model_meta.model_name if model_meta else 'unknown'} ({model_meta.model_id if model_meta else ''})
- Model trained on: {model_meta.evaluation_dataset if model_meta else 'unknown'}
- Change regions detected: {features_count}
- Mean change confidence: {confidence}
- Warnings: {'; '.join(job.warnings) if job.warnings else 'none'}
- Image A metadata: CRS={job.metadata_a.crs_epsg if job.metadata_a else 'unknown'}, resolution={job.metadata_a.resolution_x:.2f}m if job.metadata_a else 'unknown'}
- Image B metadata: CRS={job.metadata_b.crs_epsg if job.metadata_b else 'unknown'}, resolution={job.metadata_b.resolution_x:.2f}m if job.metadata_b else 'unknown'}
- Spatial overlap: {job.compatibility.overlap_ratio:.0%} if job.compatibility else 'unknown'}
- Inference time: {job.inference_result.inference_time_seconds:.1f}s if job.inference_result else 'unknown'}

Preprocessing applied:
{chr(10).join(job.preprocessed.preprocessing_log) if job.preprocessed else 'none'}
""".strip()

    async def _explain_openai(self, context: str) -> Tuple[str, str]:
        try:
            response = await self._openai_client.chat.completions.create(
                model=settings.EXPLANATION_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": context},
                ],
                max_tokens=800,
                temperature=0.3,
            )
            return self._parse_response(response.choices[0].message.content)
        except Exception as e:
            logger.error("OpenAI explanation failed", error=str(e))
            return self._fallback_explanation()

    async def _explain_anthropic(self, context: str) -> Tuple[str, str]:
        try:
            response = await self._anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=800,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": context}],
            )
            return self._parse_response(response.content[0].text)
        except Exception as e:
            logger.error("Anthropic explanation failed", error=str(e))
            return self._fallback_explanation()

    def _parse_response(self, text: str) -> Tuple[str, str]:
        """Parse EXPLANATION / LIMITATIONS sections from LLM response."""
        explanation = ""
        limitations = ""
        current = None
        for line in text.splitlines():
            if line.startswith("EXPLANATION:"):
                current = "explanation"
                explanation = line[len("EXPLANATION:"):].strip()
            elif line.startswith("LIMITATIONS:"):
                current = "limitations"
                limitations = line[len("LIMITATIONS:"):].strip()
            elif current == "explanation":
                explanation += " " + line.strip()
            elif current == "limitations":
                limitations += " " + line.strip()
        return explanation.strip() or text, limitations.strip()

    def _template_explanation(self, job) -> Tuple[str, str]:
        """Fallback template when no LLM is configured."""
        features = len(job.change_geojson.get("features", [])) if job.change_geojson else 0
        confidence = job.inference_result.confidence_mean if job.inference_result else 0.0
        model_name = job.inference_result.model_metadata.model_name if job.inference_result else "the model"

        if features == 0:
            explanation = (
                f"No change regions were detected above the confidence threshold by {model_name}. "
                "The two images appear similar according to the model. "
                "This could mean there are genuinely no significant changes, "
                "or that the changes present are below the model's detection capability."
            )
        else:
            explanation = (
                f"{model_name} detected {features} change region(s) between the two images. "
                f"The mean change confidence was {confidence:.1%}. "
                "Changed areas are highlighted on the map overlay."
            )

        limitations = (
            f"This analysis used {model_name}, which was pre-trained on the LEVIR-CD "
            "building change dataset. Results may be less accurate for non-building land cover changes. "
            "No ground-truth validation was performed on these specific images. "
            "Reported change regions should be treated as indicative, not definitive."
        )

        return explanation, limitations

    @staticmethod
    def _fallback_explanation() -> Tuple[str, str]:
        return (
            "Analysis complete. Please refer to the change map for detected regions.",
            "Natural-language explanation could not be generated automatically.",
        )
