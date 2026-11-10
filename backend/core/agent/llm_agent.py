"""SatQuery AI — Real-World Multimodal LLM & Tool-Grounded Agent.

Supports Google Gemini, OpenAI, Anthropic Claude, Groq, OpenRouter,
and local Ollama via httpx. Grounds every LLM response strictly in
real-time satellite statistical telemetry and optional T1/T2 vision frames.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional, Tuple
import httpx
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


SYSTEM_INSTRUCTIONS = """You are **SatQuery AI**, an elite real-world geospatial & remote-sensing intelligence agent.

You are analyzing a live bi-temporal satellite image pair (Pre-Event T1 vs Post-Event T2) alongside exact computer-vision and statistical telemetry computed by the Siamese-CD / LEVIR-CC pipeline.

STRICT GROUNDING & STATISTICAL RULES:
1. Answer the user's EXACT question directly, thoroughly, and conversationally — NEVER give a generic boilerplate summary when the user asks a specific question.
2. Whenever quantitative or statistical analysis is relevant (areas, distances, percentages, averages, medians, standard deviations, IQR, Z-scores, quadrant distributions, nearest-neighbor spacing, model F1/IoU/recall/precision, unit conversions, or GSD sensitivity), use the EXACT computed numbers from the provided TELEMETRY AUDIT JSON. Never invent or guess measurements.
3. Explicitly distinguish **Pre-Event (T1 Baseline)** vs **Post-Event (T2 Target)** and explain the **actual physical difference (Δ Delta)** when analyzing scene changes.
4. When T1 and T2 satellite images are attached in your multimodal input, visually inspect BOTH images directly (land cover, buildings, roads, soil grading, vegetation changes, shadows, alignment) and combine your direct visual observations with the exact statistical telemetry.
5. Support follow-up reasoning using the conversation history (e.g., comparing clusters, converting units, explaining anomalies, assessing confidence or false positives).
6. Format responses cleanly in GitHub-style Markdown (headings, concise bullet points, and Markdown tables when comparing metrics or clusters)."""


def _strip_data_url_prefix(b64_str: str) -> Tuple[str, str]:
    """Extract (mime_type, raw_base64) from a data URL or raw base64 string."""
    match = re.match(r"^data:([^;]+);base64,(.+)$", b64_str.strip(), re.DOTALL)
    if match:
        return match.group(1), match.group(2)
    return "image/jpeg", b64_str.strip()


def resolve_active_llm_config(request_llm_config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Determine active LLM provider, api_key, model, base_url from request config or env."""
    req = request_llm_config or {}
    provider = (req.get("provider") or "").strip().lower()
    api_key = (req.get("api_key") or "").strip()
    model = (req.get("model") or "").strip()
    base_url = (req.get("base_url") or "").strip()
    enable_vision = bool(req.get("enable_vision", True))

    if provider == "statistical":
        return {"provider": "statistical", "api_key": "", "model": "statistical-engine-v2", "base_url": "", "enable_vision": False}

    # Check request-level config first
    if provider and (api_key or provider == "ollama"):
        default_models = {
            "gemini": "gemini-2.5-flash",
            "openai": "gpt-4o-mini",
            "anthropic": "claude-3-5-sonnet-latest",
            "groq": "llama-3.3-70b-versatile",
            "openrouter": "google/gemini-2.5-flash",
            "ollama": "llama3.2",
            "custom": "gpt-4o-mini",
        }
        return {
            "provider": provider,
            "api_key": api_key,
            "model": model or default_models.get(provider, "gpt-4o-mini"),
            "base_url": base_url,
            "enable_vision": enable_vision,
        }

    # Fall back to environment variables
    gemini_key = settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY
    if gemini_key:
        return {"provider": "gemini", "api_key": gemini_key, "model": model or "gemini-2.5-flash", "base_url": "", "enable_vision": enable_vision}
    if settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("sk-..."):
        return {"provider": "openai", "api_key": settings.OPENAI_API_KEY, "model": model or settings.EXPLANATION_MODEL or "gpt-4o-mini", "base_url": "", "enable_vision": enable_vision}
    if settings.ANTHROPIC_API_KEY and not settings.ANTHROPIC_API_KEY.startswith("sk-ant-..."):
        return {"provider": "anthropic", "api_key": settings.ANTHROPIC_API_KEY, "model": model or "claude-3-5-sonnet-latest", "base_url": "", "enable_vision": enable_vision}
    if settings.GROQ_API_KEY:
        return {"provider": "groq", "api_key": settings.GROQ_API_KEY, "model": model or "llama-3.3-70b-versatile", "base_url": "", "enable_vision": False}
    if settings.OPENROUTER_API_KEY:
        return {"provider": "openrouter", "api_key": settings.OPENROUTER_API_KEY, "model": model or "google/gemini-2.5-flash", "base_url": "", "enable_vision": enable_vision}

    return {"provider": "statistical", "api_key": "", "model": "statistical-engine-v2", "base_url": "", "enable_vision": False}


