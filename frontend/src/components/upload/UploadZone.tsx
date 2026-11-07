"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileCode,
  Layers,
  Trash2,
  Info,
  FileCheck,
  ChevronRight,
  Zap,
  X,
  Sparkles,
  Loader2,
  FileImage,
} from "lucide-react";
import { GeoTIFFMetadata, InputConfiguration, SensorType } from "../../types/satquery";
import { THEME_CONFIG } from "../../constants/theme";

interface UploadZoneProps {
  files: GeoTIFFMetadata[];
  onFilesChange: (files: GeoTIFFMetadata[]) => void;
  inputConfig: InputConfiguration;
  onSelectPreset: (scenarioIndex: number) => void;
  onAnalyzeLivePair?: (fileA: File, fileB: File) => void;
  isProcessing?: boolean;
}

const PRESETS = [
  { idx: 0, label: "Optical — Visakhapatnam Port", tag: "OPT" },
  { idx: 1, label: "Bi-Temporal — Brahmaputra Flood", tag: "BIT" },
  { idx: 2, label: "SAR Fusion — Mumbai Maritime", tag: "SAR" },
];

const DATABASE_PRESETS = [
  { idx: 3, id: "test_1", label: "test_1 · Residential Footprints", span: "0.11 km", tag: "DB" },
  { idx: 4, id: "test_2", label: "test_2 · Suburban Housing Cluster", span: "0.55 km", tag: "DB" },
  { idx: 5, id: "test_10", label: "test_10 · High-Density Commercial", span: "0.28 km", tag: "DB" },
  { idx: 6, id: "test_14", label: "test_14 · Industrial Logistics Depot", span: "0.27 km", tag: "DB" },
  { idx: 7, id: "test_28", label: "test_28 · Highway & Grading Additions", span: "0.63 km", tag: "DB" },
  { idx: 8, id: "test_42", label: "test_42 · Commercial Foundations", span: "0.48 km", tag: "DB" },
  { idx: 9, id: "test_100", label: "test_100 · Urban Transformation", span: "0.55 km", tag: "DB" },
];

