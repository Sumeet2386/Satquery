import json

with open("frontend/public/database_samples/catalog.json") as f:
    catalog = json.load(f)

# ISRO Scenarios
isro_scenarios = [
  {
    "id": "scenario-1-grounding",
    "title": "Scenario 1: Optical Infrastructure & Vessel Grounding",
    "description": "High-resolution Sentinel-2/Cartosat scene over Visakhapatnam Port. Identifies maritime assets, berths, and storage facilities.",
    "keywords": ["vessel", "dock", "berth", "ship", "tank", "infrastructure", "port", "crane", "grounding", "object", "detect"],
    "config_type": "Single Optical",
    "files": [
      {
        "id": "upl_visakhapatnam_opt",
        "filename": "S2A_MSIL2A_20241015_VISAKHAPATNAM.tif",
        "sensor_hint": "sentinel2",
        "bands": 12,
        "crs": "EPSG:32644",
        "resolution_m": 10.0,
        "width": 1024,
        "height": 1024,
        "acquisition_date": "2024-10-15T05:42:11Z",
        "bbox": [17.675, 83.275, 17.715, 83.325],
        "center": [17.695, 83.300],
        "thumbnail_url": "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=400&q=80",
        "data_type": "Optical",
        "file_size_mb": 48.6
      }
    ],
    "default_query": "Detect and isolate all maritime vessels, cargo berths, and fuel storage tanks in the port area.",
    "response": {
      "text": "### Mission Analysis Summary: Visakhapatnam Port Grounding\n\n**1. Target Identification & Localization**\nThe agentic vision-language pipeline executed multi-scale spatial grounding across the 10m VNIR bands (B2, B3, B4, B8).\n\n- **Maritime Vessels Detected**: **5 cargo/tanker vessels** actively berthed or anchored in the inner channel (Average Confidence: **94.8%**).\n- **Critical Infrastructure**: **3 oil/chemical storage tanks** and **2 gantry crane terminals** pinpointed with sub-pixel localization accuracy.\n- **Surface Conditions**: Clear atmospheric window (AOT 0.12), zero cloud obstruction over the primary navigation canal.\n\nBounding geometries and radiometric signatures have been projected onto the map canvas.",
      "confidence_tier": "HIGH",
      "confidence_score": 96.4,
      "scenario_id": "scenario-1-grounding",
      "execution_trace": [
        {
          "step": 1,
          "tool": "parse_vqa_intent",
          "tool_display_name": "Vision-Language Intent Parser",
          "params": {"query": "Detect maritime vessels, cargo berths, and storage tanks", "domain": "maritime_infrastructure"},
          "duration_ms": 310,
          "status": "success",
          "output": {"target_classes": ["vessel", "storage_tank", "cargo_berth"], "spatial_context": "port_basin"}
        },
        {
          "step": 2,
          "tool": "extract_multiband_features",
          "tool_display_name": "Sentinel-2 VNIR Feature Extractor",
          "params": {"scene_id": "S2A_MSIL2A_20241015", "bands": ["B02", "B03", "B04", "B08"], "resolution": 10.0},
          "duration_ms": 450,
          "status": "success",
          "output": {"feature_tensor_shape": [1, 256, 1024, 1024], "snr_db": 38.2}
        },
        {
          "step": 3,
          "tool": "zero_shot_grounding",
          "tool_display_name": "Grounding DINO Remote-Sensing Adapter",
          "params": {"box_threshold": 0.35, "text_threshold": 0.25, "nms_iou": 0.45},
          "duration_ms": 620,
          "status": "success",
          "output": {"proposals_generated": 42, "proposals_accepted": 10, "top_class": "vessel"}
        },
        {
          "step": 4,
          "tool": "subpixel_crs_projector",
          "tool_display_name": "WGS84 Georeferencing & Polygon Projection",
          "params": {"src_crs": "EPSG:32644", "dst_crs": "EPSG:4326"},
          "duration_ms": 140,
          "status": "success",
          "output": {"polygons_projected": 10, "mean_reprojection_error_px": 0.04}
        }
      ],
      "grounding_boxes": [
        {
          "id": "box-vessel-1",
          "label": "Cape-size Bulk Carrier (285m)",
          "confidence": 98.2,
          "category": "vessel",
          "bbox": [17.688, 83.292, 17.694, 83.303]
        },
        {
          "id": "box-vessel-2",
          "label": "Chemical Tanker (160m)",
          "confidence": 96.5,
          "category": "vessel",
          "bbox": [17.695, 83.298, 17.699, 83.306]
        },
        {
          "id": "box-vessel-3",
          "label": "Container Feeder (140m)",
          "confidence": 95.1,
          "category": "vessel",
          "bbox": [17.701, 83.305, 17.705, 83.312]
        },
        {
          "id": "box-tank-1",
          "label": "Petrochemical Bulk Tank A-12",
          "confidence": 97.4,
          "category": "infrastructure",
          "bbox": [17.708, 83.284, 17.712, 83.289]
        },
        {
          "id": "box-tank-2",
          "label": "Petrochemical Bulk Tank A-13",
          "confidence": 96.9,
          "category": "infrastructure",
          "bbox": [17.707, 83.290, 17.711, 83.295]
        },
        {
          "id": "box-vessel-4",
          "label": "Harbor Tugboat",
          "confidence": 91.8,
          "category": "vessel",
          "bbox": [17.692, 83.307, 17.695, 83.311]
        }
      ],
      "has_heatmap": False,
      "has_swipe_comparison": False
    }
  },
  {
    "id": "scenario-2-flood-change",
    "title": "Scenario 2: Bi-Temporal Riverine Flood & Crop Damage",
    "description": "Pre-monsoon vs Post-monsoon temporal Sentinel-2 pair over Brahmaputra Basin. Quantifies inundation zones and agricultural loss.",
    "keywords": ["flood", "water", "brahmaputra", "inundation", "damage", "crop", "river", "pre", "post", "change", "loss"],
    "config_type": "Bi-Temporal Pair",
    "files": [
      {
        "id": "upl_brahmaputra_t1",
        "filename": "S2B_MSIL2A_20240502_PRE_FLOOD.tif",
        "sensor_hint": "sentinel2",
        "bands": 12,
        "crs": "EPSG:32646",
        "resolution_m": 10.0,
        "width": 1024,
        "height": 1024,
        "acquisition_date": "2024-05-02T04:30:15Z",
        "bbox": [26.120, 91.680, 26.260, 91.840],
        "center": [26.190, 91.760],
        "thumbnail_url": "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=400&q=80",
        "data_type": "Optical",
        "file_size_mb": 52.1
      },
      {
        "id": "upl_brahmaputra_t2",
        "filename": "S2A_MSIL2A_20240818_POST_FLOOD.tif",
        "sensor_hint": "sentinel2",
        "bands": 12,
        "crs": "EPSG:32646",
        "resolution_m": 10.0,
        "width": 1024,
        "height": 1024,
        "acquisition_date": "2024-08-18T04:28:40Z",
        "bbox": [26.120, 91.680, 26.260, 91.840],
        "center": [26.190, 91.760],
        "thumbnail_url": "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=400&q=80",
        "data_type": "Optical",
        "file_size_mb": 54.3
      }
    ],
    "default_query": "Calculate total flood inundation area, compare pre/post flood boundaries, and quantify agricultural submergence.",
    "response": {
      "text": "### Mission Analysis Summary: Brahmaputra Flood Inundation & Agricultural Impact\n\n**1. Quantitative Inundation Metrics**\n- **Baseline Water Surface Area (T1)**: **312.45 km²**\n- **Post-Event Water Surface Area (T2)**: **455.29 km²**\n- **Net Flood Expansion**: **+142.84 km² (+45.7%)**\n- **Agricultural Submergence**: **88.6 km²** of active paddy acreage inundated.\n\n**2. Critical Breaches & Impact Zones**\n- Primary embankment breach detected at **26.215°N, 91.748°E** (estimated breach width: 140m).\n- Flood surge corridor expanding downstream toward Morigaon district at ~1.8 km/day.\n- NDWI thresholding (index differential > +0.35) confirms saturated alluvium across 32 villages.\n\nUse the **Swipe Comparator** to inspect pre/post inundation boundaries directly on the map canvas.",
      "confidence_tier": "HIGH",
      "confidence_score": 97.2,
      "scenario_id": "scenario-2-flood-change",
      "execution_trace": [
        {
          "step": 1,
          "tool": "temporal_crs_alignment",
          "tool_display_name": "Bi-Temporal Radiometric Co-Registration",
          "params": {"t1": "2024-05-02", "t2": "2024-08-18", "crs": "EPSG:32646"},
          "duration_ms": 380,
          "status": "success",
          "output": {"tie_points_matched": 1240, "rmse_pixels": 0.18}
        },
        {
          "step": 2,
          "tool": "compute_water_indices",
          "tool_display_name": "NDWI & MNDWI Differential Calculator",
          "params": {"green_band": "B03", "nir_band": "B08", "swir_band": "B11"},
          "duration_ms": 520,
          "status": "success",
          "output": {"ndwi_delta_mean": 0.41, "threshold_applied": 0.15}
        },
        {
          "step": 3,
          "tool": "changeformer_segmentation",
          "tool_display_name": "ChangeFormer Transformer Siamese Evaluator",
          "params": {"checkpoint": "changeformer_levir_v2.pth", "patch_size": 256},
          "duration_ms": 890,
          "status": "success",
          "output": {"f1_confidence": 0.942, "change_mask_pixels": 1428400}
        },
        {
          "step": 4,
          "tool": "vectorize_damage_polygons",
          "tool_display_name": "GeoJSON Polygon Extraction & Zonal Stats",
          "params": {"landcover_raster": "ISRO_LULC_2023", "min_area_ha": 5.0},
          "duration_ms": 280,
          "status": "success",
          "output": {"inundation_area_km2": 142.84, "cropland_affected_ha": 8860}
        }
      ],
      "change_stats": {
        "baseline_area_km2": 312.45,
        "changed_area_km2": 142.84,
        "change_ratio": 0.457,
        "change_type": "Flood Inundation",
        "confidence": 97.2,
        "breakdown": [
          {"category": "Submerged Cropland (Paddy)", "area_km2": 88.6, "percentage": 62},
          {"category": "Inundated Riverine Sandbars", "area_km2": 34.2, "percentage": 24},
          {"category": "Displaced Settlement Perimeters", "area_km2": 12.8, "percentage": 9},
          {"category": "Waterlogged Infrastructure", "area_km2": 7.24, "percentage": 5}
        ]
      },
      "grounding_boxes": [
        {
          "id": "box-flood-breach-1",
          "label": "Embankment Breach #1 (140m)",
          "confidence": 98.4,
          "category": "flood",
          "bbox": [26.208, 91.738, 26.222, 91.758]
        },
        {
          "id": "box-flood-inundation-2",
          "label": "Major Agricultural Inundation Zone",
          "confidence": 97.6,
          "category": "flood",
          "bbox": [26.160, 91.710, 26.205, 91.775]
        },
        {
          "id": "box-flood-corridor-3",
          "label": "Active Downstream Surge Corridor",
          "confidence": 94.8,
          "category": "flood",
          "bbox": [26.130, 91.745, 26.170, 91.810]
        }
      ],
      "has_heatmap": True,
      "has_swipe_comparison": True,
      "pre_image_url": "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=80",
      "post_image_url": "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80"
    }
  },
  {
    "id": "scenario-3-sar-cloud-fusion",
    "title": "Scenario 3: SAR Cross-Modal Cloud Penetration",
    "description": "Monsoon overcast scene over Mumbai Offshore Basin. Cross-modal Sentinel-1 C-band SAR + cloudy Sentinel-2 optical imagery.",
    "keywords": ["sar", "radar", "mumbai", "monsoon", "cloud", "penetration", "fusion", "c-band", "backscatter", "all-weather"],
    "config_type": "Cross-Modal Pair",
    "files": [
      {
        "id": "upl_mumbai_cloudy_opt",
        "filename": "S2A_MSIL2A_20240722_MUMBAI_CLOUDY.tif",
        "sensor_hint": "sentinel2",
        "bands": 12,
        "crs": "EPSG:32643",
        "resolution_m": 10.0,
        "width": 1024,
        "height": 1024,
        "acquisition_date": "2024-07-22T05:55:00Z",
        "bbox": [18.850, 72.700, 19.050, 72.950],
        "center": [18.950, 72.825],
        "thumbnail_url": "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=400&q=80",
        "data_type": "Optical",
        "file_size_mb": 49.8
      },
      {
        "id": "upl_mumbai_sar_cband",
        "filename": "S1A_IW_GRDH_1SDV_20240722_MUMBAI_SAR.tif",
        "sensor_hint": "sentinel1_sar",
        "bands": 2,
        "crs": "EPSG:32643",
        "resolution_m": 10.0,
        "width": 1024,
        "height": 1024,
        "acquisition_date": "2024-07-22T00:52:15Z",
        "bbox": [18.850, 72.700, 19.050, 72.950],
        "center": [18.950, 72.825],
        "thumbnail_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80",
        "data_type": "SAR",
        "file_size_mb": 38.4
      }
    ],
    "default_query": "Penetrate monsoon cloud cover using SAR cross-modal fusion to detect hidden maritime vessels and slick anomalies.",
    "response": {
      "text": "### Mission Analysis Summary: Mumbai Offshore SAR Cross-Modal Cloud Penetration\n\n**1. Atmospheric & Optical Obstruction**\n- **Optical Cloud Coverage**: **84.2%** opaque cumulus cloud cover in Sentinel-2 scene. Direct optical target detection degraded.\n- **SAR Modality Activation**: Sentinel-1 C-band synthetic aperture radar (VV + VH polarization) ingested for all-weather penetration.\n\n**2. Cross-Modal Fusion Detections**\n- **Hidden Maritime Vessels**: **3 metallic vessel signatures** detected through 100% optical cloud cover via high backscatter reflection (VH signature > -12 dB).\n- **High-Velocity Vessel**: Naval patrol craft pinpointed at **18.968°N, 72.752°E** exhibiting distinct radar Kelvin wake structure.\n- **Slick Anomaly**: Surface tension anomaly (**3.2 km²**) detected 14 km offshore with characteristic radar suppression (-22 dB).\n\nCross-modal fusion pipeline executed via calibrated CFAR (Constant False Alarm Rate) algorithm with spatial backscatter normalization.",
      "confidence_tier": "HIGH",
      "confidence_score": 93.8,
      "scenario_id": "scenario-3-sar-cloud-fusion",
      "fusion_note": "Cross-modal Sentinel-1 (C-band SAR) + Sentinel-2 (Optical) ingested simultaneously. SAR penetration bypassed 84.2% cloud cover to illuminate high-dielectric metallic hulls.",
      "execution_trace": [
        {
          "step": 1,
          "tool": "cloud_mask_fmask",
          "tool_display_name": "Optical Cloud & Shadow Masking (Fmask 4.0)",
          "params": {"scene": "S2A_MSIL2A_20240722", "cirrus_band": "B10"},
          "duration_ms": 290,
          "status": "success",
          "output": {"cloud_fraction": 0.842, "shadow_fraction": 0.081, "optical_usable": False}
        },
        {
          "step": 2,
          "tool": "sar_radiometric_calibration",
          "tool_display_name": "Sentinel-1 Gamma0 / Sigma0 Radiometric Calibration",
          "params": {"orbit_state": "precise", "speckle_filter": "Lee Sigma 7x7", "polarizations": ["VV", "VH"]},
          "duration_ms": 610,
          "status": "success",
          "output": {"sigma0_mean_vv_db": -16.4, "sigma0_mean_vh_db": -24.8, "speckle_envi_enl": 4.8}
        },
        {
          "step": 3,
          "tool": "cfar_ship_detection",
          "tool_display_name": "Adaptive 2-Parameter CFAR Vessel Detector",
          "params": {"pfa": 1e-6, "guard_window": 15, "background_window": 35},
          "duration_ms": 740,
          "status": "success",
          "output": {"targets_detected": 3, "wake_candidates": 1, "slick_anomalies": 1}
        },
        {
          "step": 4,
          "tool": "cross_modal_verifier",
          "tool_display_name": "Optical/SAR Spatial Co-Registration & Feature Fusion",
          "params": {"optical_crs": "EPSG:32643", "sar_crs": "EPSG:32643"},
          "duration_ms": 220,
          "status": "success",
          "output": {"matched_sar_optical_targets": 3, "occluded_targets_illuminated": 3}
        }
      ],
      "grounding_boxes": [
        {
          "id": "box-sar-vessel-1",
          "label": "Crude Oil Tanker (VLCC ~310m)",
          "confidence": 96.8,
          "category": "vessel",
          "bbox": [18.915, 72.765, 18.932, 72.795],
          "attributes": {"radar_length_m": 312, "polarization_ratio_db": 11.4}
        },
        {
          "id": "box-sar-vessel-2",
          "label": "Naval Patrol Craft (Speed ~18 kts)",
          "confidence": 94.5,
          "category": "vessel",
          "bbox": [18.960, 72.740, 18.975, 72.765],
          "attributes": {"wake_detected": "Yes", "doppler_shift_hz": 48.2}
        },
        {
          "id": "box-sar-vessel-3",
          "label": "Offshore Supply Vessel (OSV)",
          "confidence": 93.1,
          "category": "vessel",
          "bbox": [18.880, 72.820, 18.900, 72.845],
          "attributes": {"target_type": "Platform Service"}
        },
        {
          "id": "box-sar-anomaly-4",
          "label": "Surface Slick Film (Low Backscatter -22 dB)",
          "confidence": 89.4,
          "category": "anomaly",
          "bbox": [18.935, 72.720, 18.955, 72.755],
          "attributes": {"area_est_km2": "3.2 km²", "suppression_factor": "8.4 dB"}
        }
      ],
      "has_heatmap": True,
      "has_swipe_comparison": False
    }
  }
]

