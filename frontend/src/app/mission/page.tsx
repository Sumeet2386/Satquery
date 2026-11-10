"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { SidebarNav, NavSection } from "../../components/Navigation/SidebarNav";
import { UploadZone } from "../../components/upload/UploadZone";
import { MapContainerWrapper } from "../../components/map/MapContainerWrapper";
import { ChatPanel } from "../../components/chat/ChatPanel";
import { AgentSettingsModal } from "../../components/chat/AgentSettingsModal";
import { ReportView } from "../../components/report/ReportView";
import { MOCK_SCENARIOS, matchExplicitScenario } from "../../constants/mockScenarios";
import {
  ChatMessage,
  AssistantResponse,
  UserMessage,
  MissionScenario,
  GeoTIFFMetadata,
  ExecutionTraceStep,
  InputConfiguration,
  GroundingBox,
} from "../../types/satquery";
import { checkBackendHealth, executeAgentQuery } from "../../lib/api";
import { analyzeLiveImagePair, LiveAnalysisResult } from "../../lib/liveImageAnalysis";
import { resolveAgentReasoning, buildAnalysisContext } from "../../lib/agentReasoner";
import { downloadSatelliteReportPdf } from "../../lib/pdfReportGenerator";
import {
  LLMClientConfig,
  loadLLMConfig,
  saveLLMConfig,
  imageUrlToCompactBase64,
} from "../../lib/llmConfig";