def _build_telemetry_context_block(audit: Dict[str, Any]) -> str:
    """Format the computed statistical audit cleanly for LLM grounding."""
    compact_audit = {
        "scene_title": audit.get("scene_title"),
        "pre_filename": audit.get("pre_filename"),
        "post_filename": audit.get("post_filename"),
        "gsd_m": audit.get("gsd_m"),
        "tile": audit.get("tile"),
        "totals": audit.get("totals"),
        "area_statistics": audit.get("area_statistics"),
        "spatial_statistics": audit.get("spatial_statistics"),
        "confidence_statistics": audit.get("confidence_statistics"),
        "category_breakdown": audit.get("category_breakdown"),
        "pixel_stats": audit.get("pixel_stats"),
        "model_metrics": {
            k: audit.get("model_metrics", {}).get(k)
            for k in ["model_name", "epochs_trained", "best_f1", "val_iou", "val_precision", "val_recall", "val_cls_acc", "classes"]
        },
        "clusters": [
            {
                "index": c["index"],
                "label": c["label"],
                "category": c["category"],
                "area_m2": c["area_m2"],
                "span_m": c["span_m"],
                "span_km": c["span_km"],
                "confidence": c["confidence"],
                "quadrant": c["quadrant"],
                "centroid": [c["centroid_lat"], c["centroid_lng"]],
            }
            for c in (audit.get("clusters") or [])[:25]
        ],
    }
    return f"TELEMETRY AUDIT JSON (VERIFIED GROUND TRUTH):\n```json\n{json.dumps(compact_audit, indent=2)}\n```"


