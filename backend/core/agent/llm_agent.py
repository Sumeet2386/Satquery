"""SatQuery AI — Real-World Multimodal LLM & Tool-Grounded Agent.

Supports Google Gemini, OpenAI, Anthropic Claude, Groq, OpenRouter,
and local Ollama via httpx. Grounds every LLM response strictly in
real-time satellite statistical telemetry and optional T1/T2 vision frames.
"""

from __future__ import annotations

import ipaddress
import json
import re
import socket
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse
import httpx
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


def _validate_llm_endpoint(base_url: str, provider: str) -> str:
    """Validate user-supplied LLM endpoint URL to mitigate SSRF attacks."""
    clean = (base_url or "").strip().rstrip("/")
    if not clean:
        return ""
    parsed = urlparse(clean)
    host = (parsed.hostname or "").lower()

    if provider == "ollama":
        allowed_ollama_hosts = {"localhost", "127.0.0.1"}
        if parsed.scheme not in ("http", "https") or host not in allowed_ollama_hosts:
            raise ValueError("Ollama base_url must point strictly to localhost or 127.0.0.1.")
        port = parsed.port or 11434
        if port != 11434:
            raise ValueError("Ollama base_url port must be 11434.")
        return clean

    # Custom OpenAI-compatible endpoints must use HTTPS and public non-internal IPs
    if parsed.scheme != "https" or not host:
        raise ValueError("Custom endpoint base_url must use HTTPS.")
    if host in ("localhost", "ip6-localhost") or host.endswith(".local") or host.endswith(".internal"):
        raise ValueError("Custom endpoint host cannot target local/internal domains.")

    try:
        infos = socket.getaddrinfo(host, parsed.port or 443, type=socket.SOCK_STREAM)
        for info in infos:
            ip_obj = ipaddress.ip_address(info[4][0])
            if (
                ip_obj.is_private
                or ip_obj.is_loopback
                or ip_obj.is_link_local
                or ip_obj.is_reserved
                or ip_obj.is_multicast
                or ip_obj.is_unspecified
            ):
                raise ValueError("Custom endpoint cannot resolve to private, loopback, or metadata IP addresses.")
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"Could not resolve custom endpoint host: {exc}") from exc

    return clean


SYSTEM_INSTRUCTIONS = """You are **SatQuery AI**, a real-world multimodal geospatial & remote-sensing intelligence AI agent powered by an LLM.

You have access to exact live telemetry & statistics computed from the active satellite image pair (Pre-Event T1 vs Post-Event T2) when imagery is loaded, AND full general remote-sensing / scientific / geospatial knowledge.

CORE RESPONSE PRINCIPLES:
1. **Answer EVERY query directly, clearly, and thoroughly** — whether the user asks about the active satellite images, statistical metrics, GIS/remote-sensing theory, urban planning, disaster response, math conversions, or general follow-up questions. Never refuse or give a canned generic summary.
2. **Every Detected Cluster = Net Change Added (T1 ➔ T2)**: Each cluster in the telemetry represents a **detected physical change** between Pre-Event (T1) and Post-Event (T2). That means before the event (T1) those modified pixels had **0 m²** of new structure, and post-event (T2) they gained **+area_m2** (so $\Delta\text{Area} = +\text{area\_m2}$, NEVER 0!).
3. **Always Cite Exact Pre-Computed Statistics**: Copy `total_area_m2`, `change_pct`, `max_dist_km`, `mean_m2`, `median_m2`, `std_dev_m2`, `iqr_m2`, quadrant counts, and cluster values verbatim from the VERIFIED TELEMETRY SUMMARY & JSON below. Never recalculate or replace them with 0.0.
4. **No Imagery Loaded Yet**: If `cluster_count == 0` and no image pair is loaded, still answer the user's question helpfully using your full AI knowledge (and briefly note if scene-specific measurements require uploading a T1/T2 pair).
5. **Multimodal Vision**: When T1 and T2 images are attached, inspect both visually and combine visual observations with statistical telemetry.
6. **Formatting**: Use clean GitHub-style Markdown (concise headings, bullet points, and Markdown tables when comparing metrics or clusters)."""


def _strip_data_url_prefix(b64_str: str) -> Tuple[str, str]:
    """Extract (mime_type, raw_base64) from a data URL or raw base64 string."""
    match = re.match(r"^data:([^;]+);base64,(.+)$", b64_str.strip(), re.DOTALL)
    if match:
        return match.group(1), match.group(2)
    return "image/jpeg", b64_str.strip()


async def detect_local_ollama_model(base_url: str = "") -> Optional[str]:
    """Probe local Ollama daemon and return an available model name if running."""
    ollama_base = (base_url or settings.OLLAMA_BASE_URL or "http://localhost:11434").rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            resp = await client.get(f"{ollama_base}/api/tags")
            if resp.status_code == 200:
                models = [m.get("name", "") for m in resp.json().get("models", []) if m.get("name")]
                if models:
                    for preferred in ["llama3.2", "qwen2.5", "llava", "llama3"]:
                        for m in models:
                            if preferred in m.lower():
                                return m
                    return models[0]
    except Exception:
        return None
    return None


