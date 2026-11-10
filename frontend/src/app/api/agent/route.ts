import { NextRequest, NextResponse } from "next/server";
import { computeStatisticalAuditTS, answerQueryStatisticallyTS } from "@/lib/statisticalEngine";

const SYSTEM_INSTRUCTIONS = `You are **SatQuery AI**, a real-world multimodal geospatial & remote-sensing intelligence agent.

You are analyzing a bi-temporal satellite image pair (Pre-Event T1 vs Post-Event T2) alongside exact computer-vision and statistical telemetry.

STRICT RULES:
1. Answer the user's EXACT question directly, thoroughly, and conversationally — never return generic boilerplate when asked a specific question.
2. Whenever quantitative or statistical analysis is relevant (areas, distances, percentages, mean, median, std dev, IQR, Z-scores, quadrant distributions, nearest-neighbor spacing, model F1/IoU/recall/precision, unit conversions, GSD sensitivity), use the EXACT numbers from the TELEMETRY AUDIT JSON below. Never fabricate measurements.
3. Explicitly distinguish Pre-Event (T1 Baseline) vs Post-Event (T2 Target) and explain the actual physical difference (Δ Delta) when analyzing changes.
4. When T1 and T2 images are attached, inspect both images visually and combine your observations with the exact telemetry.
5. Format responses cleanly in GitHub-style Markdown with headings, bullet points, and tables where helpful.`;

