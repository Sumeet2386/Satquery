"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Crosshair,
  Layers,
  Flame,
  SplitSquareVertical,
  Eye,
  EyeOff,
} from "lucide-react";
import { GroundingBox, GeoTIFFMetadata } from "../../types/satquery";

interface OdysseusMissionMapProps {
  center: [number, number]; // [lat, lng]
  zoom: number;
  files: GeoTIFFMetadata[];
  groundingBoxes: GroundingBox[];
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  hasSwipeComparison: boolean;
  showSwipe: boolean;
  onToggleSwipe: () => void;
  activeScenarioId?: string;
}

function getBoxStyle(category: string, confidence: number): { color: string; bg: string } {
  if (confidence >= 95) return { color: "#e07856", bg: "rgba(224,120,86,0.18)" };
  switch (category) {
    case "vessel": return { color: "#e07856", bg: "rgba(224,120,86,0.15)" };
    case "flood":  return { color: "#5294e2", bg: "rgba(82,148,226,0.3)" };
    default:       return { color: "#d99b32", bg: "rgba(217,155,50,0.18)" };
  }
}

function buildGeoJson(boxes: GroundingBox[], visible: boolean) {
  return {
    type: "FeatureCollection" as const,
    features: visible
      ? boxes.map((box) => {
          const [minLat, minLng, maxLat, maxLng] = box.bbox;
          const style = getBoxStyle(box.category, box.confidence);
          return {
            type: "Feature" as const,
            id: box.id,
            properties: { id: box.id, label: box.label, confidence: box.confidence, category: box.category, color: style.color },
            geometry: {
              type: "Polygon" as const,
              coordinates: [[[minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat]]],
            },
          };
        })
      : [],
  };
}

// Shared control button style builder
function ctrlBtn(active: boolean, activeColor = "#e07856"): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 6,
    padding: "5px 10px", borderRadius: 4, border: "1px solid",
    fontSize: 11, fontFamily: "monospace", cursor: "pointer",
    transition: "all 0.15s",
    background: active ? `${activeColor}22` : "rgba(13,15,18,0.90)",
    borderColor: active ? `${activeColor}80` : "#252b36",
    color: active ? activeColor : "#748094",
  };
}

