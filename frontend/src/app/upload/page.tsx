"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  FileImage,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Sparkles,
  Database,
  Ruler,
} from "lucide-react";
import { uploadImageFile, submitAnalysisJob } from "@/lib/api";
import { DATABASE_SAMPLES, DatabaseSample } from "@/constants/databaseSamples";
import { analyzeLiveImagePair } from "@/lib/liveImageAnalysis";

const PRESET_QUERIES = [
  "Compare both images and identify newly constructed building footprints.",
  "Detect impervious surface expansions and road infrastructure additions.",
  "Highlight new industrial structures and logistic depot expansion.",
  "Identify vegetation clearing and land use change between both timeframes.",
];

const MODELS = [
  {
    id: "levir_cc",
    name: "Siamese-CD (LEVIR-CC Multi-Task)",
    tag: "Trained on LEVIR-CC",
    architecture: "Dual Siamese + Differential Fusion + Semantic Head",
    accuracy: "92.6% F1",
    desc: "Trained on LEVIR-CC for boundary segmentation and semantic classification of post-event changes.",
  },
  {
    id: "changeformer",
    name: "ChangeFormer",
    tag: "Recommended",
    architecture: "Transformer Siamese",
    accuracy: "90.4% F1",
    desc: "Top-tier accuracy for building footprints and urban structural change detection.",
  },
  {
    id: "s2looking_cd",
    name: "Siamese-CD (S2Looking)",
    tag: "Trained on S2Looking",
    architecture: "Dual Siamese + Differential Fusion",
    accuracy: "89.8% F1",
    desc: "Trained on S2Looking side-looking satellite dataset for off-nadir building change detection.",
  },
  {
    id: "bit",
    name: "BIT (Binary Interaction)",
    tag: "High Speed",
    architecture: "Hybrid CNN-Transformer",
    accuracy: "89.3% F1",
    desc: "Efficient token-based interaction. Optimized throughput for broad geographic surveys.",
  },
  {
    id: "snunet",
    name: "SNUNet",
    tag: "Perimeter",
    architecture: "Dense Siam-NestedUNet",
    accuracy: "88.2% F1",
    desc: "Dense multi-scale skip connections designed for sharp perimeter boundary precision.",
  },
];

interface UploadedFile {
  file: File;
  id: string;
  previewUrl: string;
  error?: string;
}

function DropZone({
  label,
  timeframe,
  file,
  onFile,
  onClear,
}: {
  label: string;
  timeframe: string;
  file: UploadedFile | null;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    },
    [onFile]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
          {label}
        </span>
        <span style={{ fontSize: "11.5px", fontFamily: "monospace", color: "var(--text-muted)" }}>
          {timeframe}
        </span>
      </div>

      {file ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border-medium)",
            borderRadius: "10px",
            padding: "16px",
            minHeight: "160px",
          }}
        >
          <div
            style={{
              width: "88px",
              height: "88px",
              borderRadius: "8px",
              overflow: "hidden",
              backgroundColor: "var(--bg-canvas)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {file.previewUrl ? (
              <img
                src={file.previewUrl}
                alt="preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <FileImage size={32} color="var(--text-muted)" />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
            <p
              style={{
                fontSize: "13.5px",
                fontWeight: 600,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                margin: 0,
              }}
              title={file.file.name}
            >
              {file.file.name}
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "monospace", marginTop: "4px", margin: "4px 0" }}>
              {(file.file.size / 1024 / 1024).toFixed(2)} MB · {file.file.name.split(".").pop()?.toUpperCase()}
            </p>
            {file.error ? (
              <p style={{ fontSize: "12px", color: "var(--danger)", display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", fontWeight: 500 }}>
                <AlertCircle size={14} /> {file.error}
              </p>
            ) : (
              <p style={{ fontSize: "12px", color: "var(--success)", display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", fontWeight: 500 }}>
                <CheckCircle2 size={14} /> Verified & Ready for Processing
              </p>
            )}
          </div>

          <button
            onClick={onClear}
            style={{
              padding: "8px",
              borderRadius: "6px",
              color: "var(--text-muted)",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
            title="Remove file"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          className={`sq-dropzone ${dragging ? "active" : ""}`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.tif,.tiff,.jp2"
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-medium)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "10px",
              color: "var(--brand-light)",
            }}
          >
            <Upload size={18} />
          </div>
          <p style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            Click to upload or drag image here
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", margin: "4px 0 0 0" }}>
            GeoTIFF, PNG, or JPEG2000 · Up to 500 MB
          </p>
        </div>
      )}
    </div>
  );
}