function stripDataUrl(b64: string): { mime: string; data: string } {
  const m = b64.trim().match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (m) return { mime: m[1], data: m[2] };
  return { mime: "image/jpeg", data: b64.trim() };
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const body = await req.json();

    // Connection test mode
    if (body.action === "test") {
      const cfg = body.llm_config || {};
      const testRes = await invokeLLM({
        query: "Reply in one brief sentence confirming you are connected as SatQuery AI.",
        systemPrompt: SYSTEM_INSTRUCTIONS,
        llmConfig: cfg,
        history: [],
      });
      return NextResponse.json({
        ok: true,
        provider: cfg.provider,
        model: testRes.modelUsed,
        message: testRes.answer.slice(0, 240),
      });
    }

    const query: string = body.query || "";
    const audit = computeStatisticalAuditTS(body.analysis_context);
    const llmConfig = body.llm_config || {};
    const provider = (llmConfig.provider || "statistical").toLowerCase();
    const history = Array.isArray(body.conversation_history) ? body.conversation_history.slice(-8) : [];

    const clusterLines =
      audit.clusters
        .slice(0, 25)
        .map(
          (c) =>
            `  - Cluster #${c.index} (${c.label}, category=${c.category}): T1=0 m² -> T2=+${c.area_m2} m² (Δ Area = +${c.area_m2} m²), Span=${c.span_m} m (${c.span_km} km), Quadrant=${c.quadrant}, Confidence=${c.confidence}%`
        )
        .join("\n") || "  - None (no image pair loaded yet)";

    const factSheet =
      `VERIFIED PRE-COMPUTED SCENE FACT SHEET (USE THESE EXACT NUMBERS; EACH CLUSTER IS NET CHANGE T1=0 -> T2=+area_m2):\n` +
      `- Scene: ${audit.scene_title} | Pre (T1): ${audit.pre_filename} | Post (T2): ${audit.post_filename}\n` +
      `- Total Detected Change Clusters: ${audit.totals.cluster_count}\n` +
      `- Total Net Added Ground Area (Δ T1->T2): +${audit.totals.total_area_m2} m² (+${audit.totals.total_area_km2} km² / ${audit.totals.total_area_hectares} ha / ${audit.totals.change_pct}% of tile modified)\n` +
      `- Visible Max Spatial Span: ${audit.totals.max_dist_km} km (${audit.totals.max_dist_m} m)\n` +
      `- Descriptive Cluster Area Statistics: Mean = ${audit.area_statistics.mean_m2} m², Median = ${audit.area_statistics.median_m2} m², Std Dev (σ) = ${audit.area_statistics.std_dev_m2} m², IQR = ${audit.area_statistics.iqr_m2} m², Min = ${audit.area_statistics.min_m2} m², Max = ${audit.area_statistics.max_m2} m²\n` +
      `- Individual Added Change Clusters:\n${clusterLines}\n\n`;

    const telemetryBlock =
      factSheet +
      "TELEMETRY AUDIT JSON (VERIFIED GROUND TRUTH):\n```json\n" +
      JSON.stringify(
        {
          scene_title: audit.scene_title,
          pre_filename: audit.pre_filename,
          post_filename: audit.post_filename,
          gsd_m: audit.gsd_m,
          tile: audit.tile,
          totals: audit.totals,
          area_statistics: audit.area_statistics,
          spatial_statistics: audit.spatial_statistics,
          confidence_statistics: audit.confidence_statistics,
          category_breakdown: audit.category_breakdown,
          pixel_stats: audit.pixel_stats,
          clusters: audit.clusters.slice(0, 25),
        },
        null,
        2
      ) +
      "\n```";

    let answer = "";
    let modelName = "SatQuery Statistical Engine v2";
    let selectedTask = "statistical_query_evaluation";
    let selectedTool = "ts_spatial_stats_engine";
    let agentMode = "statistical_engine";
    let llmErrorNote = "";

    const hasCreds = provider !== "statistical" && (Boolean(llmConfig.api_key) || provider === "ollama");
    if (hasCreds) {
      try {
        const res = await invokeLLM({
          query,
          systemPrompt: `${SYSTEM_INSTRUCTIONS}\n\n${telemetryBlock}`,
          llmConfig,
          history,
          preImageB64: body.pre_image_b64,
          postImageB64: body.post_image_b64,
        });
        answer = res.answer;
        modelName = res.modelUsed;
        selectedTask = res.visionUsed ? "multimodal_llm_reasoning" : "llm_telemetry_reasoning";
        selectedTool = `real_world_llm_${provider}`;
        agentMode = `llm:${provider}`;
      } catch (err: any) {
        llmErrorNote = err?.message || "External LLM request failed";
      }
    }

    if (!answer) {
      const stat = answerQueryStatisticallyTS(query, audit);
      answer = llmErrorNote
        ? `> **Note**: External LLM (\`${provider}\`) failed (\`${llmErrorNote.slice(0, 140)}\`). Answered via **Real-Time Statistical Engine**:\n\n${stat.answer}`
        : stat.answer;
      selectedTask = stat.task;
    }

    const latency = Number(((Date.now() - t0) / 1000).toFixed(3));
    const confNorm = Number(Math.min(0.99, Math.max(0.5, (audit.confidence_statistics.mean_pct || 94) / 100)).toFixed(3));

    return NextResponse.json({
      status: "success",
      query,
      answer,
      confidence: confNorm,
      tier: confNorm >= 0.85 ? "HIGH" : confNorm >= 0.65 ? "MEDIUM" : "LOW",
      icon: agentMode.startsWith("llm:") ? "Sparkles" : "Bot",
      change_percentage: audit.totals.change_pct,
      agent_mode: agentMode,
      statistical_audit: audit,
      execution_trace: {
        trace_id: `trc_next_${Date.now().toString(36)}`,
        timestamp: new Date().toLocaleTimeString([], { hour12: false }),
        query,
        selected_task: selectedTask,
        model_name: modelName,
        selected_tool: selectedTool,
        permitted_parameters: { gsd_m: audit.gsd_m, clusters: audit.totals.cluster_count },
        input_summary: {
          scene: audit.scene_title,
          clusters: audit.totals.cluster_count,
          total_area_m2: audit.totals.total_area_m2,
        },
        confidence: confNorm,
        latency_seconds: latency,
        orchestrator: `SatQuery-NextAgent-v3 (${agentMode})`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Internal agent error" }, { status: 500 });
  }
}

async function invokeLLM(opts: {
  query: string;
  systemPrompt: string;
  llmConfig: any;
  history: Array<{ role: string; content: string }>;
  preImageB64?: string;
  postImageB64?: string;
}): Promise<{ answer: string; modelUsed: string; visionUsed: boolean }> {
  const { query, systemPrompt, llmConfig, history, preImageB64, postImageB64 } = opts;
  const provider = (llmConfig.provider || "").toLowerCase();
  const apiKey = (llmConfig.api_key || "").trim();
  const model = (llmConfig.model || "").trim();
  const baseUrl = (llmConfig.base_url || "").trim();
  const enableVision = llmConfig.enable_vision !== false;
  const hasImages = enableVision && Boolean(preImageB64 && postImageB64);

  if (provider === "gemini") {
    const chosenModel = model || "gemini-2.5-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${apiKey}`;
    const contents: any[] = history
      .filter((h) => h.content?.trim())
      .map((h) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content.slice(0, 2000) }],
      }));
    const userParts: any[] = [{ text: query }];
    if (hasImages) {
      const a = stripDataUrl(preImageB64!);
      const b = stripDataUrl(postImageB64!);
      userParts.push(
        { text: "[Image 1: Pre-Event T1 Baseline]" },
        { inline_data: { mime_type: a.mime, data: a.data } },
        { text: "[Image 2: Post-Event T2 Target]" },
        { inline_data: { mime_type: b.mime, data: b.data } }
      );
    }
    contents.push({ role: "user", parts: userParts });

    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.25, maxOutputTokens: 1400 },
      }),
    });
    if (!r.ok) throw new Error(`Gemini (${r.status}): ${(await r.text()).slice(0, 300)}`);
    const data = await r.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const answer = parts.map((p: any) => p.text || "").join("\n").trim();
    if (!answer) throw new Error("Gemini returned empty text");
    return { answer, modelUsed: `gemini/${chosenModel}`, visionUsed: hasImages };
  }

  if (provider === "anthropic") {
    const chosenModel = model || "claude-3-5-sonnet-latest";
    const messages: any[] = history
      .filter((h) => h.content?.trim())
      .map((h) => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content.slice(0, 2000) }));
    let userContent: any = query;
    if (hasImages) {
      const a = stripDataUrl(preImageB64!);
      const b = stripDataUrl(postImageB64!);
      userContent = [
        { type: "text", text: `${query}\n\n[Image 1: Pre-Event T1 Baseline]` },
        { type: "image", source: { type: "base64", media_type: a.mime, data: a.data } },
        { type: "text", text: "[Image 2: Post-Event T2 Target]" },
        { type: "image", source: { type: "base64", media_type: b.mime, data: b.data } },
      ];
    }
    messages.push({ role: "user", content: userContent });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: chosenModel, max_tokens: 1400, temperature: 0.25, system: systemPrompt, messages }),
    });
    if (!r.ok) throw new Error(`Anthropic (${r.status}): ${(await r.text()).slice(0, 300)}`);
    const data = await r.json();
    const answer = (data?.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
    if (!answer) throw new Error("Anthropic returned empty text");
    return { answer, modelUsed: `anthropic/${chosenModel}`, visionUsed: hasImages };
  }

  if (provider === "ollama") {
    const chosenModel = model || "llama3.2";
    const base = (baseUrl || "http://localhost:11434").replace(/\/$/, "");
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...history.filter((h) => h.content?.trim()).map((h) => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content.slice(0, 2000) })),
    ];
    const isVision = /(llava|vision|minicpm|qwen2\.5vl|qwen2-vl|gemma3)/i.test(chosenModel);
    const userMsg: any = { role: "user", content: query };
    if (hasImages && isVision) {
      userMsg.images = [stripDataUrl(preImageB64!).data, stripDataUrl(postImageB64!).data];
    }
    messages.push(userMsg);

    const r = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: chosenModel, messages, stream: false, keep_alive: "30m", options: { temperature: 0.2 } }),
    });
    if (!r.ok) throw new Error(`Ollama (${r.status}): ${(await r.text()).slice(0, 300)}`);
    const data = await r.json();
    const answer = (data?.message?.content || "").trim();
    if (!answer) throw new Error("Ollama returned empty response");
    return { answer, modelUsed: `ollama/${chosenModel}`, visionUsed: Boolean(userMsg.images) };
  }

  // OpenAI / Groq / OpenRouter / Custom
  const endpointMap: Record<string, string> = {
    openai: "https://api.openai.com/v1/chat/completions",
    groq: "https://api.groq.com/openai/v1/chat/completions",
    openrouter: "https://openrouter.ai/api/v1/chat/completions",
  };
  const endpoint = baseUrl
    ? baseUrl.replace(/\/$/, "").endsWith("/chat/completions")
      ? baseUrl.replace(/\/$/, "")
      : `${baseUrl.replace(/\/$/, "")}/chat/completions`
    : endpointMap[provider] || endpointMap.openai;
  const chosenModel = model || (provider === "groq" ? "llama-3.3-70b-versatile" : "gpt-4o-mini");

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...history.filter((h) => h.content?.trim()).map((h) => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content.slice(0, 2000) })),
  ];
  const supportsVision = provider !== "groq" && hasImages;
  if (supportsVision) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: `${query}\n\n[Image 1: Pre-Event T1 Baseline]` },
        { type: "image_url", image_url: { url: preImageB64 } },
        { type: "text", text: "[Image 2: Post-Event T2 Target]" },
        { type: "image_url", image_url: { url: postImageB64 } },
      ],
    });
  } else {
    messages.push({ role: "user", content: query });
  }

  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: chosenModel, messages, temperature: 0.25, max_tokens: 1400 }),
  });
  if (!r.ok) throw new Error(`${provider} (${r.status}): ${(await r.text()).slice(0, 300)}`);
  const data = await r.json();
  const answer = (data?.choices?.[0]?.message?.content || "").trim();
  if (!answer) throw new Error(`${provider} returned empty response`);
  return { answer, modelUsed: `${provider}/${chosenModel}`, visionUsed: supportsVision };
}