async def call_real_world_llm(
    query: str,
    audit: Dict[str, Any],
    llm_cfg: Dict[str, Any],
    conversation_history: Optional[List[Dict[str, str]]] = None,
    pre_image_b64: Optional[str] = None,
    post_image_b64: Optional[str] = None,
) -> Tuple[str, str, Dict[str, Any]]:
    """
    Execute a grounded LLM/VLM request.
    Returns (answer_markdown, model_used, extra_meta).
    Raises Exception on HTTP/API error so caller can handle/surface cleanly.
    """
    provider = llm_cfg["provider"]
    api_key = llm_cfg["api_key"]
    model = llm_cfg["model"]
    base_url = llm_cfg.get("base_url") or ""
    enable_vision = bool(llm_cfg.get("enable_vision", True))

    telemetry_block = _build_telemetry_context_block(audit)
    system_prompt = f"{SYSTEM_INSTRUCTIONS}\n\n{telemetry_block}"

    history = (conversation_history or [])[-8:]
    has_images = enable_vision and bool(pre_image_b64 and post_image_b64)

    async with httpx.AsyncClient(timeout=45.0) as client:
        # ── 1. GOOGLE GEMINI ──────────────────────────────────────────────────
        if provider == "gemini":
            endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            contents: List[Dict[str, Any]] = []
            for turn in history:
                role = "model" if turn.get("role") == "assistant" else "user"
                text = (turn.get("content") or "").strip()
                if text:
                    contents.append({"role": role, "parts": [{"text": text[:2000]}]})

            user_parts: List[Dict[str, Any]] = [{"text": query}]
            if has_images:
                mime_a, raw_a = _strip_data_url_prefix(pre_image_b64 or "")
                mime_b, raw_b = _strip_data_url_prefix(post_image_b64 or "")
                user_parts.extend([
                    {"text": "[Image 1: Pre-Event T1 Baseline Satellite Tile]"},
                    {"inline_data": {"mime_type": mime_a, "data": raw_a}},
                    {"text": "[Image 2: Post-Event T2 Target Satellite Tile]"},
                    {"inline_data": {"mime_type": mime_b, "data": raw_b}},
                ])

            contents.append({"role": "user", "parts": user_parts})
            payload = {
                "system_instruction": {"parts": [{"text": system_prompt}]},
                "contents": contents,
                "generationConfig": {"temperature": 0.25, "maxOutputTokens": 1400},
            }
            resp = await client.post(endpoint, json=payload)
            if resp.status_code >= 400:
                raise RuntimeError(f"Gemini API error ({resp.status_code}): {resp.text[:400]}")
            data = resp.json()
            candidates = data.get("candidates") or []
            if not candidates:
                raise RuntimeError("Gemini returned empty candidates.")
            parts = candidates[0].get("content", {}).get("parts", [])
            answer = "\n".join(p.get("text", "") for p in parts if p.get("text")).strip()
            return answer, f"gemini/{model}", {"vision_attached": has_images, "provider": "gemini"}

        # ── 2. ANTHROPIC CLAUDE ───────────────────────────────────────────────
        if provider == "anthropic":
            endpoint = "https://api.anthropic.com/v1/messages"
            messages: List[Dict[str, Any]] = []
            for turn in history:
                role = "assistant" if turn.get("role") == "assistant" else "user"
                text = (turn.get("content") or "").strip()
                if text:
                    messages.append({"role": role, "content": text[:2000]})

            user_content: Any = query
            if has_images:
                mime_a, raw_a = _strip_data_url_prefix(pre_image_b64 or "")
                mime_b, raw_b = _strip_data_url_prefix(post_image_b64 or "")
                user_content = [
                    {"type": "text", "text": f"{query}\n\n[Image 1: Pre-Event T1 Baseline]"},
                    {"type": "image", "source": {"type": "base64", "media_type": mime_a, "data": raw_a}},
                    {"type": "text", "text": "[Image 2: Post-Event T2 Target]"},
                    {"type": "image", "source": {"type": "base64", "media_type": mime_b, "data": raw_b}},
                ]
            messages.append({"role": "user", "content": user_content})

            resp = await client.post(
                endpoint,
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": model,
                    "max_tokens": 1400,
                    "temperature": 0.25,
                    "system": system_prompt,
                    "messages": messages,
                },
            )
            if resp.status_code >= 400:
                raise RuntimeError(f"Anthropic API error ({resp.status_code}): {resp.text[:400]}")
            data = resp.json()
            blocks = data.get("content") or []
            answer = "\n".join(b.get("text", "") for b in blocks if b.get("type") == "text").strip()
            return answer, f"anthropic/{model}", {"vision_attached": has_images, "provider": "anthropic"}

        # ── 3. LOCAL OLLAMA ───────────────────────────────────────────────────
        if provider == "ollama":
            ollama_base = (base_url or settings.OLLAMA_BASE_URL or "http://localhost:11434").rstrip("/")
            endpoint = f"{ollama_base}/api/chat"
            messages = [{"role": "system", "content": system_prompt}]
            for turn in history:
                role = "assistant" if turn.get("role") == "assistant" else "user"
                text = (turn.get("content") or "").strip()
                if text:
                    messages.append({"role": role, "content": text[:2000]})

            user_msg: Dict[str, Any] = {"role": "user", "content": query}
            is_vision_model = any(v in model.lower() for v in ["llava", "vision", "minicpm", "qwen2.5vl", "qwen2-vl", "gemma3"])
            if has_images and is_vision_model:
                _, raw_a = _strip_data_url_prefix(pre_image_b64 or "")
                _, raw_b = _strip_data_url_prefix(post_image_b64 or "")
                user_msg["images"] = [raw_a, raw_b]
            messages.append(user_msg)

            resp = await client.post(
                endpoint,
                json={"model": model, "messages": messages, "stream": False, "options": {"temperature": 0.25}},
            )
            if resp.status_code >= 400:
                raise RuntimeError(f"Ollama error ({resp.status_code}): {resp.text[:400]}")
            data = resp.json()
            answer = (data.get("message", {}).get("content") or "").strip()
            return answer, f"ollama/{model}", {"vision_attached": bool(user_msg.get("images")), "provider": "ollama"}

        # ── 4. OPENAI / GROQ / OPENROUTER / CUSTOM OPENAI-COMPATIBLE ──────────
        url_map = {
            "openai": "https://api.openai.com/v1/chat/completions",
            "groq": "https://api.groq.com/openai/v1/chat/completions",
            "openrouter": "https://openrouter.ai/api/v1/chat/completions",
        }
        if base_url:
            clean_base = base_url.rstrip("/")
            endpoint = clean_base if clean_base.endswith("/chat/completions") else f"{clean_base}/chat/completions"
        else:
            endpoint = url_map.get(provider, url_map["openai"])

        messages = [{"role": "system", "content": system_prompt}]
        for turn in history:
            role = "assistant" if turn.get("role") == "assistant" else "user"
            text = (turn.get("content") or "").strip()
            if text:
                messages.append({"role": role, "content": text[:2000]})

        supports_oai_vision = provider in ("openai", "openrouter", "custom") and not any(
            x in model.lower() for x in ["llama-3.1-8b", "llama-3.3-70b", "mixtral", "deepseek-r1"]
        )
        if has_images and supports_oai_vision:
            user_content = [
                {"type": "text", "text": f"{query}\n\n[Image 1: Pre-Event T1 Baseline]"},
                {"type": "image_url", "image_url": {"url": pre_image_b64 if (pre_image_b64 or "").startswith("data:") else f"data:image/jpeg;base64,{pre_image_b64}"}},
                {"type": "text", "text": "[Image 2: Post-Event T2 Target]"},
                {"type": "image_url", "image_url": {"url": post_image_b64 if (post_image_b64 or "").startswith("data:") else f"data:image/jpeg;base64,{post_image_b64}"}},
            ]
            messages.append({"role": "user", "content": user_content})
            vision_used = True
        else:
            messages.append({"role": "user", "content": query})
            vision_used = False

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        if provider == "openrouter":
            headers["HTTP-Referer"] = "http://localhost:3000"
            headers["X-Title"] = "SatQuery AI"

        resp = await client.post(
            endpoint,
            headers=headers,
            json={
                "model": model,
                "messages": messages,
                "temperature": 0.25,
                "max_tokens": 1400,
            },
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"{provider.title()} API error ({resp.status_code}): {resp.text[:400]}")
        data = resp.json()
        choices = data.get("choices") or []
        if not choices:
            raise RuntimeError(f"{provider.title()} returned empty choices.")
        answer = (choices[0].get("message", {}).get("content") or "").strip()
        return answer, f"{provider}/{model}", {"vision_attached": vision_used, "provider": provider}
