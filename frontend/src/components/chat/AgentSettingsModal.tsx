"use client";

import React, { useState, useEffect } from "react";
import { X, Cpu, KeyRound, Eye, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  LLMClientConfig,
  LLMProviderId,
  PROVIDER_PRESETS,
} from "../../lib/llmConfig";
import { testAgentConnection } from "../../lib/api";

interface AgentSettingsModalProps {
  open: boolean;
  onClose: () => void;
  config: LLMClientConfig;
  onSave: (newConfig: LLMClientConfig) => void;
  backendOnline: boolean;
}

export const AgentSettingsModal: React.FC<AgentSettingsModalProps> = ({
  open,
  onClose,
  config,
  onSave,
  backendOnline,
}) => {
  const [draft, setDraft] = useState<LLMClientConfig>(config);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(config);
      setTestResult(null);
    }
  }, [open, config]);

  if (!open) return null;

  const preset = PROVIDER_PRESETS[draft.provider];

  const handleProviderChange = (provider: LLMProviderId) => {
    const p = PROVIDER_PRESETS[provider];
    setDraft((prev) => ({
      ...prev,
      provider,
      model: p.defaultModel,
      enable_vision: p.supportsVision,
      base_url: provider === "ollama" ? prev.base_url || "http://localhost:11434" : "",
    }));
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAgentConnection(draft, backendOnline);
      if (res.ok) {
        setTestResult({
          ok: true,
          text: res.message || `Connected (${res.model})`,
        });
      } else {
        setTestResult({
          ok: false,
          text: res.error || "Connection failed",
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        text: err?.message || "Connection test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(5, 6, 8, 0.8)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#111419",
          border: "1px solid #252b36",
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(0,0,0,0.65)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid #1c2028",
            background: "#0d0f12",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Cpu size={14} style={{ color: "#e07856" }} />
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                fontWeight: 700,
                color: "#d0d7e2",
              }}
            >
              Real-World Agent Engine Configuration
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#748094",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Provider selector */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "monospace",
                fontSize: 10,
                color: "#748094",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              AI Agent Provider
            </label>
            <select
              value={draft.provider}
              onChange={(e) => handleProviderChange(e.target.value as LLMProviderId)}
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "#090a0d",
                border: "1px solid #252b36",
                borderRadius: 5,
                color: "#d0d7e2",
                fontFamily: "monospace",
                fontSize: 11,
                outline: "none",
              }}
            >
              {(Object.keys(PROVIDER_PRESETS) as LLMProviderId[]).map((id) => (
                <option key={id} value={id}>
                  {PROVIDER_PRESETS[id].label}
                </option>
              ))}
            </select>
            <p
              style={{
                margin: "6px 0 0",
                fontFamily: "sans-serif",
                fontSize: 11,
                color: "#748094",
                lineHeight: 1.45,
              }}
            >
              {preset.helperText}
            </p>
          </div>

          {/* Model Input */}
          {draft.provider !== "statistical" && (
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "monospace",
                  fontSize: 10,
                  color: "#748094",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Model ID
              </label>
              <input
                type="text"
                value={draft.model}
                onChange={(e) => setDraft((prev) => ({ ...prev, model: e.target.value }))}
                placeholder={preset.defaultModel}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  background: "#090a0d",
                  border: "1px solid #252b36",
                  borderRadius: 5,
                  color: "#d0d7e2",
                  fontFamily: "monospace",
                  fontSize: 11,
                  outline: "none",
                }}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {preset.suggestedModels.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, model: m }))}
                    style={{
                      padding: "2px 7px",
                      borderRadius: 4,
                      border: `1px solid ${draft.model === m ? "#e07856" : "#1c2028"}`,
                      background: draft.model === m ? "rgba(224,120,86,0.12)" : "#0d0f12",
                      color: draft.model === m ? "#e07856" : "#748094",
                      fontFamily: "monospace",
                      fontSize: 10,
                      cursor: "pointer",
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* API Key Input */}
          {preset.requiresKey && (
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: "monospace",
                  fontSize: 10,
                  color: "#748094",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                <KeyRound size={10} style={{ color: "#e07856" }} />
                API Key (session-only, cleared when tab closes)
              </label>
              <input
                type="password"
                value={draft.api_key}
                onChange={(e) => setDraft((prev) => ({ ...prev, api_key: e.target.value }))}
                placeholder={preset.placeholderKey}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  background: "#090a0d",
                  border: "1px solid #252b36",
                  borderRadius: 5,
                  color: "#d0d7e2",
                  fontFamily: "monospace",
                  fontSize: 11,
                  outline: "none",
                }}
              />
            </div>
          )}

          {/* Base URL for Ollama / Custom */}
          {(draft.provider === "ollama" || draft.provider === "custom") && (
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "monospace",
                  fontSize: 10,
                  color: "#748094",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Endpoint Base URL
              </label>
              <input
                type="text"
                value={draft.base_url || ""}
                onChange={(e) => setDraft((prev) => ({ ...prev, base_url: e.target.value }))}
                placeholder={draft.provider === "ollama" ? "http://localhost:11434" : "https://api.example.com/v1"}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  background: "#090a0d",
                  border: "1px solid #252b36",
                  borderRadius: 5,
                  color: "#d0d7e2",
                  fontFamily: "monospace",
                  fontSize: 11,
                  outline: "none",
                }}
              />
            </div>
          )}

          {/* Multimodal Vision Toggle */}
          {preset.supportsVision && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                background: "#0d0f12",
                border: "1px solid #1c2028",
                borderRadius: 5,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Eye size={13} style={{ color: "#48b27e" }} />
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "#d0d7e2" }}>
                    Multimodal Vision (Attach T1 & T2 Images)
                  </div>
                  <div style={{ fontFamily: "sans-serif", fontSize: 10, color: "#748094" }}>
                    Sends Pre-Event & Post-Event frames directly to the AI model
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={draft.enable_vision}
                onChange={(e) => setDraft((prev) => ({ ...prev, enable_vision: e.target.checked }))}
              />
            </label>
          )}

          {/* Test Result */}
          {testResult && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 5,
                background: testResult.ok ? "rgba(72,178,126,0.1)" : "rgba(224,120,86,0.12)",
                border: `1px solid ${testResult.ok ? "rgba(72,178,126,0.4)" : "rgba(224,120,86,0.4)"}`,
                color: testResult.ok ? "#48b27e" : "#e07856",
                fontFamily: "monospace",
                fontSize: 10,
                lineHeight: 1.4,
              }}
            >
              {testResult.ok ? <CheckCircle2 size={13} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />}
              <span>{testResult.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            borderTop: "1px solid #1c2028",
            background: "#0d0f12",
          }}
        >
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 5,
              border: "1px solid #252b36",
              background: "#15181f",
              color: "#d0d7e2",
              fontFamily: "monospace",
              fontSize: 11,
              cursor: testing ? "wait" : "pointer",
            }}
          >
            {testing && <Loader2 size={11} className="animate-spin" />}
            <span>Test Connection</span>
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "6px 12px",
                borderRadius: 5,
                border: "1px solid #1c2028",
                background: "transparent",
                color: "#748094",
                fontFamily: "monospace",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: "6px 14px",
                borderRadius: 5,
                border: "none",
                background: "#e07856",
                color: "#090a0d",
                fontFamily: "monospace",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Save & Activate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

