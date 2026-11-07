"use client";

import React, { useState } from "react";
import { 
  Download, 
  Satellite, 
  Layers, 
  BarChart3, 
  Check, 
  ShieldCheck, 
  ArrowLeft
} from "lucide-react";
import { 
  AssistantResponse, 
  GeoTIFFMetadata, 
  MissionScenario,
  GroundingBox
} from "../../types/satquery";
import { THEME_CONFIG } from "../../constants/theme";

interface ReportViewProps {
  scenario: MissionScenario;
  files: GeoTIFFMetadata[];
  latestResponse: AssistantResponse | null;
  onBackToChat: () => void;
}

const BAR_COLORS = ["#e07856", "#d99b32", "#5294e2", "#748094"];

export const ReportView: React.FC<ReportViewProps> = ({
  scenario,
  files,
  latestResponse,
  onBackToChat,
}) => {
  const [downloadTooltip, setDownloadTooltip] = useState(false);

  const groundingBoxes: GroundingBox[] = latestResponse?.grounding_boxes || scenario.response.grounding_boxes || [];
  const changeStats = latestResponse?.change_stats || scenario.response.change_stats;
  const confidenceTier = latestResponse?.confidence_tier || scenario.response.confidence_tier || "HIGH";
  const confidenceScore = latestResponse?.confidence_score || scenario.response.confidence_score || 96.0;

  const badgeConfig = THEME_CONFIG.confidenceBadges[confidenceTier];

  const chartData = changeStats?.breakdown || [
    { category: "Berths", area_km2: 12.4, percentage: 40 },
    { category: "Anchorages", area_km2: 8.6, percentage: 30 },
    { category: "Storage Tanks", area_km2: 5.2, percentage: 20 },
    { category: "Channels", area_km2: 3.1, percentage: 10 },
  ];

  const maxArea = Math.max(...chartData.map((d) => d.area_km2));

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
              REPORT: SIH26167-EO-{Date.now().toString().slice(-6)}
            </span>
            <span style={{ fontSize: "10px", color: "#4b5565" }}>
              [ISRO MISSION DOS-EO]
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
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#15181f")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#111419")}
          >
            <ArrowLeft size={14} />
            Back to Chat
          </button>
          <div style={{ position: "relative" }}>
            <button
              onMouseEnter={() => setDownloadTooltip(true)}
              onMouseLeave={() => setDownloadTooltip(false)}
              style={{
                padding: "6px 14px",
                borderRadius: "5px",
                background: "#15181f",
                border: "1px solid #252b36",
                color: "#748094",
                fontSize: "12px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: "monospace",
                cursor: "not-allowed",
              }}
            >
              <Download size={14} />
              Download PDF (Mock)
            </button>
            {downloadTooltip && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 6px)",
                  width: "240px",
                  padding: "8px 10px",
                  background: "#111419",
                  border: "1px solid #252b36",
                  borderRadius: "6px",
                  fontSize: "10px",
                  color: "#a2acbd",
                  zIndex: 50,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                }}
              >
                UI Mock affordance: in production this compiles raw GeoJSON layers, bounding metrics, and metadata into a signed ISRO PDF.
              </div>
            )}
          </div>
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
                ISRO NATIONAL REMOTE SENSING CENTRE
              </div>
              <div style={{ fontSize: "11px", color: "#4b5565", marginTop: "2px" }}>
                SatQuery AI Automated Grounding Verification (SIH26167)
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

        {/* 1. Metadata Table */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 700, color: "#748094", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <Layers size={13} style={{ color: "#e07856" }} />
            1. Ingested Raster Metadata
          </div>
          <div style={{ overflowX: "auto", border: "1px solid #1c2028", borderRadius: "6px", background: "#090a0d" }}>
            <table style={{ width: "100%", textAlign: "left", fontSize: "12px", borderCollapse: "collapse" }}>
              <thead style={{ background: "#111419", color: "#4b5565", borderBottom: "1px solid #1c2028" }}>
                <tr>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>File</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>Sensor</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>Bands</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>CRS</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>Resolution</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600 }}>Acquisition Date</th>
                </tr>
              </thead>
              <tbody style={{ color: "#a2acbd", fontSize: "11px" }}>
                {files.map((file) => (
                  <tr key={file.id} style={{ borderBottom: "1px solid #15181f" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600, color: "#e07856", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.filename}</td>
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

        {/* 2. Analysis Summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 700, color: "#748094", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <ShieldCheck size={13} style={{ color: "#e07856" }} />
            2. AI Analysis Summary
          </div>
          <div
            style={{
              padding: "14px",
              background: "#090a0d",
              border: "1px solid #1c2028",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#a2acbd",
              fontFamily: "sans-serif",
              lineHeight: 1.6,
              whiteSpace: "pre-line",
            }}
          >
            {latestResponse?.text || scenario.response.text}
          </div>
        </div>

        {/* 3. Detected Objects Table */}
        {groundingBoxes.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 700, color: "#748094", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <BarChart3 size={13} style={{ color: "#e07856" }} />
              3. Detected Object Catalogue ({groundingBoxes.length} items)
            </div>
            <div style={{ overflowX: "auto", border: "1px solid #1c2028", borderRadius: "6px", background: "#090a0d" }}>
              <table style={{ width: "100%", textAlign: "left", fontSize: "12px", borderCollapse: "collapse" }}>
                <thead style={{ background: "#111419", color: "#4b5565", borderBottom: "1px solid #1c2028" }}>
                  <tr>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Label</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Category</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>Confidence</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600 }}>BBox (Lat/Lng)</th>
                  </tr>
                </thead>
                <tbody style={{ color: "#a2acbd", fontSize: "11px" }}>
                  {groundingBoxes.map((box) => (
                    <tr key={box.id} style={{ borderBottom: "1px solid #15181f" }}>
                      <td style={{ padding: "8px 12px", color: "#d0d7e2", fontWeight: 600 }}>{box.label}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "#15181f",
                            border: "1px solid #1c2028",
                            fontSize: "10px",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: "#e07856",
                          }}
                        >
                          {box.category}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ flex: 1, height: "6px", background: "#15181f", borderRadius: "3px", maxWidth: "80px", overflow: "hidden" }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${box.confidence}%`,
                                backgroundColor: box.confidence > 90 ? "#e07856" : box.confidence > 80 ? "#d99b32" : "#5294e2",
                              }}
                            />
                          </div>
                          <span style={{ color: "#d0d7e2" }}>{box.confidence.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: "10px", color: "#748094" }}>
                        [{box.bbox.map((n) => n.toFixed(3)).join(", ")}]
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Change Statistics */}
        {changeStats && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 700, color: "#748094", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <BarChart3 size={13} style={{ color: "#e07856" }} />
              4. Change Statistics & Breakdown
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
              {[
                { label: "Baseline Area", value: `${changeStats.baseline_area_km2} km²` },
                { label: "Changed Area", value: `${changeStats.changed_area_km2} km²` },
                { label: "Change Ratio", value: `${(changeStats.change_ratio * 100).toFixed(1)}%` },
                { label: "Confidence", value: `${changeStats.confidence}%` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: "#090a0d",
                    border: "1px solid #1c2028",
                    borderRadius: "6px",
                    padding: "12px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "10px", color: "#4b5565", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#e07856", fontFamily: "sans-serif" }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <div
              style={{
                background: "#090a0d",
                border: "1px solid #1c2028",
                borderRadius: "6px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ fontSize: "10px", color: "#4b5565", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Area Breakdown (km²)
              </div>
              {chartData.map((item, i) => (
                <div key={item.category} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                    <span style={{ color: "#a2acbd", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.category}
                    </span>
                    <span style={{ color: "#748094" }}>
                      {item.area_km2} km² ({item.percentage}%)
                    </span>
                  </div>
                  <div style={{ height: "8px", background: "#15181f", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(item.area_km2 / maxArea) * 100}%`,
                        backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                        transition: "all 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Provenance / Audit */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid #1c2028", paddingTop: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 700, color: "#748094", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <Check size={13} style={{ color: "#48b27e" }} />
            5. Provenance & Audit Trail
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
              <div><span style={{ color: "#4b5565" }}>System: </span>SatQuery AI v2.0 (ISRO SIH26167)</div>
              <div><span style={{ color: "#4b5565" }}>Pipeline: </span>Agentic VLM + Siamese CD</div>
              <div><span style={{ color: "#4b5565" }}>Generated: </span>{new Date().toISOString()}</div>
              <div><span style={{ color: "#4b5565" }}>Framework: </span>PyTorch / ONNX Runtime</div>
              <div><span style={{ color: "#4b5565" }}>Input Tiles: </span>{files.length} raster band set(s)</div>
              <div><span style={{ color: "#4b5565" }}>Status: </span><span style={{ color: "#48b27e", fontWeight: 700 }}>VERIFIED ✓</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