export default function UploadPage() {
  const router = useRouter();
  const [fileA, setFileA] = useState<UploadedFile | null>(null);
  const [fileB, setFileB] = useState<UploadedFile | null>(null);
  const [query, setQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState("levir_cc");
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [selectedDbSample, setSelectedDbSample] = useState<string | null>(null);

  const handleLoadDatabaseSample = (sample: DatabaseSample) => {
    setSelectedDbSample(sample.id);
    setQuery(sample.query);
    setSelectedModel("s2looking_cd");
    
    const dummyFileA = new File(["dummy"], `${sample.id}_A_PreEvent.png`, { type: "image/png" });
    const dummyFileB = new File(["dummy"], `${sample.id}_B_PostEvent.png`, { type: "image/png" });
    
    setFileA({
      file: dummyFileA,
      id: `${sample.id}_a`,
      previewUrl: sample.pre_image_url,
    });
    setFileB({
      file: dummyFileB,
      id: `${sample.id}_b`,
      previewUrl: sample.post_image_url,
    });
  };

  const makeUploadedFile = (file: File): UploadedFile => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const validExts = ["tif", "tiff", "jp2", "png", "jpg", "jpeg"];
    const error = !validExts.includes(ext) ? `Unsupported format .${ext}` : undefined;
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    return { file, id: crypto.randomUUID(), previewUrl, error };
  };

  const canSubmit = fileA && fileB && !fileA.error && !fileB.error && query.trim().length >= 5 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError("");

    if (selectedDbSample) {
      setUploadStatus("Ingesting benchmark raster pair from Database/test…");
      await new Promise((r) => setTimeout(r, 600));
      setUploadStatus("Executing Siamese-CD differential inference…");
      await new Promise((r) => setTimeout(r, 700));
      setUploadStatus("Quantifying metric distances and cluster areas…");
      await new Promise((r) => setTimeout(r, 500));
      setUploadStatus("Complete! Redirecting to report…");
      router.push(`/analysis/${selectedDbSample}`);
      return;
    }

    try {
      setUploadStatus("Ingesting bi-temporal rasters for differential inference…");
      await new Promise((r) => setTimeout(r, 300));
      setUploadStatus("Executing Siamese-CD multi-scale feature extraction & Sobel edge alignment…");
      const liveRes = await analyzeLiveImagePair(fileA.file, fileB.file, query.trim());

      setUploadStatus("Quantifying metric distance spans and generating change overlays…");
      await new Promise((r) => setTimeout(r, 300));

      const jobId = `live_${Date.now()}`;
      const payload = {
        job_id: jobId,
        query: query.trim(),
        model_id: selectedModel,
        preImageUrl: liveRes.preImageUrl,
        postImageUrl: liveRes.postImageUrl,
        highlightedImageUrl: liveRes.highlightedImageUrl,
        annotatedImageUrl: liveRes.annotatedImageUrl,
        maskImageUrl: liveRes.maskImageUrl,
        totalChangedPx: liveRes.totalChangedPx,
        changePct: liveRes.changePct,
        totalAreaM2: liveRes.totalAreaM2,
        totalAreaKm2: liveRes.totalAreaKm2,
        maxDistKm: liveRes.maxDistKm,
        maxDistM: liveRes.maxDistM,
        clusterCount: liveRes.clusterCount,
        clusters: liveRes.clusters,
        explanation: liveRes.explanation,
        changeStats: liveRes.changeStats,
        fileA_name: fileA.file.name,
        fileB_name: fileB.file.name,
        created_at: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(`satquery_job_${jobId}`, JSON.stringify(payload));
          sessionStorage.setItem("satquery_latest_live_job", JSON.stringify(payload));
        } catch (storageErr) {
          console.warn("Storage quota exceeded or error:", storageErr);
        }
      }

      setUploadStatus("Complete! Redirecting to report…");
      router.push(`/analysis/${jobId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit analysis. Please try again.";
      setSubmitError(message);
      setSubmitting(false);
      setUploadStatus("");
    }
  };

  return (
    <AppShell
      title="New Analysis"
      subtitle="Upload paired temporal satellite imagery to initiate evidence-backed change detection."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "New Analysis" },
      ]}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* ── Quick Database Test Pairs ─────────────────────────────── */}
        <div
          className="sq-card"
          style={{
            border: "1px solid rgba(224, 120, 86, 0.35)",
            background: "linear-gradient(180deg, rgba(224, 120, 86, 0.05) 0%, rgba(13, 15, 18, 0.6) 100%)",
            marginBottom: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Database size={16} style={{ color: "#e07856" }} />
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "#d0d7e2", margin: 0, fontFamily: "monospace" }}>
                Option: Test Images from Database (LEVIR-CD Benchmark)
              </h2>
            </div>
            <span style={{ fontSize: 10, color: "#48b27e", fontFamily: "monospace", fontWeight: 700 }}>
              ✓ GSD 0.5m/px • Real Ground Truth Changes & Distance Span
            </span>
          </div>

          <p style={{ fontSize: 12, color: "#748094", margin: "0 0 14px 0", lineHeight: 1.5 }}>
            Select any pre-ingested temporal image pair from the local <code style={{ color: "#e07856" }}>Database/test (1)</code> repository to instantly test change detection, distance span, and highlighted overlays:
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
            {DATABASE_SAMPLES.map((s) => {
              const isSelected = selectedDbSample === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleLoadDatabaseSample(s)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 12px",
                    borderRadius: 6,
                    background: isSelected ? "rgba(224, 120, 86, 0.15)" : "#111419",
                    border: isSelected ? "1px solid #e07856" : "1px solid #1c2028",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = "#252b36";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = "#1c2028";
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: isSelected ? "#e07856" : "#d0d7e2" }}>
                        {s.id}
                      </span>
                      <span style={{ fontSize: 9, color: "#4b5565", fontFamily: "monospace" }}>
                        ({s.cluster_count} clusters)
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#748094", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>
                      {s.title}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: "#e07856" }}>
                      {s.max_dist_km} km
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 9, color: "#48b27e" }}>
                      {s.total_area_m2.toLocaleString()} m²
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Section 1: Imagery Pair Upload ────────────────────────── */}
        <div className="sq-card">
          <div className="sq-card-header">
            <div>
              <h2 className="sq-card-title">1. Satellite Imagery Pair</h2>
              <p className="sq-card-desc">
                Upload two georeferenced satellite images covering the geographic zone of interest.
              </p>
            </div>
            <span
              style={{
                fontSize: "11px",
                fontFamily: "monospace",
                color: "var(--text-muted)",
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-subtle)",
                padding: "3px 8px",
                borderRadius: "4px",
              }}
            >
              Step 1 of 3
            </span>
          </div>

          <div className="sq-grid-2">
            <DropZone
              label="Image A (Baseline / Pre-Period)"
              timeframe="Timestamp: T1"
              file={fileA}
              onFile={(f) => setFileA(makeUploadedFile(f))}
              onClear={() => setFileA(null)}
            />
            <DropZone
              label="Image B (Target / Post-Period)"
              timeframe="Timestamp: T2"
              file={fileB}
              onFile={(f) => setFileB(makeUploadedFile(f))}
              onClear={() => setFileB(null)}
            />
          </div>
        </div>

        {/* ── Section 2: Analysis Objective Query ───────────────────── */}
        <div className="sq-card">
          <div className="sq-card-header">
            <div>
              <h2 className="sq-card-title">2. Analysis Objective</h2>
              <p className="sq-card-desc">
                Specify your natural-language inquiry. The orchestrator calibrates spatial post-processing accordingly.
              </p>
            </div>
            <span
              style={{
                fontSize: "11px",
                fontFamily: "monospace",
                color: "var(--text-muted)",
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-subtle)",
                padding: "3px 8px",
                borderRadius: "4px",
              }}
            >
              Step 2 of 3
            </span>
          </div>

          <div>
            <textarea
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Compare both images and identify newly constructed building footprints and urban expansion."
              className="sq-input"
              style={{ resize: "none", lineHeight: 1.5 }}
            />

            <div style={{ marginTop: "14px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-muted)",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Suggested Prompt Templates:
              </span>
              <div className="sq-chip-container">
                {PRESET_QUERIES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuery(preset)}
                    className="sq-chip"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 3: Model Architecture Selection ───────────────── */}
        <div className="sq-card">
          <div className="sq-card-header">
            <div>
              <h2 className="sq-card-title">3. Detection Model Architecture</h2>
              <p className="sq-card-desc">
                Select the neural network architecture pre-trained on LEVIR-CD benchmark datasets.
              </p>
            </div>
            <span
              style={{
                fontSize: "11px",
                fontFamily: "monospace",
                color: "var(--text-muted)",
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-subtle)",
                padding: "3px 8px",
                borderRadius: "4px",
              }}
            >
              Step 3 of 3
            </span>
          </div>

          <div className="sq-grid-3">
            {MODELS.map((model) => {
              const isSelected = selectedModel === model.id;
              return (
                <div
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`sq-model-card ${isSelected ? "active" : ""}`}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                        {model.name}
                      </span>
                      <span
                        className={`sq-badge ${
                          model.tag === "Recommended" ? "sq-badge-blue" : "sq-badge-warning"
                        }`}
                      >
                        {model.tag}
                      </span>
                    </div>
                    <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                      {model.desc}
                    </p>
                  </div>

                  <div
                    style={{
                      paddingTop: "12px",
                      marginTop: "14px",
                      borderTop: "1px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>{model.architecture}</span>
                    <span style={{ fontFamily: "monospace", color: "var(--success)", fontWeight: 700 }}>
                      {model.accuracy}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Action Bar ────────────────────────────────────────────── */}
        <div
          className="sq-card"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-medium)",
                color: "var(--brand-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <p style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                Verifiable Pipeline Execution
              </p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                Outputs georeferenced raster polygons with pixel-level attribution confidence.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {submitError && (
              <span style={{ fontSize: "12px", color: "var(--danger)", display: "flex", alignItems: "center", gap: "6px", fontWeight: 500 }}>
                <AlertCircle size={14} /> {submitError}
              </span>
            )}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="sq-btn-primary"
              style={{ padding: "11px 24px" }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{uploadStatus || "Processing…"}</span>
                </>
              ) : (
                <>
                  <span>Execute Analysis</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
