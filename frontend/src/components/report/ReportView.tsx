"use client";

import React, { useMemo, useState } from "react";
import {
  Download,
  Satellite,
  Layers,
  BarChart3,
  Check,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  BookOpen,
} from "lucide-react";
import {
  AssistantResponse,
  GeoTIFFMetadata,
  MissionScenario,
  GroundingBox,
} from "../../types/satquery";
import { THEME_CONFIG } from "../../constants/theme";
import { LiveAnalysisResult } from "../../lib/liveImageAnalysis";
import { computeStatisticalAuditTS } from "../../lib/statisticalEngine";
import {
  buildStatisticalPoints,
  buildTheoreticalPoints,
  downloadSatelliteReportPdf,
} from "../../lib/pdfReportGenerator";

interface ReportViewProps {
  scenario?: MissionScenario | null;
  files: GeoTIFFMetadata[];
  liveAnalysis?: LiveAnalysisResult | null;
  latestResponse: AssistantResponse | null;
  onBackToChat: () => void;
}

const BAR_COLORS = ["#e07856", "#d99b32", "#5294e2", "#48b27e"];

export const ReportView: React.FC<ReportViewProps> = ({
  scenario,
  files,
  liveAnalysis,
  latestResponse,
  onBackToChat,
}) => {
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const reportId = useMemo(
    () => `SATQUERY-EO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
    []
  );

  const groundingBoxes: GroundingBox[] =
    latestResponse?.grounding_boxes || liveAnalysis?.clusters || scenario?.response.grounding_boxes || [];
  const changeStats =
    latestResponse?.change_stats || liveAnalysis?.changeStats || scenario?.response.change_stats;
  const confidenceTier =
    latestResponse?.confidence_tier || scenario?.response.confidence_tier || "HIGH";
  const confidenceScore =
    latestResponse?.confidence_score || scenario?.response.confidence_score || 96.0;

  const badgeConfig = THEME_CONFIG.confidenceBadges[confidenceTier];

  const preImageUrl =
    latestResponse?.pre_image_url || liveAnalysis?.preImageUrl || files[0]?.thumbnail_url;
  const postImageUrl =
    latestResponse?.post_image_url || liveAnalysis?.postImageUrl || files[1]?.thumbnail_url;
  const overlayImageUrl =
    latestResponse?.annotated_image_url ||
    liveAnalysis?.annotatedImageUrl ||
    latestResponse?.highlighted_image_url ||
    liveAnalysis?.highlightedImageUrl;

  const audit = useMemo(
    () =>
      computeStatisticalAuditTS({
        title:
          liveAnalysis?.title ||
          scenario?.title ||
          (files.length >= 2 ? `${files[0].filename} vs ${files[1].filename}` : "Bi-Temporal Satellite Analysis"),
        pre_filename: liveAnalysis?.preFilename || files[0]?.filename || "Pre-Event (T1)",
        post_filename: liveAnalysis?.postFilename || files[1]?.filename || "Post-Event (T2)",
        gsd_m: files[0]?.resolution_m || 0.5,
        tile_width_px: liveAnalysis?.tileWidthPx || files[0]?.width || 1024,
        tile_height_px: liveAnalysis?.tileHeightPx || files[0]?.height || 1024,
        total_changed_px: liveAnalysis?.totalChangedPx || 0,
        total_area_m2: latestResponse?.total_area_m2 || liveAnalysis?.totalAreaM2 || 0,
        total_area_km2: liveAnalysis?.totalAreaKm2 || 0,
        change_pct: liveAnalysis?.changePct,
        max_dist_m: liveAnalysis?.maxDistM,
        max_dist_km: latestResponse?.max_dist_km || liveAnalysis?.maxDistKm,
        clusters: groundingBoxes,
        pixel_stats: liveAnalysis?.pixelStats,
      }),
    [liveAnalysis, scenario, files, latestResponse, groundingBoxes]
  );

  const statisticalPoints = useMemo(() => buildStatisticalPoints(audit), [audit]);
  const theoreticalPoints = useMemo(() => buildTheoreticalPoints(audit), [audit]);

  const chartData = changeStats?.breakdown || [];
  const maxArea = Math.max(0.0001, ...chartData.map((d) => d.area_km2));
  const canDownload = Boolean(preImageUrl || postImageUrl || groundingBoxes.length > 0 || files.length > 0);

  const handleDownloadPdf = async () => {
    if (!canDownload || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      await downloadSatelliteReportPdf({
        reportId,
        title: audit.scene_title,
        files,
        liveAnalysis: liveAnalysis || null,
        latestResponse,
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        height: "100%",
        background: "#090a0d",
        overflowY: "auto",
        padding: "24px",
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#d0d7e2",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Action Header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          borderBottom: "1px solid #1c2028",
          paddingBottom: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#e07856", fontWeight: 800, fontSize: "12px" }}>
              REPORT: {reportId}
            </span>
            <span style={{ fontSize: "10px", color: "#4b5565" }}>
              [BI-TEMPORAL EO CHANGE AUDIT]
            </span>
          </div>
          <h1
            style={{
              fontSize: "16px",
              fontWeight: 800,
              color: "#d0d7e2",
              margin: "4px 0 0",
              fontFamily: "sans-serif",
            }}
          >
            Earth Observation Scientific Intelligence Report
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={onBackToChat}
            style={{
              padding: "6px 12px",
              borderRadius: "5px",
              background: "#111419",
              border: "1px solid #1c2028",
              color: "#d0d7e2",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "monospace",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} />
            Back to Chat
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={!canDownload || downloadingPdf}
            style={{
              padding: "7px 14px",
              borderRadius: "5px",
              background: canDownload ? "#e07856" : "#15181f",
              border: canDownload ? "none" : "1px solid #252b36",
              color: canDownload ? "#090a0d" : "#4b5565",
              fontSize: "12px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "monospace",
              cursor: canDownload && !downloadingPdf ? "pointer" : "not-allowed",
            }}
          >
            {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {downloadingPdf ? "Compiling PDF…" : "Download PDF Report"}
          </button>
        </div>
      </div>

      {/* Report Document Sheet */}
      <div
        style={{
          maxWidth: "960px",
          width: "100%",
          margin: "0 auto",
          background: "#0d0f12",
          border: "1px solid #1c2028",
          borderRadius: "8px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          color: "#a2acbd",
        }}
      >
        {/* Document Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            borderBottom: "1px solid #1c2028",
            paddingBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "6px",
                background: "#15181f",
                border: "1px solid #1c2028",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e07856",
              }}
            >
              <Satellite size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "12px", color: "#d0d7e2" }}>
                SATQUERY AI — BI-TEMPORAL SATELLITE CHANGE VERIFICATION
              </div>
              <div style={{ fontSize: "11px", color: "#4b5565", marginTop: "2px" }}>
                {audit.scene_title} • GSD {audit.gsd_m} m/px
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "4px 10px",
              borderRadius: "4px",
              border: "1px solid",
              fontSize: "11px",
              fontWeight: 700,
              fontFamily: "monospace",
              backgroundColor: badgeConfig.bgColor,
              borderColor: badgeConfig.borderColor,
              color: badgeConfig.color,
            }}
          >
            {badgeConfig.label} ({confidenceScore}%)
          </div>
        </div>

        {/* 1. PRE-EVENT THEN POST-EVENT IMAGERY */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 700, color: "#748094", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <ImageIcon size={13} style={{ color: "#e07856" }} />
            1. Pre-Event (T1) & Post-Event (T2) Visual Comparison
          </div>

          {preImageUrl || postImageUrl ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: overlayImageUrl ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
                gap: "12px",
              }}
            >
              {preImageUrl && (
                <div style={{ background: "#090a0d", border: "1px solid rgba(72,178,126,0.35)", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ padding: "6px 10px", background: "#111419", borderBottom: "1px solid #1c2028", display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                    <span style={{ color: "#48b27e", fontWeight: 700 }}>1A. PRE-EVENT (T1 BASELINE)</span>
                    <span style={{ color: "#4b5565" }}>{audit.pre_filename}</span>
                  </div>
                  <img src={preImageUrl} alt="Pre-Event T1 Baseline" style={{ width: "100%", height: "230px", objectFit: "contain", background: "#050608" }} />
                </div>
              )}

              {postImageUrl && (
                <div style={{ background: "#090a0d", border: "1px solid rgba(224,120,86,0.35)", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ padding: "6px 10px", background: "#111419", borderBottom: "1px solid #1c2028", display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                    <span style={{ color: "#e07856", fontWeight: 700 }}>1B. POST-EVENT (T2 TARGET)</span>
                    <span style={{ color: "#4b5565" }}>{audit.post_filename}</span>
                  </div>
                  <img src={postImageUrl} alt="Post-Event T2 Target" style={{ width: "100%", height: "230px", objectFit: "contain", background: "#050608" }} />
                </div>
              )}

              {overlayImageUrl && (
                <div style={{ background: "#090a0d", border: "1px solid #252b36", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ padding: "6px 10px", background: "#111419", borderBottom: "1px solid #1c2028", display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                    <span style={{ color: "#d0d7e2", fontWeight: 700 }}>1C. DETECTED CHANGE MAP</span>
                    <span style={{ color: "#e07856" }}>{audit.totals.cluster_count} clusters</span>
                  </div>
                  <img src={overlayImageUrl} alt="Detected Change Overlay" style={{ width: "100%", height: "230px", objectFit: "contain", background: "#050608" }} />
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "16px", background: "#090a0d", border: "1px solid #1c2028", borderRadius: "6px", color: "#4b5565" }}>
              No Pre-Event / Post-Event images loaded yet. Upload a pair in Raster Ingestion first.
            </div>
          )}
        </div>

        {/* 2. STATISTICAL CHANGES (IN POINTS) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 700, color: "#748094", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <BarChart3 size={13} style={{ color: "#e07856" }} />
            2. Statistical Changes (Quantitative Points)
          </div>

          {/* KPI Strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
            {[
              { label: "Changed Footprint", value: `+${audit.totals.total_area_m2.toLocaleString()} m²` },
              { label: "Change Span", value: `${audit.totals.max_dist_km} km (${audit.totals.max_dist_m}m)` },
              { label: "Tile Transformed", value: `${audit.totals.change_pct}%` },
              { label: "Mean Cluster Area", value: `${audit.area_statistics.mean_m2.toLocaleString()} m²` },
              { label: "Std. Dev (σ)", value: `${audit.area_statistics.std_dev_m2.toLocaleString()} m²` },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "#090a0d",
                  border: "1px solid #1c2028",
                  borderRadius: "6px",
                  padding: "10px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "9px", color: "#4b5565", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#e07856", fontFamily: "sans-serif" }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              padding: "14px 16px",
              background: "#090a0d",
              border: "1px solid #1c2028",
              borderRadius: "6px",
              fontFamily: "sans-serif",
              fontSize: "12px",
              lineHeight: 1.65,
            }}
          >
            <ol style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {statisticalPoints.map((pt, i) => {
                const colonIdx = pt.indexOf(":");
                const head = colonIdx > -1 ? pt.slice(0, colonIdx + 1) : "";
                const body = colonIdx > -1 ? pt.slice(colonIdx + 1) : pt;
                return (
                  <li key={i} style={{ color: "#a2acbd" }}>
                    {head && <strong style={{ color: "#e5eaf2" }}>{head}</strong>}
                    {body}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Category Bar Chart */}
          {chartData.length > 0 && (
            <div
              style={{
                background: "#090a0d",
                border: "1px solid #1c2028",
                borderRadius: "6px",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ fontSize: "10px", color: "#4b5565", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Category Footprint Distribution (km²)
              </div>
              {chartData.map((item, i) => (
                <div key={item.category} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span style={{ color: "#d0d7e2" }}>{item.category}</span>
                    <span style={{ color: "#748094" }}>
                      {item.area_km2} km² ({item.percentage}%)
                    </span>
                  </div>
                  <div style={{ height: "7px", background: "#15181f", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, (item.area_km2 / maxArea) * 100)}%`,
                        backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. THEORETICAL & GEOSPATIAL CHANGES (IN POINTS) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 700, color: "#748094", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <BookOpen size={13} style={{ color: "#48b27e" }} />
            3. Theoretical & Physical Change Interpretation (Points)
          </div>
          <div
            style={{
              padding: "14px 16px",
              background: "#090a0d",
              border: "1px solid #1c2028",
              borderRadius: "6px",
              fontFamily: "sans-serif",
              fontSize: "12px",
              lineHeight: 1.65,
            }}
          >
            <ol style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {theoreticalPoints.map((pt, i) => {
                const colonIdx = pt.indexOf(":");
                const head = colonIdx > -1 ? pt.slice(0, colonIdx + 1) : "";
                const body = colonIdx > -1 ? pt.slice(colonIdx + 1) : pt;
                return (
                  <li key={i} style={{ color: "#a2acbd" }}>
                    {head && <strong style={{ color: "#48b27e" }}>{head}</strong>}
                    {body}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* 4. Ingested Raster Metadata Table */}
        {files.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 700, color: "#748094", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <Layers size={13} style={{ color: "#e07856" }} />
              4. Ingested Raster Metadata
            </div>
            <div style={{ overflowX: "auto", border: "1px solid #1c2028", borderRadius: "6px", background: "#090a0d" }}>
              <table style={{ width: "100%", textAlign: "left", fontSize: "12px", borderCollapse: "collapse" }}>
                <thead style={{ background: "#111419", color: "#4b5565", borderBottom: "1px solid #1c2028" }}>
                  <tr>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Slot / File</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Sensor</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Bands</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>CRS</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Resolution</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Date</th>
                  </tr>
                </thead>
                <tbody style={{ color: "#a2acbd", fontSize: "11px" }}>
                  {files.map((file, idx) => (
                    <tr key={file.id} style={{ borderBottom: "1px solid #15181f" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600, color: idx === 0 ? "#48b27e" : "#e07856" }}>
                        {idx === 0 ? "T1 Pre: " : "T2 Post: "}{file.filename}
                      </td>
                      <td style={{ padding: "8px 12px" }}>{file.sensor_hint.toUpperCase()}</td>
                      <td style={{ padding: "8px 12px" }}>{file.bands}B</td>
                      <td style={{ padding: "8px 12px" }}>{file.crs}</td>
                      <td style={{ padding: "8px 12px" }}>{file.resolution_m}m GSD</td>
                      <td style={{ padding: "8px 12px" }}>{new Date(file.acquisition_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. Detected Cluster Catalogue */}
        {audit.clusters.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 700, color: "#748094", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <ShieldCheck size={13} style={{ color: "#e07856" }} />
              5. Verified Change Cluster Catalogue ({audit.clusters.length} clusters)
            </div>
            <div style={{ overflowX: "auto", border: "1px solid #1c2028", borderRadius: "6px", background: "#090a0d" }}>
              <table style={{ width: "100%", textAlign: "left", fontSize: "12px", borderCollapse: "collapse" }}>
                <thead style={{ background: "#111419", color: "#4b5565", borderBottom: "1px solid #1c2028" }}>
                  <tr>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Label</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Category</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Area (m²)</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Span</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Quadrant</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Confidence</th>
                  </tr>
                </thead>
                <tbody style={{ color: "#a2acbd", fontSize: "11px" }}>
                  {audit.clusters.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #15181f" }}>
                      <td style={{ padding: "8px 12px", color: "#d0d7e2", fontWeight: 600 }}>{c.label}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "#15181f",
                            border: "1px solid #1c2028",
                            fontSize: "10px",
                            textTransform: "uppercase",
                            color: "#e07856",
                          }}
                        >
                          {c.category}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px" }}>{c.area_m2.toLocaleString()} m²</td>
                      <td style={{ padding: "8px 12px" }}>{c.span_m} m</td>
                      <td style={{ padding: "8px 12px" }}>{c.quadrant}</td>
                      <td style={{ padding: "8px 12px", color: "#d0d7e2", fontWeight: 700 }}>{c.confidence}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. Provenance / Audit */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid #1c2028", paddingTop: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 700, color: "#748094", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <Check size={13} style={{ color: "#48b27e" }} />
            6. Provenance & Audit Trail
          </div>
          <div
            style={{
              padding: "12px 14px",
              background: "#090a0d",
              border: "1px solid #1c2028",
              borderRadius: "6px",
              fontSize: "11px",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", color: "#a2acbd" }}>
              <div><span style={{ color: "#4b5565" }}>System: </span>SatQuery AI v2.0</div>
              <div><span style={{ color: "#4b5565" }}>Pipeline: </span>Siamese-CD + Statistical Engine</div>
              <div><span style={{ color: "#4b5565" }}>Generated: </span>{new Date().toISOString()}</div>
              <div><span style={{ color: "#4b5565" }}>Calibration: </span>{audit.gsd_m} m/px GSD</div>
              <div><span style={{ color: "#4b5565" }}>Input Tiles: </span>{files.length} raster file(s)</div>
              <div><span style={{ color: "#4b5565" }}>Status: </span><span style={{ color: "#48b27e", fontWeight: 700 }}>VERIFIED ✓</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
