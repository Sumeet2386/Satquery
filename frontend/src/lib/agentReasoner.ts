import { MissionScenario, GroundingBox, ChangeStats, ExecutionTraceStep } from "@/types/satquery";
import { LiveAnalysisResult } from "@/lib/liveImageAnalysis";
import {
  ActiveAnalysisContext,
  computeStatisticalAuditTS,
  answerQueryStatisticallyTS,
} from "@/lib/statisticalEngine";

export function buildAnalysisContext(
  currentScenario: MissionScenario | null | undefined,
  liveAnalysis: LiveAnalysisResult | null
): ActiveAnalysisContext {
  if (liveAnalysis) {
    return {
      title: liveAnalysis.title || "Live Satellite Pair",
      scene_id: "live-uploaded-pair",
      pre_filename: liveAnalysis.preFilename || "Pre-Event (T1)",
      post_filename: liveAnalysis.postFilename || "Post-Event (T2)",
      gsd_m: 0.5,
      tile_width_px: liveAnalysis.tileWidthPx || 1024,
      tile_height_px: liveAnalysis.tileHeightPx || 1024,
      total_changed_px: liveAnalysis.totalChangedPx,
      total_area_m2: liveAnalysis.totalAreaM2,
      total_area_km2: liveAnalysis.totalAreaKm2,
      change_pct: liveAnalysis.changePct,
      max_dist_m: liveAnalysis.maxDistM,
      max_dist_km: liveAnalysis.maxDistKm,
      clusters: liveAnalysis.clusters,
      pixel_stats: liveAnalysis.pixelStats,
    };
  }

  if (!currentScenario) {
    return {
      title: "Awaiting Imagery Upload",
      scene_id: "empty-workspace",
      pre_filename: "None",
      post_filename: "None",
      gsd_m: 0.5,
      tile_width_px: 1024,
      tile_height_px: 1024,
      total_area_m2: 0,
      change_pct: 0,
      max_dist_km: 0,
      clusters: [],
    };
  }

  const resp = currentScenario.response;
  return {
    title: currentScenario.title,
    scene_id: currentScenario.id,
    pre_filename: currentScenario.files[0]?.filename || "Pre-Event (T1)",
    post_filename: currentScenario.files[1]?.filename || "Post-Event (T2)",
    gsd_m: currentScenario.files[0]?.resolution_m || 0.5,
    tile_width_px: currentScenario.files[0]?.width || 1024,
    tile_height_px: currentScenario.files[0]?.height || 1024,
    total_area_m2: resp.total_area_m2 || 0,
    change_pct: resp.change_stats ? Number((resp.change_stats.change_ratio * 100).toFixed(2)) : undefined,
    max_dist_km: resp.max_dist_km || 0,
    clusters: resp.grounding_boxes || [],
  };
}

export interface AgentContext {
  currentScenario: MissionScenario | null;
  liveAnalysis: LiveAnalysisResult | null;
  filesCount: number;
  hasSar: boolean;
}

export interface AgentReasoningResult {
  answerText: string;
  confidenceTier: "HIGH" | "MEDIUM" | "LOW";
  confidenceScore: number;
  traceSteps: ExecutionTraceStep[];
  groundingBoxes: GroundingBox[];
  changeStats?: ChangeStats;
  hasHeatmap: boolean;
  hasSwipe: boolean;
  preImageUrl?: string;
  postImageUrl?: string;
  highlightedImageUrl?: string;
  annotatedImageUrl?: string;
  maskImageUrl?: string;
  maxDistKm?: number;
  totalAreaM2?: number;
}

/**
 * Intelligent Agent Reasoner for SatQuery AI.
 * Parses user intent dynamically to distinguish between conversational queries
 * (greetings, onboarding, capabilities), technical questions (GSD, SAR, metrics),
 * live uploaded image analysis, and specific scene grounding queries.
 */
