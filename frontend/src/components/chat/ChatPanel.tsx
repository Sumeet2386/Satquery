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

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (query: string) => void;
  isProcessing: boolean;
  currentRunningStep?: ExecutionTraceStep | null;
  currentScenario: MissionScenario;
  onOpenReport: () => void;
  files: GeoTIFFMetadata[];
}

const QUICK_PROMPTS = [
  { label: "What is this used for?", query: "What is this SatQuery agent actually used for and how does it work?" },
  { label: "Identify Post-Event Changes", query: "What physical changes occurred between both images and what are their labeled categories?" },
  { label: "Measure Distance (km)", query: "What is the visible distance span in km over which changes occur?" },
  { label: "Calculate Footprint Area", query: "What is the total modified ground footprint area in m² and km²?" },
  { label: "Highlight Changes", query: "Highlight all detected changes on the post-event image with precision reticles." },
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  isProcessing,
  currentRunningStep,
  currentScenario,
  onOpenReport,
  files,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: isProcessing ? "#e07856" : "#323a48",
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
            {isProcessing ? "running" : "idle"}
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
                      whiteSpace: "pre-line",
                    }}
                  >
                    {asstMsg.text}
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
                    <span
                      style={{ fontFamily: "monospace", fontSize: 9, color: "#323a48" }}
                    >
                      ISRO-SIH26167
                    </span>
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