export const UploadZone: React.FC<UploadZoneProps> = ({
  files,
  onFilesChange,
  inputConfig,
  onSelectPreset,
  onAnalyzeLivePair,
  isProcessing = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileForModal, setSelectedFileForModal] = useState<GeoTIFFMetadata | null>(null);
  const [livePreFile, setLivePreFile] = useState<File | null>(null);
  const [livePostFile, setLivePostFile] = useState<File | null>(null);
  const [prePreview, setPrePreview] = useState<string | null>(null);
  const [postPreview, setPostPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputPreRef = useRef<HTMLInputElement>(null);
  const fileInputPostRef = useRef<HTMLInputElement>(null);

  const handleSelectPre = (f: File) => {
    setLivePreFile(f);
    setPrePreview(URL.createObjectURL(f));
    if (livePostFile) {
      onAnalyzeLivePair?.(f, livePostFile);
    }
  };

  const handleSelectPost = (f: File) => {
    setLivePostFile(f);
    setPostPreview(URL.createObjectURL(f));
    if (livePreFile) {
      onAnalyzeLivePair?.(livePreFile, f);
    }
  };

  const parseMockMetadata = (file: File, index: number): GeoTIFFMetadata => {
    const isSar = /sar|s1|risat/i.test(file.name);
    const isLandsat = /landsat|l8/i.test(file.name);
    const isCartosat = /carto|c3/i.test(file.name);
    let sensor_hint: SensorType = "sentinel2";
    if (isSar) sensor_hint = "sentinel1_sar";
    else if (isLandsat) sensor_hint = "landsat8";
    else if (isCartosat) sensor_hint = "cartosat3";
    const data_type: "Optical" | "SAR" = isSar ? "SAR" : "Optical";
    return {
      id: `custom_upl_${Date.now()}_${index}`,
      filename: file.name,
      sensor_hint,
      bands: isSar ? 2 : 12,
      crs: "EPSG:32643",
      resolution_m: isSar ? 10.0 : 10.0,
      width: 1024,
      height: 1024,
      acquisition_date: new Date().toISOString(),
      bbox: [18.910, 72.780, 19.010, 72.910],
      center: [18.960, 72.845],
      thumbnail_url: URL.createObjectURL(file),
      data_type,
      file_size_mb: Number((file.size / 1048576 || 24.5).toFixed(1)),
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length >= 2) {
        handleSelectPre(dropped[0]);
        handleSelectPost(dropped[1]);
        onAnalyzeLivePair?.(dropped[0], dropped[1]);
      } else if (dropped.length === 1) {
        if (!livePreFile) handleSelectPre(dropped[0]);
        else handleSelectPost(dropped[0]);
      }
      const parsed = dropped.slice(0, 2).map(parseMockMetadata);
      onFilesChange(parsed);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      if (selected.length >= 2) {
        handleSelectPre(selected[0]);
        handleSelectPost(selected[1]);
        onAnalyzeLivePair?.(selected[0], selected[1]);
      } else if (selected.length === 1) {
        if (!livePreFile) handleSelectPre(selected[0]);
        else handleSelectPost(selected[0]);
      }
      const parsed = selected.slice(0, 2).map(parseMockMetadata);
      onFilesChange(parsed);
    }
  };

  const configInfo = THEME_CONFIG.configBadges[inputConfig] || THEME_CONFIG.configBadges["Single Optical"];

  const panelStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "#0d0f12",
    overflow: "hidden",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    borderBottom: "1px solid #1c2028",
    background: "#111419",
    flexShrink: 0,
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: "monospace",
    fontSize: 9,
    color: "#4b5565",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 6,
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Layers size={13} style={{ color: "#e07856" }} />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 700,
              color: "#d0d7e2",
              letterSpacing: "0.04em",
            }}
          >
            Raster Ingestion
          </span>
        </div>
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            color: "#748094",
            background: "#15181f",
            border: "1px solid #252b36",
            padding: "2px 7px",
            borderRadius: 4,
          }}
        >
          {files.length}/2 slots
        </span>
      </div>

      {/* Scrollable body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Input Config Chip */}
        <div>
          <div style={sectionLabelStyle}>Input Mode</div>
          <div
            style={{
              background: "#15181f",
              border: "1px solid #252b36",
              borderRadius: 6,
              padding: "8px 10px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 3,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <FileCheck size={12} style={{ color: "#e07856" }} />
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#d0d7e2",
                  }}
                >
                  {configInfo.label}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 8,
                  color: "#4b5565",
                  background: "#0d0f12",
                  border: "1px solid #1c2028",
                  padding: "1px 5px",
                  borderRadius: 3,
                  letterSpacing: "0.06em",
                }}
              >
                AUTO
              </span>
            </div>
            <p
              style={{
                fontFamily: "sans-serif",
                fontSize: 10,
                color: "#4b5565",
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {configInfo.description}
            </p>
          </div>
        </div>

        {/* Live Image Pair Upload Slots */}
        <div>
          <div style={{ ...sectionLabelStyle, display: "flex", alignItems: "center", justifyContent: "space-between", color: "#e07856" }}>
            <span>Live Image Pair Ingestion</span>
            <span style={{ fontSize: 8, color: "#48b27e" }}>T1 & T2</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
            {/* Slot A: Pre-Event */}
            <div
              onClick={() => fileInputPreRef.current?.click()}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: 5,
                background: livePreFile ? "rgba(72,178,126,0.08)" : "#0d0f12",
                border: `1px ${livePreFile ? "solid rgba(72,178,126,0.35)" : "dashed #252b36"}`,
                cursor: "pointer",
              }}
            >
              <input
                ref={fileInputPreRef}
                type="file"
                accept="image/*,.tif,.tiff"
                style={{ display: "none" }}
                onChange={(e) => e.target.files?.[0] && handleSelectPre(e.target.files[0])}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                {prePreview ? (
                  <img src={prePreview} alt="T1 preview" style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: 4, background: "#15181f", display: "flex", alignItems: "center", justifyContent: "center", color: "#e07856" }}>
                    <FileImage size={14} />
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: livePreFile ? "#48b27e" : "#d0d7e2" }}>
                    {livePreFile ? livePreFile.name : "Pre-Event Image (T1 Baseline)"}
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 8, color: "#4b5565" }}>
                    {livePreFile ? `${(livePreFile.size / 1024).toFixed(0)} KB • Click to replace` : "Click to select or drop baseline"}
                  </div>
                </div>
              </div>
              <span style={{ fontFamily: "monospace", fontSize: 8, fontWeight: 700, color: livePreFile ? "#48b27e" : "#748094", background: "#111419", padding: "1px 5px", borderRadius: 3 }}>
                {livePreFile ? "LOADED" : "SLOT 1"}
              </span>
            </div>

            {/* Slot B: Post-Event */}
            <div
              onClick={() => fileInputPostRef.current?.click()}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: 5,
                background: livePostFile ? "rgba(224,120,86,0.08)" : "#0d0f12",
                border: `1px ${livePostFile ? "solid rgba(224,120,86,0.35)" : "dashed #252b36"}`,
                cursor: "pointer",
              }}
            >
              <input
                ref={fileInputPostRef}
                type="file"
                accept="image/*,.tif,.tiff"
                style={{ display: "none" }}
                onChange={(e) => e.target.files?.[0] && handleSelectPost(e.target.files[0])}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                {postPreview ? (
                  <img src={postPreview} alt="T2 preview" style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: 4, background: "#15181f", display: "flex", alignItems: "center", justifyContent: "center", color: "#e07856" }}>
                    <FileImage size={14} />
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: livePostFile ? "#e07856" : "#d0d7e2" }}>
                    {livePostFile ? livePostFile.name : "Post-Event Image (T2 Target)"}
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 8, color: "#4b5565" }}>
                    {livePostFile ? `${(livePostFile.size / 1024).toFixed(0)} KB • Click to replace` : "Click to select or drop target"}
                  </div>
                </div>
              </div>
              <span style={{ fontFamily: "monospace", fontSize: 8, fontWeight: 700, color: livePostFile ? "#e07856" : "#748094", background: "#111419", padding: "1px 5px", borderRadius: 3 }}>
                {livePostFile ? "LOADED" : "SLOT 2"}
              </span>
            </div>

            {/* Analyze Live Action Button */}
            {livePreFile && livePostFile && (
              <button
                type="button"
                onClick={() => onAnalyzeLivePair?.(livePreFile, livePostFile)}
                disabled={isProcessing}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 5,
                  background: "#e07856",
                  color: "#090a0d",
                  fontWeight: 800,
                  fontFamily: "monospace",
                  fontSize: 10,
                  border: "none",
                  cursor: isProcessing ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow: "0 2px 10px rgba(224,120,86,0.35)",
                  transition: "all 0.15s ease",
                  marginTop: 2,
                }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                    <span>ANALYZING LIVE IMAGES…</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    <span>ANALYZE LIVE IMAGES</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Drag & Drop Alternative */}
        <div>
          <div style={sectionLabelStyle}>Batch Drag & Drop</div>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? "#e07856" : "#252b36"}`,
              borderRadius: 6,
              padding: "12px 10px",
              textAlign: "center",
              cursor: "pointer",
              background: isDragging ? "rgba(224,120,86,0.06)" : "#0d0f12",
              transition: "all 0.15s ease",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".tif,.tiff,.png,.jpg,.jpeg,.json,.geojson"
              style={{ display: "none" }}
              onChange={handleFileInputChange}
            />
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "#15181f",
                border: "1px solid #252b36",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 6px",
                color: "#e07856",
              }}
            >
              <UploadCloud size={14} />
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                fontWeight: 600,
                color: "#a2acbd",
                marginBottom: 2,
              }}
            >
              Drop Image Pair Here
            </div>
            <div
              style={{
                fontFamily: "sans-serif",
                fontSize: 8,
                color: "#4b5565",
                lineHeight: 1.3,
              }}
            >
              Automatically assigns Pre & Post slots
            </div>
          </div>
        </div>

        {/* Test Presets */}
        <div>
          <div style={{ ...sectionLabelStyle, display: "flex", alignItems: "center", gap: 4 }}>
            <Zap size={9} style={{ color: "#e07856" }} />
            Quick Presets
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {PRESETS.map((p) => (
              <button
                key={p.idx}
                onClick={() => onSelectPreset(p.idx)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: 5,
                  border: "1px solid #1c2028",
                  background: "#0d0f12",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#15181f";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#252b36";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#0d0f12";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#1c2028";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 8,
                      fontWeight: 700,
                      color: "#e07856",
                      background: "rgba(224,120,86,0.1)",
                      border: "1px solid rgba(224,120,86,0.3)",
                      padding: "1px 4px",
                      borderRadius: 3,
                      flexShrink: 0,
                    }}
                  >
                    {p.tag}
                  </span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 10,
                      color: "#a2acbd",
                      textAlign: "left",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.label}
                  </span>
                </div>
                <ChevronRight size={11} style={{ color: "#4b5565", flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>

        {/* Database Test Pairs Section */}
        <div>
          <div style={{ ...sectionLabelStyle, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#e07856" }}>
            <span>Database Test Pairs (LEVIR-CD)</span>
            <span style={{ fontSize: 8, color: "#48b27e" }}>GSD 0.5m</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {DATABASE_PRESETS.map((p) => (
              <button
                key={p.idx}
                onClick={() => onSelectPreset(p.idx)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 9px",
                  borderRadius: 5,
                  border: "1px solid #1c2028",
                  background: "#0d0f12",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#15181f";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#e07856";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#0d0f12";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#1c2028";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 8,
                      fontWeight: 700,
                      color: "#5294e2",
                      background: "rgba(82,148,226,0.1)",
                      border: "1px solid rgba(82,148,226,0.3)",
                      padding: "1px 4px",
                      borderRadius: 3,
                      flexShrink: 0,
                    }}
                  >
                    {p.tag}
                  </span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 10,
                      color: "#a2acbd",
                      textAlign: "left",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.label}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 8,
                    fontWeight: 700,
                    color: "#e07856",
                    background: "rgba(224,120,86,0.12)",
                    border: "1px solid rgba(224,120,86,0.25)",
                    padding: "1px 4px",
                    borderRadius: 3,
                    flexShrink: 0,
                  }}
                >
                  {p.span}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Loaded Files */}
        {files.length > 0 && (
          <div>
            <div
              style={{
                ...sectionLabelStyle,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>Loaded Tiles ({files.length})</span>
              <button
                onClick={() => onFilesChange([])}
                style={{
                  fontFamily: "monospace",
                  fontSize: 9,
                  color: "#d45353",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Clear all
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {files.map((file) => (
                <div
                  key={file.id}
                  style={{
                    background: "#15181f",
                    border: "1px solid #252b36",
                    borderRadius: 6,
                    padding: "8px 10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      {file.thumbnail_url ? (
                        <img
                          src={file.thumbnail_url}
                          alt="thumb"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 4,
                            objectFit: "cover",
                            border: "1px solid #252b36",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 4,
                            background: "#0d0f12",
                            border: "1px solid #252b36",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "monospace",
                            fontSize: 8,
                            fontWeight: 800,
                            color: "#e07856",
                            flexShrink: 0,
                          }}
                        >
                          {file.data_type === "SAR" ? "SAR" : "MSI"}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontSize: 10,
                            fontWeight: 600,
                            color: "#d0d7e2",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={file.filename}
                        >
                          {file.filename}
                        </div>
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontSize: 9,
                            color: "#4b5565",
                            marginTop: 2,
                          }}
                        >
                          {file.sensor_hint.toUpperCase()} · {file.file_size_mb}MB
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                      <button
                        onClick={() => setSelectedFileForModal(file)}
                        title="GeoTIFF metadata"
                        style={{
                          padding: 4,
                          borderRadius: 4,
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          color: "#4b5565",
                        }}
                      >
                        <Info size={12} />
                      </button>
                      <button
                        onClick={() => onFilesChange(files.filter((f) => f.id !== file.id))}
                        title="Remove"
                        style={{
                          padding: 4,
                          borderRadius: 4,
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          color: "#4b5565",
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Metadata row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 4,
                      marginTop: 7,
                      paddingTop: 7,
                      borderTop: "1px solid #1c2028",
                    }}
                  >
                    {[
                      { label: "CRS", value: file.crs, accent: false },
                      { label: "GSD", value: `${file.resolution_m}m`, accent: true },
                      { label: "DIMS", value: `${file.width}×${file.height}`, accent: false },
                    ].map((m) => (
                      <div
                        key={m.label}
                        style={{
                          background: "#0d0f12",
                          borderRadius: 4,
                          padding: "4px 6px",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontSize: 8,
                            color: "#4b5565",
                            letterSpacing: "0.06em",
                            marginBottom: 1,
                          }}
                        >
                          {m.label}
                        </div>
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontSize: 9,
                            fontWeight: 600,
                            color: m.accent ? "#e07856" : "#a2acbd",
                          }}
                        >
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* GeoTIFF Modal */}
      {selectedFileForModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: "#111419",
              border: "1px solid #252b36",
              borderRadius: 8,
              maxWidth: 420,
              width: "100%",
              padding: 20,
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #1c2028",
                paddingBottom: 10,
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#e07856" }}>
                <FileCode size={14} />
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#e07856",
                  }}
                >
                  GeoTIFF Compatibility Report
                </span>
              </div>
              <button
                onClick={() => setSelectedFileForModal(null)}
                style={{
                  background: "#15181f",
                  border: "1px solid #252b36",
                  borderRadius: 4,
                  color: "#748094",
                  cursor: "pointer",
                  padding: "2px 6px",
                }}
              >
                <X size={12} />
              </button>
            </div>
            <pre
              style={{
                background: "#090a0d",
                border: "1px solid #1c2028",
                borderRadius: 5,
                padding: 12,
                fontFamily: "monospace",
                fontSize: 11,
                color: "#a2acbd",
                overflowX: "auto",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {JSON.stringify(
                {
                  filename: selectedFileForModal.filename,
                  sensor_hint: selectedFileForModal.sensor_hint,
                  bands: selectedFileForModal.bands,
                  crs: selectedFileForModal.crs,
                  resolution_m: selectedFileForModal.resolution_m,
                  width: selectedFileForModal.width,
                  height: selectedFileForModal.height,
                  data_type: selectedFileForModal.data_type,
                },
                null,
                2
              )}
            </pre>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button
                onClick={() => setSelectedFileForModal(null)}
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  background: "#15181f",
                  border: "1px solid #252b36",
                  borderRadius: 5,
                  color: "#a2acbd",
                  padding: "6px 14px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
