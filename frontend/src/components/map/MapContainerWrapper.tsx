"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { GroundingBox, GeoTIFFMetadata } from "../../types/satquery";
import { SwipeSlider } from "./SwipeSlider";
import {
  Loader2,
  Sparkles,
  SplitSquareVertical,
  Map as MapIcon,
  Layers,
  Ruler,
  Maximize2,
  Eye,
} from "lucide-react";

// Dynamic import to avoid SSR 'window is not defined' error (maplibre-gl needs window)
const DynamicMissionMap = dynamic(
  () => import("./OdysseusMissionMap").then((mod) => mod.OdysseusMissionMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#090a0d",
          gap: 12,
          fontFamily: "monospace",
        }}
      >
        <Loader2 size={32} style={{ color: "#e07856", animation: "spin 1s linear infinite" }} />
        <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#748094", textTransform: "uppercase" }}>
          INITIALIZING SATELLITE CANVAS ENGINE...
        </div>
        <div style={{ fontSize: 10, color: "#4b5565" }}>MapLibre GL • WebGL 2.0</div>
      </div>
    ),
  }
);

interface MapContainerWrapperProps {
  center: [number, number];
  zoom: number;
  files: GeoTIFFMetadata[];
  groundingBoxes: GroundingBox[];
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  hasSwipeComparison: boolean;
  preImageUrl?: string;
  postImageUrl?: string;
  highlightedImageUrl?: string;
  annotatedImageUrl?: string;
  maskImageUrl?: string;
  maxDistKm?: number;
  totalAreaM2?: number;
  activeScenarioId?: string;
}

type ViewMode = "highlighted" | "swipe" | "pre" | "post" | "map" | "mask";