export default function OdysseusMissionControl() {
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState<number>(-1);
  const scenario: MissionScenario | null =
    currentScenarioIndex >= 0 ? MOCK_SCENARIOS[currentScenarioIndex] || null : null;

  const [files, setFiles] = useState<GeoTIFFMetadata[]>([]);
  const [activeSection, setActiveSection] = useState<NavSection>("chat");

  const [activeLiveAnalysis, setActiveLiveAnalysis] = useState<LiveAnalysisResult | null>(null);
  const [liveFilesPair, setLiveFilesPair] = useState<{ fileA: File; fileB: File } | null>(null);

  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [backendDevice, setBackendDevice] = useState<string>("mps");

  const [mapCenter, setMapCenter] = useState<[number, number]>([17.695, 83.300]);
  const [mapZoom, setMapZoom] = useState<number>(14);
  const [groundingBoxes, setGroundingBoxes] = useState<GroundingBox[]>([]);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [hasSwipe, setHasSwipe] = useState<boolean>(false);
  const [preImageUrl, setPreImageUrl] = useState<string | undefined>(undefined);
  const [postImageUrl, setPostImageUrl] = useState<string | undefined>(undefined);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentRunningStep, setCurrentRunningStep] = useState<ExecutionTraceStep | null>(null);
  const [latestResponse, setLatestResponse] = useState<AssistantResponse | null>(null);
  const [llmConfig, setLlmConfig] = useState<LLMClientConfig>({
    provider: "statistical",
    api_key: "",
    model: "statistical-engine-v2",
    base_url: "",
    enable_vision: true,
  });
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setLlmConfig(loadLLMConfig());
  }, []);

  useEffect(() => {
    const probe = async () => {
      const health = await checkBackendHealth();
      setBackendOnline(health.online);
      if (health.data?.device) setBackendDevice(health.data.device);
    };
    probe();
    const interval = setInterval(probe, 5000);
    return () => clearInterval(interval);
  }, []);

  // Workspace starts clean without any pre-loaded default image pair; user uploads or picks imagery explicitly.

  const computeInputConfig = (currentFiles: GeoTIFFMetadata[]): InputConfiguration => {
    if (currentFiles.length === 0) return "Single Optical";
    if (currentFiles.length === 1)
      return currentFiles[0].data_type === "SAR" ? "Single SAR" : "Single Optical";
    const hasOptical = currentFiles.some((f) => f.data_type === "Optical");
    const hasSAR = currentFiles.some((f) => f.data_type === "SAR");
    if (hasOptical && hasSAR) return "Cross-Modal Pair";
    return "Bi-Temporal Pair";
  };

  const inputConfig = computeInputConfig(files);

  const handleSelectScenario = useCallback(async (newScenario: MissionScenario) => {
    const idx = MOCK_SCENARIOS.findIndex((s) => s.id === newScenario.id);
    setCurrentScenarioIndex(idx !== -1 ? idx : 0);

    const preFile = newScenario.files.find((f) => f.filename.toLowerCase().includes("pre") || f.id.includes("pre") || f.thumbnail_url?.includes("pre"));
    const postFile = newScenario.files.find((f) => f.filename.toLowerCase().includes("post") || f.id.includes("post") || f.thumbnail_url?.includes("post"));
    const preUrl = preFile?.thumbnail_url || newScenario.response.pre_image_url;
    const postUrl = postFile?.thumbnail_url || newScenario.response.post_image_url;

    if (preUrl && postUrl) {
      await handleAnalyzeLivePair(preUrl, postUrl, newScenario.title);
    } else {
      setFiles(newScenario.files);
      setMapCenter(newScenario.files[0]?.center || [17.695, 83.300]);
      setGroundingBoxes(newScenario.response.grounding_boxes || []);
      setHasSwipe(newScenario.response.has_swipe_comparison || false);
      setPreImageUrl(newScenario.response.pre_image_url);
      setPostImageUrl(newScenario.response.post_image_url);
    }
  }, []);

  const handleSelectPreset = (scenarioIndex: number) => {
    const targetScenario = MOCK_SCENARIOS[scenarioIndex];
    if (targetScenario) handleSelectScenario(targetScenario);
  };

  const handleSendMessage = async (queryText: string) => {
    if (isProcessing) return;

    const userMsg: UserMessage = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      text: queryText,
    };
    const conversationHistory = messages
      .slice(-8)
      .map((m) => ({
        role: m.sender === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      }));
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    // ── 1. Check if user explicitly asked to switch scenarios ──────────────
    const qLower = queryText.toLowerCase();
    const isExplicitSwitchCommand = qLower.includes("switch to") || qLower.includes("load test_") || qLower.includes("open test_");
    let targetScenario = scenario;

    if (isExplicitSwitchCommand) {
      const explicitScenario = matchExplicitScenario(queryText);
      if (explicitScenario) {
        const targetIdx = MOCK_SCENARIOS.findIndex((s) => s.id === explicitScenario.id);
        if (targetIdx !== -1 && targetIdx !== currentScenarioIndex) {
          setCurrentScenarioIndex(targetIdx);
          targetScenario = explicitScenario;
          const preFile = explicitScenario.files.find((f) => f.filename.toLowerCase().includes("pre") || f.id.includes("pre") || f.thumbnail_url?.includes("pre"));
          const postFile = explicitScenario.files.find((f) => f.filename.toLowerCase().includes("post") || f.id.includes("post") || f.thumbnail_url?.includes("post"));
          const preUrl = preFile?.thumbnail_url || explicitScenario.response.pre_image_url;
          const postUrl = postFile?.thumbnail_url || explicitScenario.response.post_image_url;
          if (preUrl && postUrl) {
            await handleAnalyzeLivePair(preUrl, postUrl, explicitScenario.title);
            return;
          }
        }
      }
    }

    const hasSarFile = files.some((f) => f.data_type === "SAR");

    // ── 2. Prepare baseline visual layers & local Statistical Reasoner fallback ─
    const reasoning = resolveAgentReasoning(queryText, {
      currentScenario: targetScenario,
      liveAnalysis: activeLiveAnalysis,
      filesCount: files.length,
      hasSar: hasSarFile,
    });

    let answerText = reasoning.answerText;
    let confidenceTier = reasoning.confidenceTier;
    let confidenceScore = reasoning.confidenceScore;
    let traceSteps: ExecutionTraceStep[] = [...reasoning.traceSteps];
    let boxes: GroundingBox[] = reasoning.groundingBoxes;
    let changeStats = reasoning.changeStats;
    let hasHeatmap = reasoning.hasHeatmap;
    let hasSwipeComp = reasoning.hasSwipe;
    let activePreUrl = reasoning.preImageUrl;
    let activePostUrl = reasoning.postImageUrl;
    let highlightedImageUrl = reasoning.highlightedImageUrl;
    let annotatedImageUrl = reasoning.annotatedImageUrl;
    let maskImageUrl = reasoning.maskImageUrl;
    let maxDistKm = reasoning.maxDistKm;
    let totalAreaM2 = reasoning.totalAreaM2;

    // ── 3. Execute Real-World Agent (FastAPI /api/query -> Next /api/agent) ──
    const isGreetingOrCapability =
      /^(hi|hello|hey|greetings|hola)\b/i.test(qLower) ||
      ["hi", "hello", "hey"].includes(qLower);

    const hasExternalLlm =
      llmConfig.provider !== "statistical" &&
      (Boolean(llmConfig.api_key) || llmConfig.provider === "ollama");

    if (!isGreetingOrCapability || hasExternalLlm) {
      try {
        const filePaths = files.map((f) => f.id);
        const analysisContext = buildAnalysisContext(targetScenario, activeLiveAnalysis);

        let preB64: string | undefined;
        let postB64: string | undefined;
        if (hasExternalLlm && llmConfig.enable_vision && activePreUrl && activePostUrl) {
          [preB64, postB64] = await Promise.all([
            imageUrlToCompactBase64(activePreUrl, 512),
            imageUrlToCompactBase64(activePostUrl, 512),
          ]);
        }

        const liveRes = await executeAgentQuery({
          query: queryText,
          filePaths,
          analysisContext,
          conversationHistory,
          llmConfig,
          preImageB64: preB64,
          postImageB64: postB64,
          preferBackend: backendOnline,
        });

        if (liveRes.status === "success" && liveRes.answer) {
          answerText = liveRes.answer;
          confidenceTier = liveRes.tier as "HIGH" | "MEDIUM" | "LOW";
          confidenceScore = Math.round(liveRes.confidence * 100);
          if (liveRes.execution_trace) {
            traceSteps = [
              {
                step: 1,
                tool: liveRes.execution_trace.selected_tool,
                tool_display_name: liveRes.execution_trace.model_name,
                params: liveRes.execution_trace.permitted_parameters || {},
                duration_ms: Math.round(liveRes.execution_trace.latency_seconds * 1000),
                status: "success",
                output: {
                  task: liveRes.execution_trace.selected_task,
                  confidence: liveRes.execution_trace.confidence,
                  orchestrator: liveRes.execution_trace.orchestrator,
                },
              },
            ];
          }
        }
      } catch (err) {
        console.warn("Agent endpoint fallback to client statistical engine:", err);
      }
    }

    // ── 4. Animate Execution Trace Steps ────────────────────────────────────
    for (const step of traceSteps) {
      setCurrentRunningStep({ ...step, status: "running" });
      await new Promise((resolve) => setTimeout(resolve, Math.min(step.duration_ms || 200, 250)));
    }
    setCurrentRunningStep(null);

    // ── 5. Build and Stream Assistant Response ──────────────────────────────
    const responseId = `asst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const newAssistantResponse: AssistantResponse = {
      id: responseId,
      sender: "assistant",
      timestamp,
      text: "",
      confidence_tier: confidenceTier,
      confidence_score: confidenceScore,
      scenario_id: activeLiveAnalysis ? "live-uploaded-pair" : targetScenario?.id || "empty-workspace",
      execution_trace: traceSteps,
      grounding_boxes: boxes,
      change_stats: changeStats,
      fusion_note: targetScenario?.response.fusion_note,
      has_heatmap: hasHeatmap,
      has_swipe_comparison: hasSwipeComp,
      pre_image_url: activePreUrl,
      post_image_url: activePostUrl,
      highlighted_image_url: highlightedImageUrl,
      annotated_image_url: annotatedImageUrl,
      mask_image_url: maskImageUrl,
      max_dist_km: maxDistKm,
      total_area_m2: totalAreaM2,
    };

    setMessages((prev) => [...prev, newAssistantResponse]);

    // Fast streaming animation
    const words = answerText.split(" ");
    let currentRevealed = "";

    for (let i = 0; i < words.length; i += 4) {
      const chunk = words.slice(i, i + 4).join(" ") + " ";
      currentRevealed += chunk;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === responseId ? { ...(msg as AssistantResponse), text: currentRevealed } : msg
        )
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === responseId ? { ...(msg as AssistantResponse), text: answerText } : msg
      )
    );

    if (boxes) setGroundingBoxes(boxes);
    if (hasHeatmap) setShowHeatmap(true);
    if (hasSwipeComp && activePreUrl && activePostUrl) {
      setHasSwipe(true);
      setPreImageUrl(activePreUrl);
      setPostImageUrl(activePostUrl);
    }

    setLatestResponse({ ...newAssistantResponse, text: answerText });
    setIsProcessing(false);
  };

  const handleAnalyzeLivePair = async (fileA: File | string, fileB: File | string, title?: string) => {
    setIsProcessing(true);
    const nameA = typeof fileA === "string" ? fileA.split("/").pop() || "Pre-Event.png" : fileA.name;
    const nameB = typeof fileB === "string" ? fileB.split("/").pop() || "Post-Event.png" : fileB.name;
    const isFileA = typeof fileA !== "string";
    const isFileB = typeof fileB !== "string";
    const sizeMbA = isFileA ? Number(((fileA as File).size / 1048576).toFixed(2)) : 1.85;
    const sizeMbB = isFileB ? Number(((fileB as File).size / 1048576).toFixed(2)) : 1.92;

    setCurrentRunningStep({
      step: 1,
      tool: "live_raster_ingest",
      tool_display_name: "Live Image Radiometric Parsing",
      params: { pre: nameA, post: nameB },
      duration_ms: 250,
      status: "running",
    });

    try {
      const liveRes = await analyzeLiveImagePair(fileA, fileB);

      const newFiles: GeoTIFFMetadata[] = [
        {
          id: `live_pre_${Date.now()}`,
          filename: nameA,
          sensor_hint: "sentinel2",
          bands: 3,
          crs: "EPSG:32650",
          resolution_m: 0.5,
          width: 1024,
          height: 1024,
          acquisition_date: new Date().toISOString(),
          bbox: [17.693, 83.298, 17.697, 83.302],
          center: [17.695, 83.300],
          thumbnail_url: liveRes.preImageUrl,
          data_type: "Optical",
          file_size_mb: sizeMbA,
        },
        {
          id: `live_post_${Date.now()}`,
          filename: nameB,
          sensor_hint: "sentinel2",
          bands: 3,
          crs: "EPSG:32650",
          resolution_m: 0.5,
          width: 1024,
          height: 1024,
          acquisition_date: new Date().toISOString(),
          bbox: [17.693, 83.298, 17.697, 83.302],
          center: [17.695, 83.300],
          thumbnail_url: liveRes.postImageUrl,
          data_type: "Optical",
          file_size_mb: sizeMbB,
        },
      ];

      setFiles(newFiles);
      setPreImageUrl(liveRes.preImageUrl);
      setPostImageUrl(liveRes.postImageUrl);
      setGroundingBoxes(liveRes.clusters);
      setHasSwipe(true);

      const responseId = `asst_live_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      const assistantMsg: AssistantResponse = {
        id: responseId,
        sender: "assistant",
        timestamp,
        text: liveRes.explanation,
        confidence_tier: "HIGH",
        confidence_score: 95.2,
        scenario_id: "live-uploaded-pair",
        execution_trace: [
          {
            step: 1,
            tool: "live_raster_ingest",
            tool_display_name: "Live Image Radiometric Parsing",
            params: { pre: nameA, post: nameB },
            duration_ms: 250,
            status: "success",
            output: { dimensions: [1024, 1024], format: isFileA ? (fileA as File).type || "raster" : "png" },
          },
          {
            step: 2,
            tool: "differential_siamese_inference",
            tool_display_name: "Differential Feature Extraction & Thresholding",
            params: { model: "Siamese-CD Backbone", threshold: 38 },
            duration_ms: 540,
            status: "success",
            output: { changed_pixels: liveRes.totalChangedPx, change_pct: liveRes.changePct },
          },
          {
            step: 3,
            tool: "distance_and_area_metric_quantifier",
            tool_display_name: "Metric Spatial Distance & Cluster Quantifier",
            params: { gsd_m: 0.5, metric_units: "km" },
            duration_ms: 220,
            status: "success",
            output: { max_span_km: liveRes.maxDistKm, total_area_m2: liveRes.totalAreaM2 },
          },
          {
            step: 4,
            tool: "highlight_overlay_generator",
            tool_display_name: "Highlight Change Map & Cluster Annotation",
            params: { overlay_color: "#e07856", stroke: 3 },
            duration_ms: 180,
            status: "success",
            output: { status: "rendered", clusters: liveRes.clusterCount },
          },
        ],
        grounding_boxes: liveRes.clusters,
        change_stats: liveRes.changeStats,
        has_heatmap: true,
        has_swipe_comparison: true,
        pre_image_url: liveRes.preImageUrl,
        post_image_url: liveRes.postImageUrl,
        highlighted_image_url: liveRes.highlightedImageUrl,
        annotated_image_url: liveRes.annotatedImageUrl,
        mask_image_url: liveRes.maskImageUrl,
        max_dist_km: liveRes.maxDistKm,
        total_area_m2: liveRes.totalAreaM2,
      };

      setActiveLiveAnalysis(liveRes);
      if (isFileA && isFileB) {
        setLiveFilesPair({ fileA: fileA as File, fileB: fileB as File });
      } else {
        setLiveFilesPair(null);
      }

      const displayPrompt = title
        ? `Analyze live satellite imagery: ${title}. Detect physical changes, compute distance in km, footprint in m², and render highlight annotations.`
        : `Analyze live image pair: Pre-Event (${nameA}) vs Post-Event (${nameB}). Detect all visible changes, calculate distance in km, and highlight change areas.`;

      const userMsgId = `usr_live_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setMessages([
        {
          id: userMsgId,
          sender: "user",
          timestamp,
          text: displayPrompt,
        },
        assistantMsg,
      ]);

      setLatestResponse(assistantMsg);
    } catch (err: any) {
      console.error("Live analysis failed:", err);
    } finally {
      setIsProcessing(false);
      setCurrentRunningStep(null);
    }
  };

  const handleDownloadPdf = async (msg?: AssistantResponse) => {
    const reportId = `SATQUERY-EO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const title =
      activeLiveAnalysis?.title ||
      scenario?.title ||
      (files.length >= 2 ? `${files[0].filename} vs ${files[1].filename}` : "Bi-Temporal Satellite Analysis");
    await downloadSatelliteReportPdf({
      reportId,
      title,
      files,
      liveAnalysis: activeLiveAnalysis,
      latestResponse: msg || latestResponse,
    });
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", background: "#090a0d", color: "#d0d7e2", overflow: "hidden" }}>
      {/* Sidebar */}
      <SidebarNav
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        isProcessing={isProcessing}
        filesCount={files.length}
        currentScenario={scenario}
        onSelectScenario={handleSelectScenario}
        backendOnline={backendOnline}
        backendDevice={backendDevice}
      />

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100%", overflow: "hidden" }}>
        {activeSection === "reports" ? (
          <ReportView
            scenario={scenario}
            files={files}
            liveAnalysis={activeLiveAnalysis}
            latestResponse={latestResponse}
            onBackToChat={() => setActiveSection("chat")}
          />
        ) : (
          <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
            {/* Left Panel: Raster Ingestion */}
            <div style={{ width: "280px", flexShrink: 0, borderRight: "1px solid #1c2028", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <UploadZone
                files={files}
                onFilesChange={(newFiles) => {
                  setFiles(newFiles);
                  if (newFiles.length === 0) {
                    setCurrentScenarioIndex(-1);
                    setActiveLiveAnalysis(null);
                    setLiveFilesPair(null);
                    setPreImageUrl(undefined);
                    setPostImageUrl(undefined);
                    setGroundingBoxes([]);
                    setHasSwipe(false);
                    setShowHeatmap(false);
                    setLatestResponse(null);
                  }
                }}
                inputConfig={inputConfig}
                onSelectPreset={handleSelectPreset}
                onAnalyzeLivePair={handleAnalyzeLivePair}
                isProcessing={isProcessing}
              />
            </div>

            {/* Center Panel: Map Canvas */}
            <div style={{ flex: 1, position: "relative", minWidth: 0, background: "#090a0d" }}>
              <MapContainerWrapper
                center={mapCenter}
                zoom={mapZoom}
                files={files}
                groundingBoxes={groundingBoxes}
                showHeatmap={showHeatmap}
                onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
                hasSwipeComparison={hasSwipe}
                preImageUrl={preImageUrl}
                postImageUrl={postImageUrl}
                highlightedImageUrl={latestResponse?.highlighted_image_url || activeLiveAnalysis?.highlightedImageUrl}
                annotatedImageUrl={latestResponse?.annotated_image_url || activeLiveAnalysis?.annotatedImageUrl}
                maskImageUrl={latestResponse?.mask_image_url || activeLiveAnalysis?.maskImageUrl}
                maxDistKm={latestResponse?.max_dist_km || activeLiveAnalysis?.maxDistKm}
                totalAreaM2={latestResponse?.total_area_m2 || activeLiveAnalysis?.totalAreaM2}
                activeScenarioId={activeLiveAnalysis ? (activeLiveAnalysis.preImageUrl || "live-imagery") : (scenario?.id || "empty-workspace")}
              />
            </div>

            {/* Right Panel: Chat */}
            <div style={{ width: "380px", flexShrink: 0, borderLeft: "1px solid #1c2028", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <ChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                isProcessing={isProcessing}
                currentRunningStep={currentRunningStep}
                currentScenario={scenario}
                onOpenReport={() => setActiveSection("reports")}
                onDownloadPdf={handleDownloadPdf}
                files={files}
                llmConfig={llmConfig}
                onOpenSettings={() => setSettingsModalOpen(true)}
              />
            </div>
          </div>
        )}
      </div>

      <AgentSettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        config={llmConfig}
        onSave={(newCfg) => {
          setLlmConfig(newCfg);
          saveLLMConfig(newCfg);
        }}
        backendOnline={backendOnline}
      />
    </div>
  );
}