async def resolve_effective_llm_config(request_llm_config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Resolve explicit LLM config, env keys, or auto-detected local Ollama LLM."""
    cfg = resolve_active_llm_config(request_llm_config)
    req_provider = ((request_llm_config or {}).get("provider") or "").strip().lower()
    if cfg["provider"] == "statistical" and req_provider != "statistical":
        ollama_model = await detect_local_ollama_model()
        if ollama_model:
            return {
                "provider": "ollama",
                "api_key": "",
                "model": ollama_model,
                "base_url": settings.OLLAMA_BASE_URL or "http://localhost:11434",
                "enable_vision": True,
            }
    return cfg


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
    """Build a compact, token-efficient Ground Truth Fact Sheet for high accuracy & low latency."""
    totals = audit.get("totals", {})
    area_s = audit.get("area_statistics", {})
    spatial = audit.get("spatial_statistics", {})
    conf = audit.get("confidence_statistics", {})
    cats = audit.get("category_breakdown", {})
    px = audit.get("pixel_stats") or {}
    mm = audit.get("model_metrics") or {}
    clusters = audit.get("clusters") or []

    quad_summary = ", ".join(
        f"{qn}={qd['count']} ({qd['area_m2']} m², {qd['pct_of_changed_area']}%)"
        for qn, qd in (spatial.get("quadrants") or {}).items()
        if qd.get("count", 0) > 0
    ) or "None"

    cat_summary = ", ".join(
        f"{cat}={cd['count']} ({cd['area_m2']} m², {cd['pct_of_area']}%)"
        for cat, cd in cats.items()
    ) or "None"

    cluster_table = "\n".join(
        f"#{c['index']} | {c['label']} | {c['category']} | Δ=+{c['area_m2']} m² | span={c['span_m']}m ({c['span_km']}km) | {c['quadrant']} | {c['confidence']}%"
        for c in clusters[:20]
    ) or "None (no imagery loaded)"

    px_line = (
        f"- Radiometrics: T1 mean lum={px.get('meanLumPre', 0)}, T2 mean lum={px.get('meanLumPost', 0)} (shift {px.get('lumShift', 0):+}), "
        f"RGB delta=({px.get('meanRgbDelta', {}).get('r', 0)}, {px.get('meanRgbDelta', {}).get('g', 0)}, {px.get('meanRgbDelta', {}).get('b', 0)}), Otsu={px.get('otsuThreshold', 'N/A')}\n"
        if px else ""
    )

    return (
        f"VERIFIED SCENE TELEMETRY (COPY EXACT NUMBERS & CONVERSIONS VERBATIM; DO NOT RECALCULATE UNITS):\n"
        f"- Scene: {audit.get('scene_title')} | T1={audit.get('pre_filename')} | T2={audit.get('post_filename')} | GSD={audit.get('gsd_m')} m/px | Tile={audit.get('tile', {}).get('width_km', 0.512)}x{audit.get('tile', {}).get('height_km', 0.512)} km ({audit.get('tile', {}).get('area_km2', 0.2621)} km²)\n"
        f"- Net Change (T1->T2): +{totals.get('total_area_m2', 0)} m² = +{totals.get('total_area_km2', 0)} km² = {totals.get('total_area_hectares', 0)} hectares = {totals.get('total_area_acres', 0)} acres ({totals.get('change_pct', 0)}% changed; {totals.get('unchanged_pct', 100)}% / {totals.get('unchanged_area_m2', 0)} m² unchanged)\n"
        f"- Clusters & Span: N={totals.get('cluster_count', 0)} clusters | Max Span={totals.get('max_dist_km', 0)} km ({totals.get('max_dist_m', 0)} m) | Density={totals.get('cluster_density_per_km2', 0)}/km²\n"
        f"- Area Stats: Mean={area_s.get('mean_m2', 0)} m², Median={area_s.get('median_m2', 0)} m², StdDev(σ)={area_s.get('std_dev_m2', 0)} m², IQR={area_s.get('iqr_m2', 0)} m² (Q1={area_s.get('q1_m2', 0)}, Q3={area_s.get('q3_m2', 0)}), Min={area_s.get('min_m2', 0)} m², Max={area_s.get('max_m2', 0)} m², CV={area_s.get('cv_pct', 0)}%, Skew={area_s.get('skewness', 0)}\n"
        f"- Spatial & Confidence: MeanSpan={spatial.get('mean_cluster_span_m', 0)} m | NearestNeighborMean={spatial.get('nearest_neighbor_mean_m', 0)} m | MeanConf={conf.get('mean_pct', 0)}% ({conf.get('min_pct', 0)}-{conf.get('max_pct', 0)}%)\n"
        f"- Quadrants: {quad_summary}\n"
        f"- Categories: {cat_summary}\n"
        f"{px_line}"
        f"- Model Validation (LEVIR-CC): Recall={round((mm.get('val_recall') or 0.9227)*100, 2)}%, F1={mm.get('best_f1', 0.7051)}, IoU={mm.get('val_iou', 0.5445)}, ClsAcc={round((mm.get('val_cls_acc') or 0.8067)*100, 2)}%\n"
        f"- Added Change Clusters (each starts at T1=0 m² -> T2=+Δ m²):\n{cluster_table}"
    )


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

    async with httpx.AsyncClient(timeout=120.0) as client:
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
            raw_ollama = (base_url or settings.OLLAMA_BASE_URL or "http://localhost:11434").rstrip("/")
            ollama_base = _validate_llm_endpoint(raw_ollama, "ollama")
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
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False,
                    "keep_alive": "30m",
                    "options": {"temperature": 0.15, "num_ctx": 2048, "num_predict": 650},
                },
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
        if provider == "custom" and base_url:
            clean_base = _validate_llm_endpoint(base_url, "custom")
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

