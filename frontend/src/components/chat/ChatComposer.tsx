"use client";

import React, { useState } from "react";
import {
  Send,
  Paperclip,
  Terminal,
  Search,
  ChevronDown,
  Cpu,
  Sparkles,
} from "lucide-react";

interface ChatComposerProps {
  onSendMessage: (text: string) => void;
  isProcessing: boolean;
  onAttachClick?: () => void;
  onParamsClick?: () => void;
}

const MODELS = [
  "isro-vit-large / vqa-geo-v2",
  "sentinel-sam-geo-3b",
  "sar-cband-fusion-transformer",
];

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  isProcessing,
  onAttachClick,
  onParamsClick,
}) => {
  const [inputText, setInputText] = useState("");
  const [executionMode, setExecutionMode] = useState<"Agent" | "Manual">("Agent");
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: "10px 12px",
        background: "#0d0f12",
        borderTop: "1px solid #1c2028",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          background: "#111419",
          border: `1px solid ${inputText && !isProcessing ? "#252b36" : "#1c2028"}`,
          borderRadius: 6,
          padding: "8px 10px",
          transition: "border-color 0.15s",
        }}
      >
        {/* Textarea */}
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask SatQuery AI about ingested satellite imagery…"
          disabled={isProcessing}
          rows={2}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            fontFamily: "monospace",
            fontSize: 12,
            color: "#d0d7e2",
            lineHeight: 1.5,
            opacity: isProcessing ? 0.5 : 1,
          }}
        />

        {/* Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 7,
            borderTop: "1px solid #1c2028",
            gap: 8,
          }}
        >
          {/* Left tools */}
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {[
              { icon: <Paperclip size={13} />, title: "Attach GeoTIFF", onClick: onAttachClick },
              { icon: <Terminal size={13} />, title: "Raw params", onClick: onParamsClick },
              { icon: <Search size={13} />, title: "Search catalog", onClick: undefined },
            ].map((btn, i) => (
              <button
                key={i}
                type="button"
                onClick={btn.onClick}
                title={btn.title}
                style={{
                  padding: 5,
                  borderRadius: 4,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#4b5565",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#748094")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#4b5565")}
              >
                {btn.icon}
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Mode toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#0d0f12",
                border: "1px solid #1c2028",
                borderRadius: 5,
                padding: 2,
              }}
            >
              {(["Agent", "Manual"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setExecutionMode(mode)}
                  style={{
                    padding: "2px 7px",
                    borderRadius: 3,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontSize: 9,
                    fontWeight: executionMode === mode ? 700 : 400,
                    background: executionMode === mode ? "#15181f" : "transparent",
                    color: executionMode === mode ? "#d0d7e2" : "#4b5565",
                    transition: "all 0.1s",
                    letterSpacing: "0.04em",
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Model picker */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowModelPicker(!showModelPicker)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 8px",
                  borderRadius: 4,
                  border: "1px solid #1c2028",
                  background: "#0d0f12",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: 9,
                  color: "#748094",
                  maxWidth: 130,
                  overflow: "hidden",
                }}
              >
                <Cpu size={10} style={{ color: "#e07856", flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedModel}
                </span>
                <ChevronDown size={9} style={{ color: "#4b5565", flexShrink: 0 }} />
              </button>

              {showModelPicker && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    bottom: "calc(100% + 4px)",
                    width: 220,
                    background: "#111419",
                    border: "1px solid #252b36",
                    borderRadius: 6,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    zIndex: 50,
                    padding: 4,
                  }}
                >
                  {MODELS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setSelectedModel(m); setShowModelPicker(false); }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "6px 10px",
                        borderRadius: 4,
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "monospace",
                        fontSize: 10,
                        background: selectedModel === m ? "#15181f" : "transparent",
                        color: selectedModel === m ? "#e07856" : "#748094",
                        fontWeight: selectedModel === m ? 700 : 400,
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Send */}
            <button
              type="submit"
              disabled={isProcessing || !inputText.trim()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                borderRadius: 5,
                border: "none",
                background: isProcessing || !inputText.trim() ? "#1c2028" : "#e07856",
                color: isProcessing || !inputText.trim() ? "#4b5565" : "#090a0d",
                fontFamily: "monospace",
                fontSize: 11,
                fontWeight: 700,
                cursor: isProcessing || !inputText.trim() ? "not-allowed" : "pointer",
                transition: "all 0.15s",
              }}
            >
              <Sparkles size={11} />
              <span>Run</span>
              <Send size={10} />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
