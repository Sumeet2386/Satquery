"use client";

import React, { useRef, useEffect } from "react";
import {
  Bot,
  User,
  Terminal,
  Sparkles,
  FileText,
  Radio,
  Loader2,
  Satellite,
  Settings2,
  Download,
} from "lucide-react";
import {
  ChatMessage,
  AssistantResponse,
  MissionScenario,
  GeoTIFFMetadata,
  ExecutionTraceStep,
} from "../../types/satquery";
import { THEME_CONFIG } from "../../constants/theme";
import { ExecutionTrace } from "./ExecutionTrace";
import { ChatComposer } from "./ChatComposer";
import { LLMClientConfig } from "../../lib/llmConfig";

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} style={{ color: "#e5eaf2", fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            background: "#15181f",
            border: "1px solid #252b36",
            borderRadius: 3,
            padding: "1px 4px",
            color: "#e07856",
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

const MarkdownMessage: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Markdown table detection
    if (line.trim().startsWith("|") && i + 1 < lines.length && lines[i + 1].trim().startsWith("|") && lines[i + 1].includes("---")) {
      const headers = line.split("|").slice(1, -1).map((h) => h.trim());
      i += 2; // skip header and separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].split("|").slice(1, -1).map((c) => c.trim()));
        i++;
      }
      blocks.push(
        <div key={`tbl_${i}`} style={{ overflowX: "auto", margin: "6px 0" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "monospace",
              fontSize: 10.5,
              border: "1px solid #1c2028",
            }}
          >
            <thead>
              <tr style={{ background: "#15181f", borderBottom: "1px solid #252b36" }}>
                {headers.map((h, hi) => (
                  <th key={hi} style={{ textAlign: "left", padding: "5px 7px", color: "#e07856", fontWeight: 700 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} style={{ borderBottom: "1px solid #1c2028", background: ri % 2 === 0 ? "#0d0f12" : "#111419" }}>
                  {r.map((cell, ci) => (
                    <td key={ci} style={{ padding: "4px 7px", color: "#a2acbd" }}>
                      {renderInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(
        <div key={`h3_${i}`} style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#e5eaf2", marginTop: 6, marginBottom: 4 }}>
          {renderInlineMarkdown(line.slice(4))}
        </div>
      );
    } else if (line.startsWith("## ")) {
      blocks.push(
        <div key={`h2_${i}`} style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#e07856", marginTop: 6, marginBottom: 4 }}>
          {renderInlineMarkdown(line.slice(3))}
        </div>
      );
    } else if (line.startsWith("> ")) {
      blocks.push(
        <div
          key={`bq_${i}`}
          style={{
            borderLeft: "2px solid #e07856",
            paddingLeft: 8,
            margin: "4px 0",
            color: "#8e9bb0",
            fontStyle: "italic",
          }}
        >
          {renderInlineMarkdown(line.slice(2))}
        </div>
      );
    } else if (line.trim() === "") {
      blocks.push(<div key={`sp_${i}`} style={{ height: 4 }} />);
    } else {
      blocks.push(
        <div key={`ln_${i}`} style={{ lineHeight: 1.55 }}>
          {renderInlineMarkdown(line)}
        </div>
      );
    }
    i++;
  }

  return <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{blocks}</div>;
};

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (query: string) => void;
  isProcessing: boolean;
  currentRunningStep?: ExecutionTraceStep | null;
  currentScenario?: MissionScenario | null;
  onOpenReport: () => void;
  onDownloadPdf?: (msg?: AssistantResponse) => void;
  files: GeoTIFFMetadata[];
  llmConfig?: LLMClientConfig;
  onOpenSettings?: () => void;
}

const QUICK_PROMPTS = [
  { label: "Compare Pre vs Post (Δ)", query: "Compare both Pre-Event (T1) and Post-Event (T2) images. Display the exact physical differences, net area converted, and distance span." },
  { label: "Statistical Audit", query: "Provide a complete statistical audit including mean, median, standard deviation, IQR, nearest-neighbor spacing, and category breakdown." },
  { label: "Quadrant Distribution", query: "Break down the spatial quadrant distribution (North-West, North-East, South-West, South-East) of detected changes." },
  { label: "Rank Largest Clusters", query: "Rank the top 5 largest detected change clusters with area, span, quadrant, and confidence." },
  { label: "Model & Radiometrics", query: "Analyze model reliability (F1, IoU, recall, confidence) and radiometric pixel/luminance shifts between T1 and T2." },
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  isProcessing,
  currentRunningStep,
  currentScenario,
  onOpenReport,
  onDownloadPdf,
  files,
  llmConfig,
  onOpenSettings,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isExternalLlm = Boolean(
    llmConfig &&
      llmConfig.provider !== "statistical" &&
      (llmConfig.api_key || llmConfig.provider === "ollama")
  );
  const engineBadge = isExternalLlm
    ? `${llmConfig!.provider.toUpperCase()}`
    : "STATS ENGINE";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing, currentRunningStep]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#0d0f12",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid #1c2028",
          background: "#111419",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Terminal size={13} style={{ color: "#e07856" }} />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 700,
              color: "#d0d7e2",
              letterSpacing: "0.04em",
            }}
          >
            Conversational Agent
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              title="Configure Real-World LLM / Agent Engine"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 7px",
                borderRadius: 4,
                border: isExternalLlm ? "1px solid rgba(72,178,126,0.45)" : "1px solid #252b36",
                background: isExternalLlm ? "rgba(72,178,126,0.1)" : "#15181f",
                color: isExternalLlm ? "#48b27e" : "#748094",
                fontFamily: "monospace",
                fontSize: 9,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Settings2 size={10} />
              <span>{engineBadge}</span>
            </button>
          )}
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: isProcessing ? "#e07856" : "#48b27e",
              display: "inline-block",
              animation: isProcessing ? "pulse 1.5s ease-in-out infinite" : "none",
            }}
          />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              color: isProcessing ? "#e07856" : "#4b5565",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {isProcessing ? "running" : "ready"}
          </span>
        </div>
      </div>

      {/* Quick Prompts */}
      <div
        style={{
          padding: "7px 10px",
          borderBottom: "1px solid #1c2028",
          display: "flex",
          gap: 5,
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        {QUICK_PROMPTS.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(item.query)}
            disabled={isProcessing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 9px",
              borderRadius: 4,
              border: "1px solid #1c2028",
              background: "#0d0f12",
              cursor: isProcessing ? "not-allowed" : "pointer",
              opacity: isProcessing ? 0.4 : 1,
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!isProcessing)
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#252b36";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#1c2028";
            }}
          >
            <Sparkles size={9} style={{ color: "#e07856" }} />
            <span style={{ fontFamily: "monospace", fontSize: 10, color: "#748094" }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Message Feed */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: 10,
              padding: 24,
              minHeight: 200,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: "#15181f",
                border: "1px solid #252b36",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e07856",
              }}
            >
              <Satellite size={20} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#d0d7e2",
                  marginBottom: 4,
                }}
              >
                SatQuery <span style={{ color: "#e07856" }}>AI</span>
              </div>
              <div
                style={{ fontFamily: "sans-serif", fontSize: 11, color: "#4b5565", lineHeight: 1.5 }}
              >
                One prompt, any satellite.
                <br />
                Pick a quick prompt above or type below.
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const itemKey = `${msg.id || "msg"}_${idx}`;
            if (msg.sender === "user") {
              return (
                <div key={itemKey} style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      background: "#15181f",
                      border: "1px solid #252b36",
                      borderRadius: 6,
                      padding: "8px 11px",
                      maxWidth: "88%",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 5,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <User size={10} style={{ color: "#e07856" }} />
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#748094",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          Scientist
                        </span>
                      </div>
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: "#4b5565" }}>
                        {msg.timestamp}
                      </span>
                    </div>
                    <p
                      style={{
                        fontFamily: "sans-serif",
                        fontSize: 12,
                        color: "#a2acbd",
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            }

            const asstMsg = msg as AssistantResponse;
            const badgeConfig =
              THEME_CONFIG.confidenceBadges[asstMsg.confidence_tier] ||
              THEME_CONFIG.confidenceBadges.HIGH;

            return (
              <div key={itemKey} style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    background: "#111419",
                    border: "1px solid #1c2028",
                    borderRadius: 6,
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #1c2028",
                      paddingBottom: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          background: "#15181f",
                          border: "1px solid #252b36",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#e07856",
                        }}
                      >
                        <Bot size={11} />
                      </div>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#d0d7e2",
                        }}
                      >
                        SatQuery Reasoner
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "2px 7px",
                        borderRadius: 4,
                        background: badgeConfig.bgColor,
                        border: `1px solid ${badgeConfig.borderColor}`,
                        fontFamily: "monospace",
                        fontSize: 9,
                        fontWeight: 700,
                        color: badgeConfig.color,
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: badgeConfig.dotColor,
                          display: "inline-block",
                        }}
                      />
                      {badgeConfig.label} ({asstMsg.confidence_score}%)
                    </div>
                  </div>

                  {/* Text Body */}
                  <div
                    style={{
                      fontFamily: "sans-serif",
                      fontSize: 12,
                      color: "#a2acbd",
                      lineHeight: 1.65,
                    }}
                  >
                    <MarkdownMessage content={asstMsg.text} />
                  </div>

                  {/* SAR Fusion Notice */}
                  {asstMsg.fusion_note && (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                        background: "#0d0f12",
                        border: "1px solid #1c2028",
                        borderRadius: 5,
                        padding: "8px 10px",
                      }}
                    >
                      <Radio size={13} style={{ color: "#e07856", flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#e07856",
                            letterSpacing: "0.07em",
                            marginBottom: 3,
                          }}
                        >
                          RADAR CROSS-MODAL FUSION:
                        </div>
                        <p
                          style={{
                            fontFamily: "sans-serif",
                            fontSize: 11,
                            color: "#748094",
                            lineHeight: 1.4,
                            margin: 0,
                          }}
                        >
                          {asstMsg.fusion_note}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Execution Trace */}
                  {asstMsg.execution_trace && asstMsg.execution_trace.length > 0 && (
                    <ExecutionTrace steps={asstMsg.execution_trace} />
                  )}

                  {/* Highlighted Changes Visual Preview */}
                  {(asstMsg.annotated_image_url || asstMsg.highlighted_image_url) && (
                    <div
                      style={{
                        borderRadius: 6,
                        overflow: "hidden",
                        border: "1px solid #1c2028",
                        background: "#090a0d",
                      }}
                    >
                      <div
                        style={{
                          padding: "6px 10px",
                          background: "#15181f",
                          borderBottom: "1px solid #1c2028",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ fontFamily: "monospace", fontSize: 10, color: "#e07856", fontWeight: 700 }}>
                          DETECTED CHANGE OVERLAY (HIGHLIGHTED)
                        </span>
                        {asstMsg.max_dist_km && (
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: 9,
                              color: "#48b27e",
                              fontWeight: 700,
                              background: "rgba(72,178,126,0.12)",
                              border: "1px solid rgba(72,178,126,0.3)",
                              padding: "1px 5px",
                              borderRadius: 3,
                            }}
                          >
                            SPAN: {asstMsg.max_dist_km} km
                          </span>
                        )}
                      </div>
                      <img
                        src={asstMsg.annotated_image_url || asstMsg.highlighted_image_url}
                        alt="Highlighted change overlay"
                        style={{ width: "100%", height: "auto", display: "block" }}
                      />
                      {asstMsg.grounding_boxes && asstMsg.grounding_boxes.length > 0 && (
                        <div style={{ padding: "8px 10px", background: "#0d0f12", borderTop: "1px solid #1c2028" }}>
                          <div style={{ fontFamily: "monospace", fontSize: 9, color: "#748094", textTransform: "uppercase", marginBottom: 5, letterSpacing: "0.06em" }}>
                            VERIFIED LABELED POST-EVENT CHANGES:
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {asstMsg.grounding_boxes.slice(0, 6).map((box, bIdx) => (
                              <div key={box.id || bIdx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, fontFamily: "monospace" }}>
                                <span style={{ color: "#d0d7e2" }}>
                                  <span style={{ color: "#e07856", fontWeight: 700 }}>#{bIdx + 1}</span> {box.label.replace(/^Cluster #\d+:\s*/, "")}
                                </span>
                                <span style={{ color: "#48b27e", fontWeight: 600 }}>{box.confidence}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer link */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderTop: "1px solid #1c2028",
                      paddingTop: 7,
                      gap: 8,
                    }}
                  >
                    <button
                      onClick={onOpenReport}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontFamily: "monospace",
                        fontSize: 10,
                        color: "#e07856",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      <FileText size={11} />
                      Open Mission Report →
                    </button>
                    {onDownloadPdf && (asstMsg.pre_image_url || asstMsg.post_image_url || (asstMsg.grounding_boxes && asstMsg.grounding_boxes.length > 0)) ? (
                      <button
                        onClick={() => onDownloadPdf(asstMsg)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontFamily: "monospace",
                          fontSize: 9.5,
                          fontWeight: 700,
                          color: "#090a0d",
                          background: "#48b27e",
                          border: "none",
                          borderRadius: 4,
                          padding: "3px 8px",
                          cursor: "pointer",
                        }}
                      >
                        <Download size={10} />
                        Download PDF
                      </button>
                    ) : (
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: "#323a48" }}>
                        SATQUERY-EO
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div>
            <div
              style={{
                background: "#111419",
                border: "1px solid #1c2028",
                borderRadius: 6,
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 7,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Loader2 size={13} style={{ color: "#e07856", animation: "spin 1s linear infinite" }} />
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#d0d7e2",
                    }}
                  >
                    Executing Agent Tools…
                  </span>
                </div>
                <span style={{ fontFamily: "monospace", fontSize: 9, color: "#4b5565" }}>~400ms</span>
              </div>

              {currentRunningStep && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    background: "#0d0f12",
                    border: "1px solid #1c2028",
                    borderRadius: 4,
                    padding: "5px 8px",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#e07856",
                      display: "inline-block",
                      animation: "ping 1s ease infinite",
                    }}
                  />
                  <span style={{ fontFamily: "monospace", fontSize: 9, color: "#4b5565" }}>
                    Step {currentRunningStep.step}:
                  </span>
                  <span style={{ fontFamily: "monospace", fontSize: 9, color: "#e07856", fontWeight: 700 }}>
                    {currentRunningStep.tool}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <ChatComposer
        onSendMessage={onSendMessage}
        isProcessing={isProcessing}
        onAttachClick={() => {}}
        onParamsClick={() => {}}
      />
    </div>
  );
};
