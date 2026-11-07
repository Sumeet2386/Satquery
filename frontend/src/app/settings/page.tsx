"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  Cpu,
  Key,
  HardDrive,
  Save,
  Check,
} from "lucide-react";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [defaultModel, setDefaultModel] = useState("changeformer");
  const [inferenceDevice, setInferenceDevice] = useState("cpu");
  const [threshold, setThreshold] = useState("0.50");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [storageBackend, setStorageBackend] = useState("local");
  const [autoResample, setAutoResample] = useState(true);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AppShell
      title="Platform Settings"
      subtitle="Configure inference backends, threshold sensitivities, API credentials, and storage."
      action={
        <button
          onClick={handleSave}
          className="sq-btn-primary"
          style={{ padding: "8px 16px", fontSize: "13px" }}
        >
          {saved ? <Check size={14} color="var(--success)" /> : <Save size={14} />}
          <span>{saved ? "Changes Saved" : "Save Settings"}</span>
        </button>
      }
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Settings" },
      ]}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Model Inference Card */}
        <div className="sq-card">
          <div className="sq-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Cpu size={18} color="var(--brand-light)" />
              <h2 className="sq-card-title" style={{ margin: 0 }}>Model Inference Engine</h2>
            </div>
          </div>

          <div className="sq-grid-2" style={{ marginBottom: "18px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                Default Neural Architecture
              </label>
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className="sq-input"
                style={{ fontSize: "13px" }}
              >
                <option value="changeformer">ChangeFormer (Transformer Siamese) — 90.4% F1</option>
                <option value="s2looking_cd">Siamese-CD (S2Looking Off-Nadir) — 89.8% F1</option>
                <option value="bit">BIT (Binary Interaction Transformer) — 89.3% F1</option>
                <option value="snunet">SNUNet (Dense Siam-NestedUNet) — 88.2% F1</option>
              </select>
              <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                ChangeFormer provides highest accuracy on building footprints and urban change.
              </p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                Hardware Acceleration
              </label>
              <select
                value={inferenceDevice}
                onChange={(e) => setInferenceDevice(e.target.value)}
                className="sq-input"
                style={{ fontSize: "13px" }}
              >
                <option value="cpu">CPU (Standard Host)</option>
                <option value="cuda">NVIDIA CUDA GPU</option>
                <option value="mps">Apple Silicon MPS (Metal Performance Shaders)</option>
              </select>
              <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px" }}>
                Hardware acceleration cuts 1024x1024 processing time from ~80s to ~12s.
              </p>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>
                Default Detection Threshold: <span style={{ fontFamily: "monospace", color: "var(--brand-light)", fontWeight: 700 }}>{threshold}</span>
              </label>
            </div>
            <input
              type="range"
              min="0.30"
              max="0.80"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              style={{ width: "100%", accentColor: "var(--brand-primary)", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace", marginTop: "4px" }}>
              <span>0.30 (High Recall)</span>
              <span>0.50 (Balanced)</span>
              <span>0.80 (High Precision)</span>
            </div>
          </div>
        </div>

        {/* LLM & Multimodal Reasoning */}
        <div className="sq-card">
          <div className="sq-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Key size={18} color="#A78BFA" />
              <h2 className="sq-card-title" style={{ margin: 0 }}>Natural Language Reasoning Engine</h2>
            </div>
          </div>

          <div className="sq-grid-2">
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                OpenAI API Key (Optional)
              </label>
              <input
                type="password"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="sq-input"
                style={{ fontFamily: "monospace", fontSize: "13px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                Anthropic API Key (Optional)
              </label>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className="sq-input"
                style={{ fontFamily: "monospace", fontSize: "13px" }}
              />
            </div>
          </div>
        </div>

        {/* Storage */}
        <div className="sq-card" style={{ marginBottom: "30px" }}>
          <div className="sq-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <HardDrive size={18} color="var(--success)" />
              <h2 className="sq-card-title" style={{ margin: 0 }}>Geospatial Storage & Resampling</h2>
            </div>
          </div>

          <div className="sq-grid-2">
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                Storage Backend
              </label>
              <select
                value={storageBackend}
                onChange={(e) => setStorageBackend(e.target.value)}
                className="sq-input"
                style={{ fontSize: "13px" }}
              >
                <option value="local">Local Filesystem (./storage/uploads)</option>
                <option value="s3">MinIO / AWS S3 Compatible Bucket</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: "26px" }}>
              <input
                type="checkbox"
                id="resample"
                checked={autoResample}
                onChange={(e) => setAutoResample(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "var(--brand-primary)", cursor: "pointer" }}
              />
              <label htmlFor="resample" style={{ fontSize: "12.5px", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none" }}>
                Automatically align CRS and resample mismatched satellite imagery
              </label>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