export const OdysseusMissionMap: React.FC<OdysseusMissionMapProps> = ({
  center, zoom, files, groundingBoxes,
  showHeatmap, onToggleHeatmap,
  hasSwipeComparison, showSwipe, onToggleSwipe,
  activeScenarioId,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [coords, setCoords] = useState({ lat: center[0], lng: center[1], zoom });
  const [showBoxes, setShowBoxes] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const resolution = files.length > 0 ? files[0].resolution_m : 10.0;

  // Init map once
  useEffect(() => {
    if (!mapRef.current) return;
    let map: any;

    import("maplibre-gl").then((mod) => {
      const maplibre = mod;
      if (typeof maplibre.setWorkerUrl === "function") {
        maplibre.setWorkerUrl("/maplibre-gl-worker.mjs");
      }
      const style: any = {
        version: 8,
        sources: {
          "osm-dark": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          { id: "background", type: "background", paint: { "background-color": "#0d0f12" } },
          {
            id: "osm-tiles", type: "raster", source: "osm-dark",
            paint: {
              "raster-opacity": 0.65,
              "raster-saturation": -0.9,
              "raster-brightness-min": 0.0,
              "raster-brightness-max": 0.4,
              "raster-contrast": 0.3,
            },
          },
        ],
      };

      map = new maplibre.Map({
        container: mapRef.current!,
        style,
        center: [center[1], center[0]],
        zoom,
        attributionControl: false,
        pitchWithRotate: false,
      });

      mapInstanceRef.current = map;

      map.on("load", () => {
        setMapReady(true);
        const initialGeoJson = buildGeoJson(groundingBoxes, showBoxes);
        if (!map.getSource("satquery-boxes-source")) {
          map.addSource("satquery-boxes-source", { type: "geojson", data: initialGeoJson });
          map.addLayer({ id: "satquery-boxes-fill", type: "fill", source: "satquery-boxes-source",
            paint: { "fill-color": ["get", "color"], "fill-opacity": 0.22 } });
          map.addLayer({ id: "satquery-boxes-line", type: "line", source: "satquery-boxes-source",
            paint: { "line-color": ["get", "color"], "line-width": 2 } });
          map.on("mouseenter", "satquery-boxes-fill", () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", "satquery-boxes-fill", () => { map.getCanvas().style.cursor = ""; });
        }
      });

      map.on("move", () => {
        const c = map.getCenter();
        setCoords({ lat: Number(c.lat.toFixed(5)), lng: Number(c.lng.toFixed(5)), zoom: Number(map.getZoom().toFixed(1)) });
      });
    });

    return () => { map?.remove(); mapInstanceRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update GeoJSON boxes
  useEffect(() => {
    if (mapInstanceRef.current && mapReady) {
      const src = mapInstanceRef.current.getSource("satquery-boxes-source");
      if (src) src.setData(buildGeoJson(groundingBoxes, showBoxes));
    }
  }, [groundingBoxes, showBoxes, mapReady]);

  // Fly to new center/zoom
  useEffect(() => {
    if (mapInstanceRef.current && mapReady) {
      mapInstanceRef.current.flyTo({ center: [center[1], center[0]], zoom, duration: 1200 });
    }
  }, [center, zoom, mapReady]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#090a0d", overflow: "hidden" }}>
      {/* Map Canvas */}
      <div ref={mapRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Top-Right Controls */}
      <div style={{
        position: "absolute", top: 12, right: 12, zIndex: 20,
        display: "flex", flexDirection: "column", gap: 6,
        fontFamily: "monospace",
      }}>
        {/* Heatmap toggle */}
        <button onClick={onToggleHeatmap} style={ctrlBtn(showHeatmap, "#e07856")} title="Toggle Change Heatmap">
          <Flame size={12} /> <span>Heatmap</span>
        </button>

        {/* Swipe toggle */}
        {hasSwipeComparison && (
          <button onClick={onToggleSwipe} style={ctrlBtn(showSwipe, "#5294e2")} title="Toggle Swipe Comparison">
            <SplitSquareVertical size={12} /> <span>Swipe</span>
          </button>
        )}

        {/* Boxes toggle */}
        <button onClick={() => setShowBoxes(!showBoxes)} style={ctrlBtn(showBoxes, "#748094")} title="Toggle Bounding Boxes">
          {showBoxes ? <Eye size={12} /> : <EyeOff size={12} />}
          <span>Boxes</span>
        </button>

        {/* Layers indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 10px", borderRadius: 4,
          background: "rgba(13,15,18,0.90)", border: "1px solid #252b36",
          fontSize: 11, fontFamily: "monospace", color: "#748094",
        }}>
          <Layers size={12} style={{ color: "#e07856" }} />
          <span>{files.length} tile{files.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Top-Left: File HUD */}
      {files.length > 0 && (
        <div style={{
          position: "absolute", top: 12, left: 12, zIndex: 20,
          display: "flex", flexDirection: "column", gap: 4,
          fontFamily: "monospace",
        }}>
          {files.map((file) => (
            <div key={file.id} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(13,15,18,0.90)", border: "1px solid #252b36",
              borderRadius: 4, padding: "4px 8px", fontSize: 10, color: "#a2acbd",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: file.data_type === "SAR" ? "#d99b32" : "#e07856",
              }} />
              <span style={{ fontWeight: 700, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {file.data_type === "SAR" ? "SAR" : "OPT"}
              </span>
              <span style={{ color: "#748094", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {file.filename}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom-Left: Grounding Box Legend */}
      {groundingBoxes.length > 0 && showBoxes && (
        <div style={{
          position: "absolute", bottom: 56, left: 12, zIndex: 20,
          background: "rgba(13,15,18,0.90)", border: "1px solid #252b36",
          borderRadius: 6, padding: "10px 12px",
          fontFamily: "monospace", fontSize: 10, maxWidth: 200,
        }}>
          <div style={{ color: "#e07856", fontWeight: 700, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Detected ({groundingBoxes.length})
          </div>
          {groundingBoxes.slice(0, 4).map((box) => {
            const style = getBoxStyle(box.category, box.confidence);
            return (
              <div key={box.id} style={{ display: "flex", alignItems: "center", gap: 6, color: "#a2acbd", marginBottom: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: style.color, opacity: 0.8 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{box.label}</span>
                <span style={{ color: "#4b5565", flexShrink: 0 }}>{box.confidence.toFixed(0)}%</span>
              </div>
            );
          })}
          {groundingBoxes.length > 4 && (
            <div style={{ color: "#4b5565", fontSize: 9, marginTop: 2 }}>+{groundingBoxes.length - 4} more…</div>
          )}
        </div>
      )}

      {/* Bottom-Left: Coordinate Telemetry HUD */}
      <div style={{
        position: "absolute", bottom: 12, left: 12, zIndex: 20,
        background: "rgba(13,15,18,0.90)", border: "1px solid #252b36",
        borderRadius: 6, padding: "8px 12px",
        fontFamily: "monospace", fontSize: 11, color: "#a2acbd",
        userSelect: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#e07856", fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 5 }}>
          <Crosshair size={12} />
          <span>Nadir Sensor Reticle</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px", fontSize: 10 }}>
          <div><span style={{ color: "#4b5565" }}>LAT: </span><span style={{ color: "#d0d7e2" }}>{coords.lat.toFixed(5)}°N</span></div>
          <div><span style={{ color: "#4b5565" }}>LNG: </span><span style={{ color: "#d0d7e2" }}>{coords.lng.toFixed(5)}°E</span></div>
          <div><span style={{ color: "#4b5565" }}>ZOOM: </span><span style={{ color: "#e07856" }}>{coords.zoom}x</span></div>
          <div><span style={{ color: "#4b5565" }}>GSD: </span><span style={{ color: "#a2acbd" }}>{resolution}m</span></div>
        </div>
      </div>

      {/* Heatmap visual overlay */}
      {showHeatmap && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }}>
          <div style={{
            position: "absolute", inset: 0,
            background: activeScenarioId === "scenario-2-flood-change"
              ? "radial-gradient(ellipse 60% 40% at 55% 40%, rgba(82,148,226,0.35) 0%, transparent 70%)"
              : "radial-gradient(ellipse 50% 35% at 50% 50%, rgba(224,120,86,0.25) 0%, transparent 70%)",
          }} />
          <div style={{
            position: "absolute", top: 48, right: 128,
            fontFamily: "monospace", fontSize: 10, color: "#5294e2",
            background: "rgba(13,15,18,0.80)", border: "1px solid #252b36",
            padding: "4px 8px", borderRadius: 4,
          }}>
            {activeScenarioId === "scenario-2-flood-change"
              ? "INUNDATION ZONE: 142.84 km²"
              : "CHANGE HEATMAP ACTIVE"}
          </div>
        </div>
      )}
    </div>
  );
};
