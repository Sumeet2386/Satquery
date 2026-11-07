"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreInstance, StyleSpecification } from "maplibre-gl";
import {
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  Eye,
  EyeOff,
} from "lucide-react";

export interface ChangeFeature {
  id: string | number;
  confidence: number;
  areaKm2?: number;
  changeType?: string;
  coordinates?: [number, number];
}

interface MapViewerProps {
  geoJsonData?: GeoJSON.FeatureCollection | null;
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  className?: string;
  onSelectFeature?: (feature: ChangeFeature | null) => void;
}

// Default sample LEVIR-CD change detection polygons (near Shenzhen urban expansion test area)
const DEFAULT_SAMPLE_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "cf-01",
      properties: {
        id: "Region #1",
        confidence: 0.92,
        areaM2: 48200,
        changeType: "New Building Construction",
        description: "High-density concrete foundation detected",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [114.055, 22.542],
            [114.059, 22.542],
            [114.058, 22.538],
            [114.054, 22.539],
            [114.055, 22.542],
          ],
        ],
      },
    },
    {
      type: "Feature",
      id: "cf-02",
      properties: {
        id: "Region #2",
        confidence: 0.86,
        areaM2: 24500,
        changeType: "Impervious Surface",
        description: "Paved road expansion & logistics depot",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [114.062, 22.545],
            [114.067, 22.546],
            [114.066, 22.541],
            [114.061, 22.542],
            [114.062, 22.545],
          ],
        ],
      },
    },
    {
      type: "Feature",
      id: "cf-03",
      properties: {
        id: "Region #3",
        confidence: 0.74,
        areaM2: 18100,
        changeType: "Vegetation Clearing",
        description: "Cleared parcel adjacent to transport corridor",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [114.048, 22.536],
            [114.052, 22.537],
            [114.051, 22.533],
            [114.047, 22.534],
            [114.048, 22.536],
          ],
        ],
      },
    },
    {
      type: "Feature",
      id: "cf-04",
      properties: {
        id: "Region #4",
        confidence: 0.68,
        areaM2: 12000,
        changeType: "Excavation",
        description: "Ground preparation / early earthworks",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [114.068, 22.538],
            [114.072, 22.539],
            [114.071, 22.535],
            [114.067, 22.535],
            [114.068, 22.538],
          ],
        ],
      },
    },
  ],
};

interface FeatureProperties {
  id?: string | number;
  changeType?: string;
  confidence?: number;
  areaM2?: number;
  description?: string;
}