export const MapContainerWrapper: React.FC<MapContainerWrapperProps> = ({
  center,
  zoom,
  files,
  groundingBoxes,
  showHeatmap,
  onToggleHeatmap,
  hasSwipeComparison,
  preImageUrl,
  postImageUrl,
  highlightedImageUrl,
  annotatedImageUrl,
  maskImageUrl,
  maxDistKm,
  totalAreaM2,
  activeScenarioId,
}) => {
  const hasHighlighted = Boolean(highlightedImageUrl || annotatedImageUrl);
  const [viewMode, setViewMode] = useState<ViewMode>(hasHighlighted ? "highlighted" : "map");
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);

  // Sync mode ONLY when a genuinely new scenario/image is loaded (prevents resetting user view mode)
  const lastActiveScenarioRef = React.useRef<string | undefined>(activeScenarioId);
  React.useEffect(() => {
    if (activeScenarioId && activeScenarioId !== lastActiveScenarioRef.current) {
      lastActiveScenarioRef.current = activeScenarioId;
      if (highlightedImageUrl || annotatedImageUrl) {
        setViewMode("highlighted");
      }
    }
  }, [activeScenarioId, highlightedImageUrl, annotatedImageUrl]);

  const activeDisplayImage = showAnnotations
    ? annotatedImageUrl || highlightedImageUrl || postImageUrl
    : highlightedImageUrl || postImageUrl;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 400, background: "#090a0d", overflow: "hidden" }}>
      {/* Top Floating View Mode Toolbar */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(13, 15, 18, 0.92)",
          border: "1px solid #252b36",
          borderRadius: 6,
          padding: 4,
          backdropFilter: "blur(8px)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
        }}
      >
        {hasHighlighted && (
          <button
            onClick={() => setViewMode("highlighted")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 4,
              border: viewMode === "highlighted" ? "1px solid rgba(224,120,86,0.6)" : "1px solid transparent",
              background: viewMode === "highlighted" ? "rgba(224,120,86,0.2)" : "transparent",
              color: viewMode === "highlighted" ? "#e07856" : "#748094",
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Sparkles size={12} />
            <span>Highlighted Changes</span>
          </button>
        )}

        {(hasSwipeComparison || (preImageUrl && postImageUrl)) && (
          <button
            onClick={() => setViewMode("swipe")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 4,
              border: viewMode === "swipe" ? "1px solid rgba(82,148,226,0.6)" : "1px solid transparent",
              background: viewMode === "swipe" ? "rgba(82,148,226,0.2)" : "transparent",
              color: viewMode === "swipe" ? "#5294e2" : "#748094",
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <SplitSquareVertical size={12} />
            <span>Bi-Temporal Swipe</span>
          </button>
        )}

        {preImageUrl && (
          <button
            onClick={() => setViewMode("pre")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 4,
              border: viewMode === "pre" ? "1px solid rgba(72,178,126,0.6)" : "1px solid transparent",
              background: viewMode === "pre" ? "rgba(72,178,126,0.2)" : "transparent",
              color: viewMode === "pre" ? "#48b27e" : "#748094",
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span>T1: Pre-Event</span>
          </button>
        )}

        {postImageUrl && (
          <button
            onClick={() => setViewMode("post")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 4,
              border: viewMode === "post" ? "1px solid rgba(224,120,86,0.6)" : "1px solid transparent",
              background: viewMode === "post" ? "rgba(224,120,86,0.2)" : "transparent",
              color: viewMode === "post" ? "#e07856" : "#748094",
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span>T2: Post-Event</span>
          </button>
        )}

        <button
          onClick={() => setViewMode("map")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 10px",
            borderRadius: 4,
            border: viewMode === "map" ? "1px solid rgba(116,128,148,0.6)" : "1px solid transparent",
            background: viewMode === "map" ? "rgba(116,128,148,0.2)" : "transparent",
            color: viewMode === "map" ? "#d0d7e2" : "#748094",
            fontFamily: "monospace",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <MapIcon size={12} />
          <span>Map Canvas</span>
        </button>

        {maskImageUrl && (
          <button
            onClick={() => setViewMode("mask")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: 4,
              border: viewMode === "mask" ? "1px solid rgba(217,155,50,0.6)" : "1px solid transparent",
              background: viewMode === "mask" ? "rgba(217,155,50,0.2)" : "transparent",
              color: viewMode === "mask" ? "#d99b32" : "#748094",
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Layers size={12} />
            <span>Binary Mask</span>
          </button>
        )}
      </div>

      {/* Main Display Area */}
      {viewMode === "map" && (
        <DynamicMissionMap
          center={center}
          zoom={zoom}
          files={files}
          groundingBoxes={groundingBoxes}
          showHeatmap={showHeatmap}
          onToggleHeatmap={onToggleHeatmap}
          hasSwipeComparison={hasSwipeComparison}
          showSwipe={false}
          onToggleSwipe={() => setViewMode("swipe")}
          activeScenarioId={activeScenarioId}
        />
      )}

      {viewMode === "swipe" && preImageUrl && postImageUrl && (
        <SwipeSlider
          preImageUrl={preImageUrl}
          postImageUrl={postImageUrl}
          isActive={true}
          onToggle={() => setViewMode("highlighted")}
        />
      )}

      {viewMode === "highlighted" && activeDisplayImage && (
        <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#090a0d" }}>
          <img
            src={activeDisplayImage}
            alt="Highlighted Satellite Changes"
            style={{ width: "100%", height: "100%", objectFit: "contain", userSelect: "none" }}
          />

          {/* Annotation Toggle */}
          <div style={{ position: "absolute", top: 12, right: 12, zIndex: 30, display: "flex", gap: 6 }}>
            <button
              onClick={() => setShowAnnotations(!showAnnotations)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 5,
                background: "rgba(13, 15, 18, 0.90)",
                border: "1px solid #252b36",
                color: showAnnotations ? "#e07856" : "#748094",
                fontFamily: "monospace",
                fontSize: 11,
                cursor: "pointer",
                backdropFilter: "blur(6px)",
              }}
            >
              <Eye size={12} />
              <span>{showAnnotations ? "Box Annotations: ON" : "Box Annotations: OFF"}</span>
            </button>
          </div>

          {/* Real-World Metric Telemetry HUD */}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              right: 12,
              zIndex: 30,
              background: "rgba(13, 15, 18, 0.92)",
              border: "1px solid #252b36",
              borderRadius: 6,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              fontFamily: "monospace",
              backdropFilter: "blur(8px)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Ruler size={13} style={{ color: "#e07856" }} />
                <span style={{ fontSize: 10, color: "#748094", textTransform: "uppercase" }}>Visible Change Span:</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#e07856" }}>
                  {maxDistKm ? `${maxDistKm} km (${Math.round(maxDistKm * 1000)}m)` : "0.44 km (440m)"}
                </span>
              </div>

              {totalAreaM2 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Layers size={13} style={{ color: "#48b27e" }} />
                  <span style={{ fontSize: 10, color: "#748094", textTransform: "uppercase" }}>Changed Footprint:</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#48b27e" }}>
                    +{totalAreaM2.toLocaleString()} m² (+{(totalAreaM2 / 1_000_000).toFixed(4)} km²)
                  </span>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.03)", padding: "2px 8px", borderRadius: 4, border: "1px solid #1c2028" }}>
                <span style={{ fontSize: 9, color: "#48b27e", fontWeight: 700 }}>T1 Baseline</span>
                <span style={{ fontSize: 9, color: "#748094" }}>➔</span>
                <span style={{ fontSize: 9, color: "#e07856", fontWeight: 700 }}>T2 +{totalAreaM2 ? totalAreaM2.toLocaleString() : "29,711"} m² Added</span>
              </div>

              <div style={{ fontSize: 10, color: "#4b5565" }}>
                <span>TILE EXTENT: 0.512 km × 0.512 km (0.262 km²) • GSD: 0.5m/px</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#e07856",
                  background: "rgba(224,120,86,0.15)",
                  border: "1px solid rgba(224,120,86,0.3)",
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                {groundingBoxes.length} Clusters Highlighted
              </span>
            </div>
          </div>
        </div>
      )}

      {viewMode === "pre" && preImageUrl && (
        <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#090a0d" }}>
          <img
            src={preImageUrl}
            alt="T1 Pre-Event Baseline"
            style={{ width: "100%", height: "100%", objectFit: "contain", userSelect: "none" }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              background: "rgba(13, 15, 18, 0.90)",
              border: "1px solid rgba(72,178,126,0.4)",
              borderRadius: 5,
              padding: "6px 14px",
              fontFamily: "monospace",
              fontSize: 11,
              color: "#48b27e",
              boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            T1 Baseline Image (Pre-Event) • Natural Land & Undeveloped Baseline
          </div>
        </div>
      )}

      {viewMode === "post" && postImageUrl && (
        <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#090a0d" }}>
          <img
            src={postImageUrl}
            alt="T2 Post-Event Target"
            style={{ width: "100%", height: "100%", objectFit: "contain", userSelect: "none" }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              background: "rgba(13, 15, 18, 0.90)",
              border: "1px solid rgba(224,120,86,0.4)",
              borderRadius: 5,
              padding: "6px 14px",
              fontFamily: "monospace",
              fontSize: 11,
              color: "#e07856",
              boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            T2 Target Image (Post-Event) • Shows New Construction & Altered Terrain
          </div>
        </div>
      )}

      {viewMode === "mask" && maskImageUrl && (
        <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000000" }}>
          <img
            src={maskImageUrl}
            alt="Binary Change Mask"
            style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              background: "rgba(13, 15, 18, 0.90)",
              border: "1px solid #252b36",
              borderRadius: 5,
              padding: "6px 12px",
              fontFamily: "monospace",
              fontSize: 11,
              color: "#a2acbd",
            }}
          >
            Ground Truth Binary Mask (LEVIR-CD Benchmark • 255 = Change, 0 = Invariant)
          </div>
        </div>
      )}
    </div>
  );
};