# Database Scenarios
db_scenarios = []
for s in catalog:
    clusters_meta = []
    for c in s["clusters"]:
        clusters_meta.append({
            "id": c["id"],
            "label": c["label"],
            "category": "building" if c["category"] == "building" else "infrastructure",
            "confidence": c["confidence"],
            "bbox": c["bbox"],
            "span_km": c["span_km"],
            "area_m2": c["area_m2"]
        })
    
    db_scenarios.append({
        "id": f"database-{s['id']}",
        "title": f"Database Test: {s['title']}",
        "description": f"Benchmarking pair from Database/test (1). High-resolution 0.5m bi-temporal optical rasters covering {s['tile_width_km']} km × {s['tile_height_km']} km. Detects structural changes spanning {s['max_dist_km']} km.",
        "keywords": [s["id"], "database", s["id"].replace("_", " "), s["category"].lower(), s["location"].lower(), "levir-cd", "change detection"],
        "config_type": "Bi-Temporal Pair",
        "files": [
            {
                "id": f"{s['id']}_pre",
                "filename": f"{s['id']}_A_PreEvent.png",
                "sensor_hint": "cartosat3",
                "bands": 3,
                "crs": "EPSG:32650",
                "resolution_m": 0.5,
                "width": 1024,
                "height": 1024,
                "acquisition_date": "2022-03-12T04:15:00Z",
                "bbox": [round(s["base_lat"] - 0.002, 5), round(s["base_lng"] - 0.002, 5), round(s["base_lat"] + 0.002, 5), round(s["base_lng"] + 0.002, 5)],
                "center": [s["base_lat"], s["base_lng"]],
                "thumbnail_url": s["pre_image_url"],
                "data_type": "Optical",
                "file_size_mb": 2.1
            },
            {
                "id": f"{s['id']}_post",
                "filename": f"{s['id']}_B_PostEvent.png",
                "sensor_hint": "cartosat3",
                "bands": 3,
                "crs": "EPSG:32650",
                "resolution_m": 0.5,
                "width": 1024,
                "height": 1024,
                "acquisition_date": "2024-06-20T04:18:22Z",
                "bbox": [round(s["base_lat"] - 0.002, 5), round(s["base_lng"] - 0.002, 5), round(s["base_lat"] + 0.002, 5), round(s["base_lng"] + 0.002, 5)],
                "center": [s["base_lat"], s["base_lng"]],
                "thumbnail_url": s["post_image_url"],
                "data_type": "Optical",
                "file_size_mb": 1.9
            }
        ],
        "default_query": s["query"],
        "response": {
            "text": s["explanation"],
            "confidence_tier": "HIGH",
            "confidence_score": 95.8,
            "scenario_id": f"database-{s['id']}",
            "execution_trace": [
                {
                    "step": 1,
                    "tool": "load_database_rasters",
                    "tool_display_name": "Database Raster Pair Ingestion",
                    "params": {"source": "Database/test (1)", "pair_id": s["id"], "gsd": 0.5},
                    "duration_ms": 220,
                    "status": "success",
                    "output": {"resolution": "0.5m/px", "dimensions": [1024, 1024], "tile_footprint_km2": s["tile_area_km2"]}
                },
                {
                    "step": 2,
                    "tool": "siamese_feature_fusion",
                    "tool_display_name": "Siamese-CD Differential Neural Backbone",
                    "params": {"model": "Siamese-CD (S2Looking/LEVIR)", "channels": 3, "layers": 4},
                    "duration_ms": 580,
                    "status": "success",
                    "output": {"feature_diff_norm": 0.428, "activated_clusters": s["cluster_count"]}
                },
                {
                    "step": 3,
                    "tool": "metric_spatial_distance_quantifier",
                    "tool_display_name": "Metric Distance & Cluster Quantifier",
                    "params": {"gsd_m": 0.5, "metric_units": "km"},
                    "duration_ms": 310,
                    "status": "success",
                    "output": {"max_span_km": s["max_dist_km"], "max_span_m": s["max_dist_m"], "total_changed_m2": s["total_area_m2"]}
                },
                {
                    "step": 4,
                    "tool": "render_highlighted_overlay",
                    "tool_display_name": "Highlight Overlay & Boundary Renderer",
                    "params": {"overlay_color": "#e07856", "outline_width": 3},
                    "duration_ms": 190,
                    "status": "success",
                    "output": {"status": "rendered", "clusters_annotated": s["cluster_count"]}
                }
            ],
            "change_stats": {
                "baseline_area_km2": s["tile_area_km2"],
                "changed_area_km2": s["total_area_km2"],
                "change_ratio": round(s["change_pct"] / 100.0, 4),
                "change_type": s["category"],
                "confidence": 95.8,
                "breakdown": [
                    {"category": "Structural Additions", "area_km2": round(s["total_area_km2"] * 0.65, 4), "percentage": 65},
                    {"category": "Ground Grading & Access", "area_km2": round(s["total_area_km2"] * 0.25, 4), "percentage": 25},
                    {"category": "Boundary Alteration", "area_km2": round(s["total_area_km2"] * 0.10, 4), "percentage": 10}
                ]
            },
            "grounding_boxes": clusters_meta,
            "has_heatmap": True,
            "has_swipe_comparison": True,
            "pre_image_url": s["pre_image_url"],
            "post_image_url": s["post_image_url"],
            "highlighted_image_url": s["highlighted_image_url"],
            "annotated_image_url": s["annotated_image_url"],
            "mask_image_url": s["mask_image_url"],
            "max_dist_km": s["max_dist_km"],
            "total_area_m2": s["total_area_m2"]
        }
    })