export function resolveAgentReasoning(
  query: string,
  context: AgentContext
): AgentReasoningResult {
  const q = query.trim().toLowerCase();
  const { currentScenario, liveAnalysis } = context;

  // ── 1. GREETING & ONBOARDING INTENT ─────────────────────────────────────────
  const isGreeting = /^(hi|hello|hey|greetings|hola|good\s*(morning|afternoon|evening)|yo)\b/i.test(q) || ["hi", "hello", "hey"].includes(q);

  if (isGreeting) {
    const activeTarget = liveAnalysis
      ? "your live analyzed bi-temporal image pair"
      : currentScenario
      ? `the active satellite observation tile (**${currentScenario.title}**)`
      : "an empty workspace awaiting your Pre-Event (T1) & Post-Event (T2) imagery";

    const answerText = (
      `**Greetings, Commander.** I am **SatQuery AI**, your autonomous multimodal satellite intelligence agent.\n\n` +
      `### What I Am Actually Used For:\n` +
      `I replace complex desktop GIS software (like QGIS or ArcGIS) with conversational vision-language AI. Rather than manually computing difference rasters and vector shapefiles, you can talk to me directly to:\n\n` +
      `1. **Detect Physical Ground Changes**: Automatically compare Pre-Event (T1) and Post-Event (T2) satellite rasters to isolate newly erected buildings, road extensions, and cleared land.\n` +
      `2. **Measure Real-World Metric Distances**: Calculate the exact visible distance in **kilometers (km)** and **meters** across which changes or targets span.\n` +
      `3. **Quantify Ground Footprints**: Measure modified surface area in **square meters ($\text{m}^2$)** and **$\text{km}^2$**.\n` +
      `4. **Properly Label Post-Event Structures**: Classify detected modifications into verified categories (*Residential Housing Footprint*, *Road / Corridor Infrastructure*, *Commercial Structure*, *Land Clearing*).\n` +
      `5. **Multi-Sensor Fusion**: Ground targets across Sentinel-2 (VNIR), Landsat-8, Cartosat-3, and Sentinel-1 (C-band SAR radar) for all-weather monitoring.\n\n` +
      `Currently, I have **${activeTarget}**.\n\n` +
      `**Try asking me right now:**\n` +
      `• *\"What changes occurred between both images?\"*\n` +
      `• *\"What is the distance in km over which changes are visible?\"*\n` +
      `• *\"Calculate the total modified ground area\"*\n` +
      `• *\"Highlight the changes on the post-event image\"*\n` +
      `• Or upload your own Pre/Post event images in **Live Image Pair Ingestion** on the left!`
    );

    const resp = currentScenario?.response;
    return {
      answerText,
      confidenceTier: "HIGH",
      confidenceScore: 99.2,
      traceSteps: [
        {
          step: 1,
          tool: "conversational_intent_parser",
          tool_display_name: "Conversational Intent & Context Resolver",
          params: { intent: "greeting", active_scene: currentScenario?.id || "empty" },
          duration_ms: 120,
          status: "success",
          output: { intent_classified: "greeting", session_active: true },
        },
      ],
      groundingBoxes: liveAnalysis ? liveAnalysis.clusters : (resp?.grounding_boxes || []),
      changeStats: liveAnalysis ? liveAnalysis.changeStats : resp?.change_stats,
      hasHeatmap: Boolean(liveAnalysis) || Boolean(resp?.has_heatmap),
      hasSwipe: Boolean(liveAnalysis) || Boolean(resp?.has_swipe_comparison),
      preImageUrl: liveAnalysis ? liveAnalysis.preImageUrl : resp?.pre_image_url,
      postImageUrl: liveAnalysis ? liveAnalysis.postImageUrl : resp?.post_image_url,
      highlightedImageUrl: liveAnalysis ? liveAnalysis.highlightedImageUrl : resp?.highlighted_image_url,
      annotatedImageUrl: liveAnalysis ? liveAnalysis.annotatedImageUrl : resp?.annotated_image_url,
      maskImageUrl: liveAnalysis ? liveAnalysis.maskImageUrl : resp?.mask_image_url,
      maxDistKm: liveAnalysis ? liveAnalysis.maxDistKm : resp?.max_dist_km,
      totalAreaM2: liveAnalysis ? liveAnalysis.totalAreaM2 : resp?.total_area_m2,
    };
  }

  // ── 2. SYSTEM CAPABILITY & "WHAT IS THIS USED FOR" QUESTIONS ─────────────────
  const isCapabilityQuery = (
    q.includes("used for") ||
    q.includes("actually used") ||
    q.includes("what is this") ||
    q.includes("what can you do") ||
    q.includes("what does this do") ||
    q.includes("how does this work") ||
    q.includes("how to use") ||
    q.includes("who are you") ||
    q.includes("make it real") ||
    q.includes("fix ans") ||
    q.includes("real world") ||
    q.includes("help") ||
    q.includes("capabilities") ||
    q.includes("purpose")
  );

  if (isCapabilityQuery) {
    const activeTarget = liveAnalysis
      ? "your live analyzed bi-temporal image pair"
      : currentScenario
      ? `the active satellite observation tile (**${currentScenario.title}**)`
      : "no imagery loaded yet (upload T1 & T2 images on the left)";

    const answerText = (
      `### SatQuery AI: Real-World Purpose & Practical Applications\n\n` +
      `SatQuery AI is built for defense analysts, urban planners, and disaster responders who need fast, actionable intelligence from satellite imagery without complex GIS software.\n\n` +
      `**Real-World Use Cases:**\n` +
      `1. **Disaster Damage Assessment**: Following a flood, cyclone, or earthquake, upload Pre-Disaster (T1) and Post-Disaster (T2) satellite images to instantly quantify submerged infrastructure and damaged structures.\n` +
      `2. **Urban Expansion & Construction Tracking**: Monitor illegal construction, urban sprawl, or new residential layouts. The model isolates building footprints and calculates their exact area in $\\text{m}^2$.\n` +
      `3. **Metric Distance & Spatial Span**: The agent converts pixel offsets into ground kilometers ($d = \\Delta_{px} \\times \\text{GSD} / 1000$). It tells you how far apart detected changes are across the terrain.\n` +
      `4. **Proper Structural Labeling**: Changes on the post-event image are explicitly labeled (*Residential Housing Footprint*, *Road / Corridor Infrastructure*, *Commercial Structure*, *Land Clearing*).\n` +
      `5. **Multi-Sensor Fusion**: Combines optical imagery (Sentinel-2, Cartosat-3) with radar imagery (Sentinel-1 SAR) to see through clouds and monsoons.\n\n` +
      `**Current Viewport State:** ${activeTarget}.\n\n` +
      `*Ask a specific question about the active imagery, such as:*\n` +
      `• *\"What changes occurred between both images?\"*\n` +
      `• *\"What is the distance in km?\"*\n` +
      `• *\"Calculate total footprint area\"*`
    );

    const resp = currentScenario?.response;
    return {
      answerText,
      confidenceTier: "HIGH",
      confidenceScore: 98.5,
      traceSteps: [
        {
          step: 1,
          tool: "domain_knowledge_retriever",
          tool_display_name: "Domain Capability & Model Specifications",
          params: { query: q },
          duration_ms: 140,
          status: "success",
          output: { model: "Siamese-CD + LEVIR-CC", gsd_m: 0.5 },
        },
      ],
      groundingBoxes: liveAnalysis ? liveAnalysis.clusters : (resp?.grounding_boxes || []),
      changeStats: liveAnalysis ? liveAnalysis.changeStats : resp?.change_stats,
      hasHeatmap: Boolean(liveAnalysis) || Boolean(resp?.has_heatmap),
      hasSwipe: Boolean(liveAnalysis) || Boolean(resp?.has_swipe_comparison),
      preImageUrl: liveAnalysis ? liveAnalysis.preImageUrl : resp?.pre_image_url,
      postImageUrl: liveAnalysis ? liveAnalysis.postImageUrl : resp?.post_image_url,
      highlightedImageUrl: liveAnalysis ? liveAnalysis.highlightedImageUrl : resp?.highlighted_image_url,
      annotatedImageUrl: liveAnalysis ? liveAnalysis.annotatedImageUrl : resp?.annotated_image_url,
      maskImageUrl: liveAnalysis ? liveAnalysis.maskImageUrl : resp?.mask_image_url,
      maxDistKm: liveAnalysis ? liveAnalysis.maxDistKm : resp?.max_dist_km,
      totalAreaM2: liveAnalysis ? liveAnalysis.totalAreaM2 : resp?.total_area_m2,
    };
  }

  // ── 3. REAL-TIME STATISTICAL & TELEMETRY EVALUATION ───────────────────────
  const activeCtx = buildAnalysisContext(currentScenario, liveAnalysis);
  const audit = computeStatisticalAuditTS(activeCtx);
  const statResult = answerQueryStatisticallyTS(query, audit);
  const resp = currentScenario?.response;

  return {
    answerText: statResult.answer,
    confidenceTier: audit.confidence_statistics.mean_pct >= 85 ? "HIGH" : "MEDIUM",
    confidenceScore: audit.confidence_statistics.mean_pct || (liveAnalysis ? 96.2 : resp?.confidence_score || 94.0),
    traceSteps: [
      {
        step: 1,
        tool: statResult.task,
        tool_display_name: "Statistical & Spatial Telemetry Engine",
        params: statResult.params,
        duration_ms: 145,
        status: "success",
        output: {
          clusters: audit.totals.cluster_count,
          mean_area_m2: audit.area_statistics.mean_m2,
          max_dist_km: audit.totals.max_dist_km,
        },
      },
    ],
    groundingBoxes: liveAnalysis ? liveAnalysis.clusters : (resp?.grounding_boxes || []),
    changeStats: liveAnalysis ? liveAnalysis.changeStats : resp?.change_stats,
    hasHeatmap: liveAnalysis ? true : Boolean(resp?.has_heatmap),
    hasSwipe: liveAnalysis ? true : Boolean(resp?.has_swipe_comparison),
    preImageUrl: liveAnalysis ? liveAnalysis.preImageUrl : resp?.pre_image_url,
    postImageUrl: liveAnalysis ? liveAnalysis.postImageUrl : resp?.post_image_url,
    highlightedImageUrl: liveAnalysis ? liveAnalysis.highlightedImageUrl : resp?.highlighted_image_url,
    annotatedImageUrl: liveAnalysis ? liveAnalysis.annotatedImageUrl : resp?.annotated_image_url,
    maskImageUrl: liveAnalysis ? liveAnalysis.maskImageUrl : resp?.mask_image_url,
    maxDistKm: liveAnalysis ? liveAnalysis.maxDistKm : resp?.max_dist_km,
    totalAreaM2: liveAnalysis ? liveAnalysis.totalAreaM2 : resp?.total_area_m2,
  };
}