export default function MapViewer({
  geoJsonData = DEFAULT_SAMPLE_GEOJSON,
  center = [114.058, 22.54],
  zoom = 14,
  className = "",
  onSelectFeature,
}: MapViewerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<MapLibreInstance | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [showChanges, setShowChanges] = useState(true);
  const [opacity, setOpacity] = useState(75);
  const [selectedFeature, setSelectedFeature] = useState<FeatureProperties | null>(null);
  const [mapStyle, setMapStyle] = useState<"dark" | "satellite">("dark");

  // Tile styles (using reliable public tile services)
  const getStyleConfig = (style: "dark" | "satellite"): StyleSpecification => {
    if (style === "satellite") {
      return {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Esri, Maxar, Earthstar Geographics",
          },
        },
        layers: [
          {
            id: "satellite-layer",
            type: "raster",
            source: "satellite",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      };
    }

    // Modern high-contrast dark carto style
    return {
      version: 8,
      sources: {
        carto_dark: {
          type: "raster",
          tiles: [
            "https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png",
          ],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors, © CARTO",
        },
      },
      layers: [
        {
          id: "carto-dark-layer",
          type: "raster",
          source: "carto_dark",
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    };
  };

  const loadLayers = (map: MapLibreInstance) => {
    const data = geoJsonData || DEFAULT_SAMPLE_GEOJSON;

    // Add GeoJSON source if it doesn't already exist
    if (!map.getSource("change-detection-source")) {
      map.addSource("change-detection-source", {
        type: "geojson",
        data: data,
      });

      // Change Polygons Fill Layer (gradient fill by confidence)
      map.addLayer({
        id: "changes-fill",
        type: "fill",
        source: "change-detection-source",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "confidence"],
            0.5,
            "#f59e0b", // amber
            0.8,
            "#ef4444", // red
            0.95,
            "#ec4899", // magenta
          ],
          "fill-opacity": opacity / 100,
        },
      });

      // Change Polygons Outline Layer (border)
      map.addLayer({
        id: "changes-outline",
        type: "line",
        source: "change-detection-source",
        paint: {
          "line-color": "#f43f5e",
          "line-width": 2.5,
          "line-opacity": 0.9,
        },
      });

      // Hover / Click listener
      map.on("click", "changes-fill", (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = (feature.properties || {}) as Record<string, unknown>;
        setSelectedFeature(props);
        if (onSelectFeature) {
          onSelectFeature({
            id: (feature.id || props.id || "") as string | number,
            confidence: typeof props.confidence === "number" ? props.confidence : 0.8,
            areaKm2: typeof props.areaM2 === "number" ? props.areaM2 / 1_000_000 : undefined,
            changeType: typeof props.changeType === "string" ? props.changeType : undefined,
          });
        }
      });

      map.on("mouseenter", "changes-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "changes-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    }
  };

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    // Set worker url
    if (typeof (maplibregl as any).setWorkerUrl === "function") {
      (maplibregl as any).setWorkerUrl("/maplibre-gl-worker.mjs");
    }

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: getStyleConfig(mapStyle),
      center,
      zoom,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.on("load", () => {
      mapInstance.current = map;
      setMapLoaded(true);
      loadLayers(map);
    });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Sync opacity changes
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return;
    const map = mapInstance.current;
    if (map.getLayer("changes-fill")) {
      map.setPaintProperty("changes-fill", "fill-opacity", showChanges ? opacity / 100 : 0);
    }
    if (map.getLayer("changes-outline")) {
      map.setPaintProperty("changes-outline", "line-opacity", showChanges ? 0.9 : 0);
    }
  }, [opacity, showChanges, mapLoaded]);

  // Switch style between dark & satellite
  const handleToggleBasemap = (style: "dark" | "satellite") => {
    if (!mapInstance.current || style === mapStyle) return;
    setMapStyle(style);
    const map = mapInstance.current;
    map.setStyle(getStyleConfig(style));
    map.once("style.load", () => {
      loadLayers(map);
    });
  };

  const handleZoomIn = () => mapInstance.current?.zoomIn();
  const handleZoomOut = () => mapInstance.current?.zoomOut();
  const handleResetView = () => {
    mapInstance.current?.flyTo({ center, zoom, essential: true });
    setSelectedFeature(null);
  };

  return (
    <div className={`relative w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-white/10 ${className}`}>
      {/* Map Canvas */}
      <div ref={mapContainer} className="w-full h-full absolute inset-0" />

      {/* Floating Toolbar Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="glass px-3 py-2 rounded-xl flex items-center gap-2 border border-white/10 shadow-2xl backdrop-blur-md">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" /> Basemap:
          </span>
          <button
            onClick={() => handleToggleBasemap("dark")}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
              mapStyle === "dark"
                ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Dark Vector
          </button>
          <button
            onClick={() => handleToggleBasemap("satellite")}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
              mapStyle === "satellite"
                ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Satellite RGB
          </button>
        </div>

        {/* Change Layer Visibility & Opacity Slider */}
        <div className="glass px-3 py-2.5 rounded-xl border border-white/10 shadow-2xl backdrop-blur-md flex items-center gap-3">
          <button
            onClick={() => setShowChanges(!showChanges)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-200 hover:text-white transition-colors"
          >
            {showChanges ? (
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Change Mask</span>
          </button>

          {showChanges && (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <Sliders className="w-3 h-3 text-slate-400" />
              <input
                type="range"
                min="10"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-20 h-1.5 accent-blue-500 bg-slate-700 rounded-lg cursor-pointer"
                title={`Opacity: ${opacity}%`}
              />
              <span className="text-[11px] font-mono text-slate-400">{opacity}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation & Zoom Tools */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
        <div className="glass rounded-xl p-1 border border-white/10 flex flex-col gap-1 shadow-xl backdrop-blur-md">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
            title="Reset to Extent"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-10 glass px-3.5 py-2.5 rounded-xl border border-white/10 shadow-2xl backdrop-blur-md text-xs">
        <div className="font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Detection Confidence
        </div>
        <div className="flex items-center gap-2">
          <div className="w-28 h-2 rounded-full bg-gradient-to-r from-amber-500 via-red-500 to-pink-500" />
          <div className="flex justify-between w-full text-[10px] text-slate-400 font-mono">
            <span>50%</span>
            <span>80%</span>
            <span>95%+</span>
          </div>
        </div>
      </div>

      {/* Selected Feature Card */}
      {selectedFeature && (
        <div className="absolute bottom-4 right-4 z-10 glass p-4 rounded-xl border border-white/10 shadow-2xl backdrop-blur-md w-72 fade-in">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                {selectedFeature.id || "Region Details"}
              </div>
              <div className="text-sm font-bold text-white">
                {selectedFeature.changeType || "Urban Change Detected"}
              </div>
            </div>
            <button
              onClick={() => setSelectedFeature(null)}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300 pt-1 border-t border-white/10">
            <div className="flex justify-between">
              <span className="text-slate-400">Confidence:</span>
              <span className="font-mono font-semibold text-emerald-400">
                {Math.round((selectedFeature.confidence ?? 0.8) * 100)}%
              </span>
            </div>
            {selectedFeature.areaM2 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Area:</span>
                <span className="font-mono font-semibold">
                  {(selectedFeature.areaM2 / 1000).toFixed(1)}k m²
                </span>
              </div>
            )}
            {selectedFeature.description && (
              <p className="text-[11px] text-slate-400 italic pt-1">
                {selectedFeature.description}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