all_scenarios = isro_scenarios + db_scenarios

ts_code = f"""import {{ MissionScenario }} from "../types/satquery";

export const MOCK_SCENARIOS: MissionScenario[] = {json.dumps(all_scenarios, indent=2)};

export function findMatchingScenario(query: string, uploadedFilesCount: number, hasSar: boolean): MissionScenario {{
  const q = query.toLowerCase();

  for (let i = 3; i < MOCK_SCENARIOS.length; i++) {{
    const sc = MOCK_SCENARIOS[i];
    if (sc.keywords.some((k) => q.includes(k.toLowerCase()))) {{
      return sc;
    }}
  }}

  if (q.includes("sar") || q.includes("radar") || q.includes("cloud") || q.includes("fusion") || q.includes("all-weather") || hasSar) {{
    return MOCK_SCENARIOS[2];
  }}
  
  if (q.includes("flood") || q.includes("damage") || q.includes("water") || q.includes("inundation")) {{
    return MOCK_SCENARIOS[1];
  }}

  if (q.includes("database") || q.includes("test_") || q.includes("test 1") || q.includes("building") || q.includes("change")) {{
    return MOCK_SCENARIOS[3]; // Default to database test_1
  }}
  
  return MOCK_SCENARIOS[0];
}}
"""

with open("frontend/src/constants/mockScenarios.ts", "w") as f:
    f.write(ts_code)

print("Generated clean mockScenarios.ts with all ISRO + Database scenarios!")
