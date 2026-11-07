"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Terminal,
  Check,
  AlertCircle,
  Clock,
  Code2,
  Loader2,
} from "lucide-react";
import { ExecutionTraceStep } from "../../types/satquery";

interface ExecutionTraceProps {
  steps: ExecutionTraceStep[];
}

export const ExecutionTrace: React.FC<ExecutionTraceProps> = ({ steps }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const totalDuration = steps.reduce((acc, step) => acc + (step.duration_ms || 0), 0);

  return (
    <div
      style={{
        border: "1px solid #1c2028",
        borderRadius: 5,
        overflow: "hidden",
        fontFamily: "monospace",
        fontSize: 11,
        userSelect: "none",
      }}
    >
      {/* Accordion Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "7px 10px",
          background: "#15181f",
          border: "none",
          cursor: "pointer",
          transition: "background 0.1s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#1c2028")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#15181f")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {isOpen ? (
            <ChevronDown size={12} style={{ color: "#748094" }} />
          ) : (
            <ChevronRight size={12} style={{ color: "#4b5565" }} />
          )}
          <Terminal size={12} style={{ color: "#e07856" }} />
          <span style={{ fontWeight: 700, color: "#a2acbd" }}>Execution Trace</span>
          <span
            style={{
              fontSize: 9,
              padding: "1px 5px",
              borderRadius: 3,
              background: "#0d0f12",
              border: "1px solid #1c2028",
              color: "#748094",
            }}
          >
            {steps.length} tools
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#4b5565", fontSize: 9 }}>
          <Clock size={10} />
          <span>{totalDuration}ms</span>
        </div>
      </button>

      {isOpen && (
        <div
          style={{
            background: "#0d0f12",
            borderTop: "1px solid #1c2028",
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {steps.map((step) => {
            const isExpanded = expandedStep === step.step;
            return (
              <div
                key={step.step}
                style={{
                  border: "1px solid #1c2028",
                  borderRadius: 4,
                  overflow: "hidden",
                  background: "#111419",
                }}
              >
                <div
                  onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "5px 8px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 3,
                        background: "#0d0f12",
                        border: "1px solid #1c2028",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 8,
                        fontWeight: 800,
                        color: "#748094",
                        flexShrink: 0,
                      }}
                    >
                      {step.step}
                    </span>
                    {step.status === "running" ? (
                      <Loader2 size={11} style={{ color: "#d99b32", flexShrink: 0 }} />
                    ) : step.status === "success" ? (
                      <Check size={11} style={{ color: "#48b27e", flexShrink: 0 }} />
                    ) : (
                      <AlertCircle size={11} style={{ color: "#d45353", flexShrink: 0 }} />
                    )}
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#a2acbd",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {step.tool}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        color: "#4b5565",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ({step.tool_display_name})
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#4b5565", fontSize: 9, flexShrink: 0 }}>
                    <span>{step.duration_ms}ms</span>
                    {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  </div>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      borderTop: "1px solid #1c2028",
                      padding: "8px 10px",
                      background: "#090a0d",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          color: "#4b5565",
                          fontWeight: 700,
                          fontSize: 9,
                          marginBottom: 4,
                          letterSpacing: "0.06em",
                        }}
                      >
                        <Code2 size={10} style={{ color: "#e07856" }} />
                        INPUT PARAMS:
                      </div>
                      <pre
                        style={{
                          background: "#0d0f12",
                          border: "1px solid #1c2028",
                          borderRadius: 4,
                          padding: "6px 8px",
                          color: "#748094",
                          fontSize: 9,
                          overflowX: "auto",
                          lineHeight: 1.5,
                          margin: 0,
                        }}
                      >
                        {JSON.stringify(step.params, null, 2)}
                      </pre>
                    </div>
                    {step.output && (
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            color: "#4b5565",
                            fontWeight: 700,
                            fontSize: 9,
                            marginBottom: 4,
                            letterSpacing: "0.06em",
                          }}
                        >
                          <Check size={10} style={{ color: "#48b27e" }} />
                          OUTPUT:
                        </div>
                        <pre
                          style={{
                            background: "#0d0f12",
                            border: "1px solid #1c2028",
                            borderRadius: 4,
                            padding: "6px 8px",
                            color: "#a2acbd",
                            fontSize: 9,
                            overflowX: "auto",
                            lineHeight: 1.5,
                            margin: 0,
                          }}
                        >
                          {JSON.stringify(step.output, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
