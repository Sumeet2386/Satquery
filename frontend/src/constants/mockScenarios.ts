import { MissionScenario } from "../types/satquery";

export const MOCK_SCENARIOS: MissionScenario[] = [
  {
      "id": "database-test_100",
      "title": "Database Test: Sprawling Multi-Quadrant Urban Transformation",
      "description": "Benchmarking pair from Database/test (1). High-resolution 0.5m bi-temporal optical rasters covering 0.512 km \u00d7 0.512 km. Detects structural changes spanning 0.546 km.",
      "keywords": [
        "test_100",
        "database",
        "test 100",
        "mixed-use urbanization",
        "northern riverfront re-development",
        "levir-cd",
        "change detection"
      ],
      "config_type": "Bi-Temporal Pair",
      "files": [
        {
          "id": "test_100_pre",
          "filename": "test_100_A_PreEvent.png",
          "sensor_hint": "cartosat3",
          "bands": 3,
          "crs": "EPSG:32650",
          "resolution_m": 0.5,
          "width": 1024,
          "height": 1024,
          "acquisition_date": "2022-03-12T04:15:00Z",
          "bbox": [
            22.563,
            114.07,
            22.567,
            114.074
          ],
          "center": [
            22.565,
            114.072
          ],
          "thumbnail_url": "/database_samples/test_100/pre.png",
          "data_type": "Optical",
          "file_size_mb": 2.1
        },
        {
          "id": "test_100_post",
          "filename": "test_100_B_PostEvent.png",
          "sensor_hint": "cartosat3",
          "bands": 3,
          "crs": "EPSG:32650",
          "resolution_m": 0.5,
          "width": 1024,
          "height": 1024,
          "acquisition_date": "2024-06-20T04:18:22Z",
          "bbox": [
            22.563,
            114.07,
            22.567,
            114.074
          ],
          "center": [
            22.565,
            114.072
          ],
          "thumbnail_url": "/database_samples/test_100/post.png",
          "data_type": "Optical",
          "file_size_mb": 1.9
        }
      ],
      "default_query": "Comprehensive change audit: isolate all new buildings, road corridors, and cleared land parcels.",
      "response": {
        "text": "Automated Siamese-CD neural inference detected 19 distinct change clusters across the 0.512 km \u00d7 0.512 km observation tile (0.2621 km\u00b2 total footprint).\n\n\u2022 Total Changed Footprint: 29,711 m\u00b2 (0.0297 km\u00b2), representing 11.33% of the surveyed surface.\n\u2022 Spatial Distance Span: Visible changes span a direct linear distance of 0.546 km (546 meters) across the sector.\n\u2022 Identified Features: Structural building foundation footprints, new roofing envelopes, and connected impervious transport surfaces.\n\u2022 Sensor Metric: Ground Sampling Distance (GSD) calibrated at 0.50m/pixel with sub-pixel boundary refinement.",
        "confidence_tier": "HIGH",
        "confidence_score": 95.8,
        "scenario_id": "database-test_100",
        "execution_trace": [
          {
            "step": 1,
            "tool": "load_database_rasters",
            "tool_display_name": "Database Raster Pair Ingestion",
            "params": {
              "source": "Database/test (1)",
              "pair_id": "test_100",
              "gsd": 0.5
            },
            "duration_ms": 220,
            "status": "success",
            "output": {
              "resolution": "0.5m/px",
              "dimensions": [
                1024,
                1024
              ],
              "tile_footprint_km2": 0.2621
            }
          },
          {
            "step": 2,
            "tool": "siamese_feature_fusion",
            "tool_display_name": "Siamese-CD Differential Neural Backbone",
            "params": {
              "model": "Siamese-CD (S2Looking/LEVIR)",
              "channels": 3,
              "layers": 4
            },
            "duration_ms": 580,
            "status": "success",
            "output": {
              "feature_diff_norm": 0.428,
              "activated_clusters": 19
            }
          },
          {
            "step": 3,
            "tool": "metric_spatial_distance_quantifier",
            "tool_display_name": "Metric Distance & Cluster Quantifier",
            "params": {
              "gsd_m": 0.5,
              "metric_units": "km"
            },
            "duration_ms": 310,
            "status": "success",
            "output": {
              "max_span_km": 0.546,
              "max_span_m": 545.7,
              "total_changed_m2": 29710.8
            }
          },
          {
            "step": 4,
            "tool": "render_highlighted_overlay",
            "tool_display_name": "Highlight Overlay & Boundary Renderer",
            "params": {
              "overlay_color": "#e07856",
              "outline_width": 3
            },
            "duration_ms": 190,
            "status": "success",
            "output": {
              "status": "rendered",
              "clusters_annotated": 19
            }
          }
        ],
        "change_stats": {
          "baseline_area_km2": 0.2621,
          "changed_area_km2": 0.02971,
          "change_ratio": 0.1133,
          "change_type": "Mixed-Use Urbanization",
          "confidence": 95.8,
          "breakdown": [
            {
              "category": "Structural Additions",
              "area_km2": 0.0193,
              "percentage": 65
            },
            {
              "category": "Ground Grading & Access",
              "area_km2": 0.0074,
              "percentage": 25
            },
            {
              "category": "Boundary Alteration",
              "area_km2": 0.003,
              "percentage": 10
            }
          ]
        },
        "grounding_boxes": [
          {
            "id": "clus_1",
            "label": "Cluster #1 (344.0m \u00d7 224.0m)",
            "category": "building",
            "confidence": 91.0,
            "bbox": [
              22.56269,
              114.07083,
              22.56471,
              114.07419
            ],
            "span_km": 0.344,
            "area_m2": 17902.5
          },
          {
            "id": "clus_2",
            "label": "Cluster #2 (184.0m \u00d7 120.0m)",
            "category": "infrastructure",
            "confidence": 92.2,
            "bbox": [
              22.56269,
              114.07177,
              22.56377,
              114.07356
            ],
            "span_km": 0.184,
            "area_m2": 6333.5
          },
          {
            "id": "clus_3",
            "label": "Cluster #3 (168.0m \u00d7 232.0m)",
            "category": "building",
            "confidence": 93.4,
            "bbox": [
              22.56507,
              114.07255,
              22.56716,
              114.07419
            ],
            "span_km": 0.232,
            "area_m2": 6103.2
          },
          {
            "id": "clus_4",
            "label": "Cluster #4 (200.0m \u00d7 104.0m)",
            "category": "infrastructure",
            "confidence": 94.6,
            "bbox": [
              22.56406,
              114.07239,
              22.565,
              114.07434
            ],
            "span_km": 0.2,
            "area_m2": 5953.8
          },
          {
            "id": "clus_5",
            "label": "Cluster #5 (160.0m \u00d7 88.0m)",
            "category": "building",
            "confidence": 95.8,
            "bbox": [
              22.56349,
              114.07239,
              22.56428,
              114.07395
            ],
            "span_km": 0.16,
            "area_m2": 4688.8
          },
          {
            "id": "clus_6",
            "label": "Cluster #6 (168.0m \u00d7 88.0m)",
            "category": "infrastructure",
            "confidence": 97.0,
            "bbox": [
              22.5632,
              114.07216,
              22.56399,
              114.0738
            ],
            "span_km": 0.168,
            "area_m2": 4571.8
          },
          {
            "id": "clus_7",
            "label": "Cluster #7 (160.0m \u00d7 96.0m)",
            "category": "building",
            "confidence": 98.2,
            "bbox": [
              22.56435,
              114.07294,
              22.56522,
              114.0745
            ],
            "span_km": 0.16,
            "area_m2": 4343.0
          },
          {
            "id": "clus_8",
            "label": "Cluster #8 (136.0m \u00d7 80.0m)",
            "category": "infrastructure",
            "confidence": 91.0,
            "bbox": [
              22.56471,
              114.07317,
              22.56543,
              114.0745
            ],
            "span_km": 0.136,
            "area_m2": 3304.2
          },
          {
            "id": "clus_9",
            "label": "Cluster #9 (120.0m \u00d7 72.0m)",
            "category": "building",
            "confidence": 92.2,
            "bbox": [
              22.56507,
              114.07333,
              22.56572,
              114.0745
            ],
            "span_km": 0.12,
            "area_m2": 2640.5
          },
          {
            "id": "clus_10",
            "label": "Cluster #10 (96.0m \u00d7 56.0m)",
            "category": "infrastructure",
            "confidence": 93.4,
            "bbox": [
              22.5655,
              114.07356,
              22.56601,
              114.0745
            ],
            "span_km": 0.096,
            "area_m2": 1647.8
          },
          {
            "id": "clus_11",
            "label": "Cluster #11 (72.0m \u00d7 48.0m)",
            "category": "building",
            "confidence": 94.6,
            "bbox": [
              22.56586,
              114.0738,
              22.5663,
              114.0745
            ],
            "span_km": 0.072,
            "area_m2": 982.8
          },
          {
            "id": "clus_12",
            "label": "Cluster #12 (64.0m \u00d7 40.0m)",
            "category": "infrastructure",
            "confidence": 95.8,
            "bbox": [
              22.56291,
              114.07387,
              22.56327,
              114.0745
            ],
            "span_km": 0.064,
            "area_m2": 701.8
          }
        ],
        "has_heatmap": true,
        "has_swipe_comparison": true,
        "pre_image_url": "/database_samples/test_100/pre.png",
        "post_image_url": "/database_samples/test_100/post.png",
        "highlighted_image_url": "/database_samples/test_100/highlighted.png",
        "annotated_image_url": "/database_samples/test_100/annotated.png",
        "mask_image_url": "/database_samples/test_100/mask.png",
        "max_dist_km": 0.546,
        "total_area_m2": 29710.8
      }
    },
    {
      "id": "database-test_1",
      "title": "Database Test: Urban Expansion \u2014 Residential Footprints",
      "description": "Benchmarking pair from Database/test (1). High-resolution 0.5m bi-temporal optical rasters covering 0.512 km \u00d7 0.512 km. Detects structural changes spanning 0.114 km.",
      "keywords": [
        "test_1",
        "database",
        "test 1",
        "building construction",
        "north sector sector-4a",
        "levir-cd",
        "change detection"
      ],
      "config_type": "Bi-Temporal Pair",
      "files": [
        {
          "id": "test_1_pre",
          "filename": "test_1_A_PreEvent.png",
          "sensor_hint": "cartosat3",
          "bands": 3,
          "crs": "EPSG:32650",
          "resolution_m": 0.5,
          "width": 1024,
          "height": 1024,
          "acquisition_date": "2022-03-12T04:15:00Z",
          "bbox": [
            22.54,
            114.053,
            22.544,
            114.057
          ],
          "center": [
            22.542,
            114.055
          ],
          "thumbnail_url": "/database_samples/test_1/pre.png",
          "data_type": "Optical",
          "file_size_mb": 2.1
        },
        {
          "id": "test_1_post",
          "filename": "test_1_B_PostEvent.png",
          "sensor_hint": "cartosat3",
          "bands": 3,
          "crs": "EPSG:32650",
          "resolution_m": 0.5,
          "width": 1024,
          "height": 1024,
          "acquisition_date": "2024-06-20T04:18:22Z",
          "bbox": [
            22.54,
            114.053,
            22.544,
            114.057
          ],
          "center": [
            22.542,
            114.055
          ],
          "thumbnail_url": "/database_samples/test_1/post.png",
          "data_type": "Optical",
          "file_size_mb": 1.9
        }
      ],
      "default_query": "Identify new residential building construction and impervious structural footprints.",
      "response": {
        "text": "Automated Siamese-CD neural inference detected 5 distinct change clusters across the 0.512 km \u00d7 0.512 km observation tile (0.2621 km\u00b2 total footprint).\n\n\u2022 Total Changed Footprint: 3,297 m\u00b2 (0.0033 km\u00b2), representing 1.26% of the surveyed surface.\n\u2022 Spatial Distance Span: Visible changes span a direct linear distance of 0.114 km (114 meters) across the sector.\n\u2022 Identified Features: Structural building foundation footprints, new roofing envelopes, and connected impervious transport surfaces.\n\u2022 Sensor Metric: Ground Sampling Distance (GSD) calibrated at 0.50m/pixel with sub-pixel boundary refinement.",
        "confidence_tier": "HIGH",
        "confidence_score": 95.8,
        "scenario_id": "database-test_1",
        "execution_trace": [
          {
            "step": 1,
            "tool": "load_database_rasters",
            "tool_display_name": "Database Raster Pair Ingestion",
            "params": {
              "source": "Database/test (1)",
              "pair_id": "test_1",
              "gsd": 0.5
            },
            "duration_ms": 220,
            "status": "success",
            "output": {
              "resolution": "0.5m/px",
              "dimensions": [
                1024,
                1024
              ],
              "tile_footprint_km2": 0.2621
            }
          },
          {
            "step": 2,
            "tool": "siamese_feature_fusion",
            "tool_display_name": "Siamese-CD Differential Neural Backbone",
            "params": {
              "model": "Siamese-CD (S2Looking/LEVIR)",
              "channels": 3,
              "layers": 4
            },
            "duration_ms": 580,
            "status": "success",
            "output": {
              "feature_diff_norm": 0.428,
              "activated_clusters": 5
            }
          },
          {
            "step": 3,
            "tool": "metric_spatial_distance_quantifier",
            "tool_display_name": "Metric Distance & Cluster Quantifier",
            "params": {
              "gsd_m": 0.5,
              "metric_units": "km"
            },
            "duration_ms": 310,
            "status": "success",
            "output": {
              "max_span_km": 0.114,
              "max_span_m": 113.7,
              "total_changed_m2": 3297.2
            }
          },
          {
            "step": 4,
            "tool": "render_highlighted_overlay",
            "tool_display_name": "Highlight Overlay & Boundary Renderer",
            "params": {
              "overlay_color": "#e07856",
              "outline_width": 3
            },
            "duration_ms": 190,
            "status": "success",
            "output": {
              "status": "rendered",
              "clusters_annotated": 5
            }
          }
        ],
        "change_stats": {
          "baseline_area_km2": 0.2621,
          "changed_area_km2": 0.0033,
          "change_ratio": 0.0126,
          "change_type": "Building Construction",
          "confidence": 95.8,
          "breakdown": [
            {
              "category": "Structural Additions",
              "area_km2": 0.0021,
              "percentage": 65
            },
            {
              "category": "Ground Grading & Access",
              "area_km2": 0.0008,
              "percentage": 25
            },
            {
              "category": "Boundary Alteration",
              "area_km2": 0.0003,
              "percentage": 10
            }
          ]
        },
        "grounding_boxes": [
          {
            "id": "clus_1",
            "label": "Cluster #1 (72.0m \u00d7 48.0m)",
            "category": "building",
            "confidence": 91.0,
            "bbox": [
              22.54315,
              114.05633,
              22.54359,
              114.05703
            ],
            "span_km": 0.072,
            "area_m2": 1005.0
          },
          {
            "id": "clus_2",
            "label": "Cluster #2 (32.0m \u00d7 64.0m)",
            "category": "infrastructure",
            "confidence": 92.2,
            "bbox": [
              22.54373,
              114.0564,
              22.54431,
              114.05672
            ],
            "span_km": 0.064,
            "area_m2": 890.8
          },
          {
            "id": "clus_3",
            "label": "Cluster #3 (40.0m \u00d7 32.0m)",
            "category": "building",
            "confidence": 93.4,
            "bbox": [
              22.54315,
              114.05711,
              22.54344,
              114.0575
            ],
            "span_km": 0.04,
            "area_m2": 585.0
          },
          {
            "id": "clus_4",
            "label": "Cluster #4 (32.0m \u00d7 32.0m)",
            "category": "infrastructure",
            "confidence": 94.6,
            "bbox": [
              22.54402,
              114.05687,
              22.54431,
              114.05718
            ],
            "span_km": 0.032,
            "area_m2": 516.2
          },
          {
            "id": "clus_5",
            "label": "Cluster #5 (24.0m \u00d7 32.0m)",
            "category": "building",
            "confidence": 95.8,
            "bbox": [
              22.54402,
              114.05726,
              22.54431,
              114.0575
            ],
            "span_km": 0.032,
            "area_m2": 298.5
          }
        ],
        "has_heatmap": true,
        "has_swipe_comparison": true,
        "pre_image_url": "/database_samples/test_1/pre.png",
        "post_image_url": "/database_samples/test_1/post.png",
        "highlighted_image_url": "/database_samples/test_1/highlighted.png",
        "annotated_image_url": "/database_samples/test_1/annotated.png",
        "mask_image_url": "/database_samples/test_1/mask.png",
        "max_dist_km": 0.114,
        "total_area_m2": 3297.2
      }
    },
    {
      "id": "database-test_2",
      "title": "Database Test: Suburban Housing Cluster Development",
      "description": "Benchmarking pair from Database/test (1). High-resolution 0.5m bi-temporal optical rasters covering 0.512 km \u00d7 0.512 km. Detects structural changes spanning 0.552 km.",
      "keywords": [
        "test_2",
        "database",
        "test 2",
        "residential development",
        "east valley residential zone",
        "levir-cd",
        "change detection"
      ],
      "config_type": "Bi-Temporal Pair",
      "files": [
        {
          "id": "test_2_pre",
          "filename": "test_2_A_PreEvent.png",
          "sensor_hint": "cartosat3",
          "bands": 3,
          "crs": "EPSG:32650",
          "resolution_m": 0.5,
          "width": 1024,
          "height": 1024,
          "acquisition_date": "2022-03-12T04:15:00Z",
          "bbox": [
            22.546,
            114.06,
            22.55,
            114.064
          ],
          "center": [
            22.548,
            114.062
          ],
          "thumbnail_url": "/database_samples/test_2/pre.png",
          "data_type": "Optical",
          "file_size_mb": 2.1
        },
        {
          "id": "test_2_post",
          "filename": "test_2_B_PostEvent.png",
          "sensor_hint": "cartosat3",
          "bands": 3,
          "crs": "EPSG:32650",
          "resolution_m": 0.5,
          "width": 1024,
          "height": 1024,
          "acquisition_date": "2024-06-20T04:18:22Z",
          "bbox": [
            22.546,
            114.06,
            22.55,
            114.064
          ],
          "center": [
            22.548,
            114.062
          ],
          "thumbnail_url": "/database_samples/test_2/post.png",
          "data_type": "Optical",
          "file_size_mb": 1.9
        }
      ],
      "default_query": "Detect housing cluster expansion and new foundation groundwork.",
      "response": {
        "text": "Automated Siamese-CD neural inference detected 11 distinct change clusters across the 0.512 km \u00d7 0.512 km observation tile (0.2621 km\u00b2 total footprint).\n\n\u2022 Total Changed Footprint: 12,580 m\u00b2 (0.0126 km\u00b2), representing 4.8% of the surveyed surface.\n\u2022 Spatial Distance Span: Visible changes span a direct linear distance of 0.552 km (552 meters) across the sector.\n\u2022 Identified Features: Structural building foundation footprints, new roofing envelopes, and connected impervious transport surfaces.\n\u2022 Sensor Metric: Ground Sampling Distance (GSD) calibrated at 0.50m/pixel with sub-pixel boundary refinement.",
        "confidence_tier": "HIGH",
        "confidence_score": 95.8,
        "scenario_id": "database-test_2",
        "execution_trace": [
          {
            "step": 1,
            "tool": "load_database_rasters",
            "tool_display_name": "Database Raster Pair Ingestion",
            "params": {
              "source": "Database/test (1)",
              "pair_id": "test_2",
              "gsd": 0.5
            },
            "duration_ms": 220,
            "status": "success",
            "output": {
              "resolution": "0.5m/px",
              "dimensions": [
                1024,
                1024
              ],
              "tile_footprint_km2": 0.2621
            }
          },
          {
            "step": 2,
            "tool": "siamese_feature_fusion",
            "tool_display_name": "Siamese-CD Differential Neural Backbone",
            "params": {
              "model": "Siamese-CD (S2Looking/LEVIR)",
              "channels": 3,
              "layers": 4
            },
            "duration_ms": 580,
            "status": "success",
            "output": {
              "feature_diff_norm": 0.428,
              "activated_clusters": 11
            }
          },
          {
            "step": 3,
            "tool": "metric_spatial_distance_quantifier",
            "tool_display_name": "Metric Distance & Cluster Quantifier",
            "params": {
              "gsd_m": 0.5,
              "metric_units": "km"
            },
            "duration_ms": 310,
            "status": "success",
            "output": {
              "max_span_km": 0.552,
              "max_span_m": 551.6,
              "total_changed_m2": 12580.2
            }
          },
          {
            "step": 4,
            "tool": "render_highlighted_overlay",
            "tool_display_name": "Highlight Overlay & Boundary Renderer",
            "params": {
              "overlay_color": "#e07856",
              "outline_width": 3
            },
            "duration_ms": 190,
            "status": "success",
            "output": {
              "status": "rendered",
              "clusters_annotated": 11
            }
          }
        ],
        "change_stats": {
          "baseline_area_km2": 0.2621,
          "changed_area_km2": 0.01258,
          "change_ratio": 0.048,
          "change_type": "Residential Development",
          "confidence": 95.8,
          "breakdown": [
            {
              "category": "Structural Additions",
              "area_km2": 0.0082,
              "percentage": 65
            },
            {
              "category": "Ground Grading & Access",
              "area_km2": 0.0031,
              "percentage": 25
            },
            {
              "category": "Boundary Alteration",
              "area_km2": 0.0013,
              "percentage": 10
            }
          ]
        },
        "grounding_boxes": [
          {
            "id": "clus_1",
            "label": "Cluster #1 (312.0m \u00d7 40.0m)",
            "category": "building",
            "confidence": 91.0,
            "bbox": [
              22.54915,
              114.0595,
              22.54951,
              114.06255
            ],
            "span_km": 0.312,
            "area_m2": 3608.2
          },
          {
            "id": "clus_2",
            "label": "Cluster #2 (104.0m \u00d7 88.0m)",
            "category": "infrastructure",
            "confidence": 92.2,
            "bbox": [
              22.54951,
              114.05966,
              22.55031,
              114.06067
            ],
            "span_km": 0.104,
            "area_m2": 2563.5
          },
          {
            "id": "clus_3",
            "label": "Cluster #3 (144.0m \u00d7 48.0m)",
            "category": "building",
            "confidence": 93.4,
            "bbox": [
              22.54951,
              114.06122,
              22.54995,
              114.06262
            ],
            "span_km": 0.144,
            "area_m2": 1625.2
          },
          {
            "id": "clus_4",
            "label": "Cluster #4 (96.0m \u00d7 48.0m)",
            "category": "infrastructure",
            "confidence": 94.6,
            "bbox": [
              22.54987,
              114.0613,
              22.55031,
              114.06223
            ],
            "span_km": 0.096,
            "area_m2": 1095.0
          },
          {
            "id": "clus_5",
            "label": "Cluster #5 (32.0m \u00d7 88.0m)",
            "category": "building",
            "confidence": 95.8,
            "bbox": [
              22.54951,
              114.06083,
              22.55031,
              114.06114
            ],
            "span_km": 0.088,
            "area_m2": 1080.2
          },
          {
            "id": "clus_6",
            "label": "Cluster #6 (80.0m \u00d7 40.0m)",
            "category": "infrastructure",
            "confidence": 97.0,
            "bbox": [
              22.5493,
              114.06262,
              22.54966,
              114.0634
            ],
            "span_km": 0.08,
            "area_m2": 818.0
          },
          {
            "id": "clus_7",
            "label": "Cluster #7 (72.0m \u00d7 48.0m)",
            "category": "building",
            "confidence": 98.2,
            "bbox": [
              22.54966,
              114.06294,
              22.55009,
              114.06364
            ],
            "span_km": 0.072,
            "area_m2": 805.5
          },
          {
            "id": "clus_8",
            "label": "Cluster #8 (40.0m \u00d7 48.0m)",
            "category": "infrastructure",
            "confidence": 91.0,
            "bbox": [
              22.54987,
              114.0595,
              22.55031,
              114.05989
            ],
            "span_km": 0.048,
            "area_m2": 566.2
          },
          {
            "id": "clus_9",
            "label": "Cluster #9 (40.0m \u00d7 40.0m)",
            "category": "building",
            "confidence": 92.2,
            "bbox": [
              22.54641,
              114.06333,
              22.54677,
              114.06372
            ],
            "span_km": 0.04,
            "area_m2": 439.5
          },
          {
            "id": "clus_10",
            "label": "Cluster #10 (24.0m \u00d7 32.0m)",
            "category": "infrastructure",
            "confidence": 93.4,
            "bbox": [
              22.55002,
              114.06247,
              22.55031,
              114.0627
            ],
            "span_km": 0.032,
            "area_m2": 391.2
          },
          {
            "id": "clus_11",
            "label": "Cluster #11 (24.0m \u00d7 8.0m)",
            "category": "building",
            "confidence": 94.6,
            "bbox": [
              22.55023,
              114.05997,
              22.55031,
              114.06021
            ],
            "span_km": 0.024,
            "area_m2": 72.0
          }
        ],
        "has_heatmap": true,
        "has_swipe_comparison": true,
        "pre_image_url": "/database_samples/test_2/pre.png",
        "post_image_url": "/database_samples/test_2/post.png",
        "highlighted_image_url": "/database_samples/test_2/highlighted.png",
        "annotated_image_url": "/database_samples/test_2/annotated.png",
        "mask_image_url": "/database_samples/test_2/mask.png",
        "max_dist_km": 0.552,
        "total_area_m2": 12580.2
      }
    },
    {
      "id": "database-test_10",
      "title": "Database Test: High-Density Commercial Construction",
      "description": "Benchmarking pair from Database/test (1). High-resolution 0.5m bi-temporal optical rasters covering 0.512 km \u00d7 0.512 km. Detects structural changes spanning 0.276 km.",
      "keywords": [
        "test_10",
        "database",
        "test 10",
        "commercial infrastructure",
        "metro logistics & transit corridor",
        "levir-cd",
        "change detection"
      ],
      "config_type": "Bi-Temporal Pair",
      "files": [
        {
          "id": "test_10_pre",
          "filename": "test_10_A_PreEvent.png",
          "sensor_hint": "cartosat3",
          "bands": 3,
          "crs": "EPSG:32650",
          "resolution_m": 0.5,
          "width": 1024,
          "height": 1024,
          "acquisition_date": "2022-03-12T04:15:00Z",
          "bbox": [
            22.529,
            114.046,
            22.533,
            114.05
          ],
          "center": [
            22.531,
            114.048
          ],
          "thumbnail_url": "/database_samples/test_10/pre.png",
          "data_type": "Optical",
          "file_size_mb": 2.1
        },
        {
          "id": "test_10_post",
          "filename": "test_10_B_PostEvent.png",
          "sensor_hint": "cartosat3",
          "bands": 3,
          "crs": "EPSG:32650",
          "resolution_m": 0.5,
          "width": 1024,
          "height": 1024,
          "acquisition_date": "2024-06-20T04:18:22Z",
          "bbox": [
            22.529,
            114.046,
            22.533,
            114.05
          ],
          "center": [
            22.531,
            114.048
          ],
          "thumbnail_url": "/database_samples/test_10/post.png",
          "data_type": "Optical",
          "file_size_mb": 1.9
        }
      ],
      "default_query": "Detect high-density commercial structures, roadway paving, and large compound grading.",
      "response": {
        "text": "Automated Siamese-CD neural inference detected 6 distinct change clusters across the 0.512 km \u00d7 0.512 km observation tile (0.2621 km\u00b2 total footprint).\n\n\u2022 Total Changed Footprint: 25,432 m\u00b2 (0.0254 km\u00b2), representing 9.7% of the surveyed surface.\n\u2022 Spatial Distance Span: Visible changes span a direct linear distance of 0.276 km (276 meters) across the sector.\n\u2022 Identified Features: Structural building foundation footprints, new roofing envelopes, and connected impervious transport surfaces.\n\u2022 Sensor Metric: Ground Sampling Distance (GSD) calibrated at 0.50m/pixel with sub-pixel boundary refinement.",
        "confidence_tier": "HIGH",
        "confidence_score": 95.8,
        "scenario_id": "database-test_10",
        "execution_trace": [
          {
            "step": 1,
            "tool": "load_database_rasters",
            "tool_display_name": "Database Raster Pair Ingestion",
            "params": {
              "source": "Database/test (1)",
              "pair_id": "test_10",
              "gsd": 0.5
            },
            "duration_ms": 220,
            "status": "success",
            "output": {
              "resolution": "0.5m/px",
              "dimensions": [
                1024,
                1024
              ],
              "tile_footprint_km2": 0.2621
            }
          },
          {
            "step": 2,
            "tool": "siamese_feature_fusion",
            "tool_display_name": "Siamese-CD Differential Neural Backbone",
            "params": {
              "model": "Siamese-CD (S2Looking/LEVIR)",
              "channels": 3,
              "layers": 4
            },
            "duration_ms": 580,
            "status": "success",
            "output": {
              "feature_diff_norm": 0.428,
              "activated_clusters": 6
            }
          },
          {
            "step": 3,
            "tool": "metric_spatial_distance_quantifier",
            "tool_display_name": "Metric Distance & Cluster Quantifier",
            "params": {
              "gsd_m": 0.5,
              "metric_units": "km"
            },
            "duration_ms": 310,
            "status": "success",
            "output": {
              "max_span_km": 0.276,
              "max_span_m": 276.0,
              "total_changed_m2": 25432.5
            }
          },
          {
            "step": 4,
            "tool": "render_highlighted_overlay",
            "tool_display_name": "Highlight Overlay & Boundary Renderer",
            "params": {
              "overlay_color": "#e07856",
              "outline_width": 3
            },
            "duration_ms": 190,
            "status": "success",
            "output": {
              "status": "rendered",
              "clusters_annotated": 6
            }
          }
        ],
        "change_stats": {
          "baseline_area_km2": 0.2621,
          "changed_area_km2": 0.02543,
          "change_ratio": 0.097,
          "change_type": "Commercial Infrastructure",
          "confidence": 95.8,
          "breakdown": [
            {
              "category": "Structural Additions",
              "area_km2": 0.0165,
              "percentage": 65
            },
            {
              "category": "Ground Grading & Access",
              "area_km2": 0.0064,
              "percentage": 25
            },
            {
              "category": "Boundary Alteration",
              "area_km2": 0.0025,
              "percentage": 10
            }
          ]
        },
        "grounding_boxes": [
          {
            "id": "clus_1",
            "label": "Cluster #1 (440.0m \u00d7 288.0m)",
            "category": "building",
            "confidence": 91.0,
            "bbox": [
              22.52869,
              114.04621,
              22.53129,
              114.0505
            ],
            "span_km": 0.44,
            "area_m2": 22812.8
          },
          {
            "id": "clus_2",
            "label": "Cluster #2 (224.0m \u00d7 152.0m)",
            "category": "infrastructure",
            "confidence": 92.2,
            "bbox": [
              22.52869,
              114.0455,
              22.53006,
              114.04769
            ],
            "span_km": 0.224,
            "area_m2": 7544.0
          },
          {
            "id": "clus_3",
            "label": "Cluster #3 (136.0m \u00d7 144.0m)",
            "category": "building",
            "confidence": 93.4,
            "bbox": [
              22.52869,
              114.04862,
              22.52999,
              114.04995
            ],
            "span_km": 0.144,
            "area_m2": 4506.5
          },
          {
            "id": "clus_4",
            "label": "Cluster #4 (32.0m \u00d7 24.0m)",
            "category": "infrastructure",
            "confidence": 94.6,
            "bbox": [
              22.52869,
              114.04792,
              22.52891,
              114.04823
            ],
            "span_km": 0.032,
            "area_m2": 269.2
          },
          {
            "id": "clus_5",
            "label": "Cluster #5 (24.0m \u00d7 24.0m)",
            "category": "building",
            "confidence": 95.8,
            "bbox": [
              22.53006,
              114.0487,
              22.53028,
              114.04894
            ],
            "span_km": 0.024,
            "area_m2": 267.5
          },
          {
            "id": "clus_6",
            "label": "Cluster #6 (24.0m \u00d7 24.0m)",
            "category": "infrastructure",
            "confidence": 97.0,
            "bbox": [
              22.52999,
              114.04901,
              22.53021,
              114.04925
            ],
            "span_km": 0.024,
            "area_m2": 231.0
          }
        ],
        "has_heatmap": true,
        "has_swipe_comparison": true,
        "pre_image_url": "/database_samples/test_10/pre.png",
        "post_image_url": "/database_samples/test_10/post.png",
        "highlighted_image_url": "/database_samples/test_10/highlighted.png",
        "annotated_image_url": "/database_samples/test_10/annotated.png",
        "mask_image_url": "/database_samples/test_10/mask.png",
        "max_dist_km": 0.276,
        "total_area_m2": 25432.5
      }
    },
    {
      "id": "database-test_14",
      "title": "Database Test: Industrial Logistics Depot Expansion",
      "description": "Benchmarking pair from Database/test (1). High-resolution 0.5m bi-temporal optical rasters covering 0.512 km \u00d7 0.512 km. Detects structural changes spanning 0.274 km.",
      "keywords": [
        "test_14",
        "database",
        "test 14",
        "industrial facilities",
        "southern port freight complex",
        "levir-cd",
        "change detection"
      ],
      "config_type": "Bi-Temporal Pair",
      "files": [
        {
          "id": "test_14_pre",
          "filename": "test_14_A_PreEvent.png",
          "sensor_hint": "cartosat3",
          "bands": 3,
          "crs": "EPSG:32650",
          "resolution_m": 0.5,
          "width": 1024,
          "height": 1024,
          "acquisition_date": "2022-03-12T04:15:00Z",
          "bbox": [
            22.52,
            114.036,
            22.524,
            114.04
          ],
          "center": [
            22.522,
            114.038
          ],
          "thumbnail_url": "/database_samples/test_14/pre.png",
          "data_type": "Optical",
          "file_size_mb": 2.1
        },
        {
          "id": "test_14_post",
          "filename": "test_14_B_PostEvent.png",
          "sensor_hint": "cartosat3",
          "bands": 3,
          "crs": "EPSG:32650",
          "resolution_m": 0.5,
          "width": 1024,
          "height": 1024,
          "acquisition_date": "2024-06-20T04:18:22Z",
          "bbox": [
            22.52,
            114.036,
            22.524,
            114.04
          ],
          "center": [
            22.522,
            114.038
          ],
          "thumbnail_url": "/database_samples/test_14/post.png",
          "data_type": "Optical",
          "file_size_mb": 1.9
        }
      ],
      "default_query": "Highlight large-scale industrial warehouses, loading docks, and concrete tarmac expansion.",
      "response": {
        "text": "Automated Siamese-CD neural inference detected 10 distinct change clusters across the 0.512 km \u00d7 0.512 km observation tile (0.2621 km\u00b2 total footprint).\n\n\u2022 Total Changed Footprint: 28,373 m\u00b2 (0.0284 km\u00b2), representing 10.82% of the surveyed surface.\n\u2022 Spatial Distance Span: Visible changes span a direct linear distance of 0.274 km (274 meters) across the sector.\n\u2022 Identified Features: Structural building foundation footprints, new roofing envelopes, and connected impervious transport surfaces.\n\u2022 Sensor Metric: Ground Sampling Distance (GSD) calibrated at 0.50m/pixel with sub-pixel boundary refinement.",
        "confidence_tier": "HIGH",
        "confidence_score": 95.8,
        "scenario_id": "database-test_14",
        "execution_trace": [
          {
            "step": 1,
            "tool": "load_database_rasters",
            "tool_display_name": "Database Raster Pair Ingestion",
            "params": {
              "source": "Database/test (1)",
              "pair_id": "test_14",
              "gsd": 0.5
            },
            "duration_ms": 220,
            "status": "success",
            "output": {
              "resolution": "0.5m/px",
              "dimensions": [
                1024,
                1024
              ],
              "tile_footprint_km2": 0.2621
            }
          },
          {
            "step": 2,
            "tool": "siamese_feature_fusion",
            "tool_display_name": "Siamese-CD Differential Neural Backbone",
            "params": {
              "model": "Siamese-CD (S2Looking/LEVIR)",
              "channels": 3,
              "layers": 4
            },
            "duration_ms": 580,
            "status": "success",
            "output": {
              "feature_diff_norm": 0.428,
              "activated_clusters": 10
            }
          },
          {
            "step": 3,
            "tool": "metric_spatial_distance_quantifier",
            "tool_display_name": "Metric Distance & Cluster Quantifier",
            "params": {
              "gsd_m": 0.5,
              "metric_units": "km"
            },
            "duration_ms": 310,
            "status": "success",
            "output": {
              "max_span_km": 0.274,
              "max_span_m": 274.4,
              "total_changed_m2": 28373.0
            }
          },
          {
            "step": 4,
            "tool": "render_highlighted_overlay",
            "tool_display_name": "Highlight Overlay & Boundary Renderer",
            "params": {
              "overlay_color": "#e07856",
              "outline_width": 3
            },
            "duration_ms": 190,
            "status": "success",
            "output": {
              "status": "rendered",
              "clusters_annotated": 10
            }
          }
        ],
        "change_stats": {
          "baseline_area_km2": 0.2621,
          "changed_area_km2": 0.02837,
          "change_ratio": 0.1082,
          "change_type": "Industrial Facilities",
          "confidence": 95.8,
          "breakdown": [
            {
              "category": "Structural Additions",
              "area_km2": 0.0184,
              "percentage": 65
            },
            {
              "category": "Ground Grading & Access",
              "area_km2": 0.0071,
              "percentage": 25
            },
            {
              "category": "Boundary Alteration",
              "area_km2": 0.0028,
              "percentage": 10
            }
          ]
        },
        "grounding_boxes": [
          {
            "id": "clus_1",
            "label": "Cluster #1 (320.0m \u00d7 440.0m)",
            "category": "building",
            "confidence": 91.0,
            "bbox": [
              22.51984,
              114.0355,
              22.5238,
              114.03862
            ],
            "span_km": 0.44,
            "area_m2": 26665.5
          },
          {
            "id": "clus_2",
            "label": "Cluster #2 (168.0m \u00d7 96.0m)",
            "category": "infrastructure",
            "confidence": 92.2,
            "bbox": [
              22.5225,
              114.03652,
              22.52337,
              114.03816
            ],
            "span_km": 0.168,
            "area_m2": 4201.0
          },
          {
            "id": "clus_3",
            "label": "Cluster #3 (144.0m \u00d7 96.0m)",
            "category": "building",
            "confidence": 93.4,
            "bbox": [
              22.52344,
              114.0355,
              22.52431,
              114.03691
            ],
            "span_km": 0.144,
            "area_m2": 3258.8
          },
          {
            "id": "clus_4",
            "label": "Cluster #4 (128.0m \u00d7 80.0m)",
            "category": "infrastructure",
            "confidence": 94.6,
            "bbox": [
              22.52193,
              114.03667,
              22.52265,
              114.03792
            ],
            "span_km": 0.128,
            "area_m2": 2808.8
          },
          {
            "id": "clus_5",
            "label": "Cluster #5 (112.0m \u00d7 80.0m)",
            "category": "building",
            "confidence": 95.8,
            "bbox": [
              22.52186,
              114.0355,
              22.52258,
              114.0366
            ],
            "span_km": 0.112,
            "area_m2": 2707.8
          },
          {
            "id": "clus_6",
            "label": "Cluster #6 (112.0m \u00d7 40.0m)",
            "category": "infrastructure",
            "confidence": 97.0,
            "bbox": [
              22.52157,
              114.03589,
              22.52193,
              114.03699
            ],
            "span_km": 0.112,
            "area_m2": 1325.5
          },
          {
            "id": "clus_7",
            "label": "Cluster #7 (96.0m \u00d7 40.0m)",
            "category": "building",
            "confidence": 98.2,
            "bbox": [
              22.52258,
              114.0355,
              22.52294,
              114.03644
            ],
            "span_km": 0.096,
            "area_m2": 1198.5
          },
          {
            "id": "clus_8",
            "label": "Cluster #8 (80.0m \u00d7 48.0m)",
            "category": "infrastructure",
            "confidence": 91.0,
            "bbox": [
              22.52294,
              114.0355,
              22.52337,
              114.03628
            ],
            "span_km": 0.08,
            "area_m2": 1143.8
          },
          {
            "id": "clus_9",
            "label": "Cluster #9 (104.0m \u00d7 48.0m)",
            "category": "building",
            "confidence": 92.2,
            "bbox": [
              22.52121,
              114.03605,
              22.52164,
              114.03706
            ],
            "span_km": 0.104,
            "area_m2": 1130.0
          },
          {
            "id": "clus_10",
            "label": "Cluster #10 (32.0m \u00d7 24.0m)",
            "category": "infrastructure",
            "confidence": 93.4,
            "bbox": [
              22.52315,
              114.03636,
              22.52337,
              114.03667
            ],
            "span_km": 0.032,
            "area_m2": 327.5
          }
        ],
        "has_heatmap": true,
        "has_swipe_comparison": true,
        "pre_image_url": "/database_samples/test_14/pre.png",
        "post_image_url": "/database_samples/test_14/post.png",
        "highlighted_image_url": "/database_samples/test_14/highlighted.png",
        "annotated_image_url": "/database_samples/test_14/annotated.png",
        "mask_image_url": "/database_samples/test_14/mask.png",
        "max_dist_km": 0.274,
        "total_area_m2": 28373.0
      }
    },
    {
      "id": "database-test_28",
      "title": "Database Test: Highway & Grading Infrastructure Additions",
      "description": "Benchmarking pair from Database/test (1). High-resolution 0.5m bi-temporal optical rasters covering 0.512 km \u00d7 0.512 km. Detects structural changes spanning 0.634 km.",
      "keywords": [
        "test_28",
        "database",
        "test 28",
        "transportation & civil works",
        "west highway interchange zone",
        "levir-cd",
        "change detection"
      ],
      "config_type": "Bi-Temporal Pair",
      "files": [
        {
          "id": "test_28_pre",
          "filename": "test_28_A_PreEvent.png",
          "sensor_hint": "cartosat3",
          "bands": 3,
          "crs": "EPSG:32650",
          "resolution_m": 0.5,
          "width": 1024,
          "height": 1024,
          "acquisition_date": "2022-03-12T04:15:00Z",
          "bbox": [
            22.554,
            114.027,
            22.558,
            114.031
          ],
          "center": [
            22.556,
            114.029
          ],
          "thumbnail_url": "/database_samples/test_28/pre.png",
          "data_type": "Optical",
          "file_size_mb": 2.1
        },
        {
          "id": "test_28_post",
          "filename": "test_28_B_PostEvent.png",
          "sensor_hint": "cartosat3",
          "bands": 3,
          "crs": "EPSG:32650",
          "resolution_m": 0.5,
          "width": 1024,
          "height": 1024,
          "acquisition_date": "2024-06-20T04:18:22Z",
          "bbox": [
            22.554,
            114.027,
            22.558,
            114.031
          ],
          "center": [
            22.556,
            114.029
          ],
          "thumbnail_url": "/database_samples/test_28/post.png",
          "data_type": "Optical",
          "file_size_mb": 1.9
        }
      ],
      "default_query": "Identify transportation corridor clearing, highway grading, and arterial additions.",
      "response": {
        "text": "Automated Siamese-CD neural inference detected 17 distinct change clusters across the 0.512 km \u00d7 0.512 km observation tile (0.2621 km\u00b2 total footprint).\n\n\u2022 Total Changed Footprint: 25,700 m\u00b2 (0.0257 km\u00b2), representing 9.8% of the surveyed surface.\n\u2022 Spatial Distance Span: Visible changes span a direct linear distance of 0.634 km (634 meters) across the sector.\n\u2022 Identified Features: Structural building foundation footprints, new roofing envelopes, and connected impervious transport surfaces.\n\u2022 Sensor Metric: Ground Sampling Distance (GSD) calibrated at 0.50m/pixel with sub-pixel boundary refinement.",
        "confidence_tier": "HIGH",
        "confidence_score": 95.8,
        "scenario_id": "database-test_28",
        "execution_trace": [
          {
            "step": 1,
            "tool": "load_database_rasters",
            "tool_display_name": "Database Raster Pair Ingestion",
            "params": {
              "source": "Database/test (1)",
              "pair_id": "test_28",
              "gsd": 0.5
            },
            "duration_ms": 220,
            "status": "success",
            "output": {
              "resolution": "0.5m/px",
              "dimensions": [
                1024,
                1024
              ],
              "tile_footprint_km2": 0.2621
            }
          },
          {
            "step": 2,
            "tool": "siamese_feature_fusion",
            "tool_display_name": "Siamese-CD Differential Neural Backbone",
            "params": {
              "model": "Siamese-CD (S2Looking/LEVIR)",
              "channels": 3,
              "layers": 4
            },
            "duration_ms": 580,
            "status": "success",
            "output": {
              "feature_diff_norm": 0.428,
              "activated_clusters": 17
            }
          },
          {
            "step": 3,
            "tool": "metric_spatial_distance_quantifier",
            "tool_display_name": "Metric Distance & Cluster Quantifier",
            "params": {
              "gsd_m": 0.5,
              "metric_units": "km"
            },
            "duration_ms": 310,
            "status": "success",
            "output": {
              "max_span_km": 0.634,
              "max_span_m": 634.0,
              "total_changed_m2": 25700.2
            }
          },
          {
            "step": 4,
            "tool": "render_highlighted_overlay",
            "tool_display_name": "Highlight Overlay & Boundary Renderer",
            "params": {
              "overlay_color": "#e07856",
              "outline_width": 3
            },
            "duration_ms": 190,
            "status": "success",
            "output": {
              "status": "rendered",
              "clusters_annotated": 17
            }
          }
        ],
        "change_stats": {
          "baseline_area_km2": 0.2621,
          "changed_area_km2": 0.0257,
          "change_ratio": 0.098,
          "change_type": "Transportation & Civil Works",
          "confidence": 95.8,
          "breakdown": [
            {
              "category": "Structural Additions",
              "area_km2": 0.0167,
              "percentage": 65
            },
            {
              "category": "Ground Grading & Access",
              "area_km2": 0.0064,
              "percentage": 25
            },
            {
              "category": "Boundary Alteration",
              "area_km2": 0.0026,
              "percentage": 10
            }
          ]
        },
        "grounding_boxes": [
          {
            "id": "clus_1",
            "label": "Cluster #1 (232.0m \u00d7 112.0m)",
            "category": "building",
            "confidence": 91.0,
            "bbox": [
              22.55369,
              114.02705,
              22.5547,
              114.02931
            ],
            "span_km": 0.232,
            "area_m2": 6856.8
          },
          {
            "id": "clus_2",
            "label": "Cluster #2 (192.0m \u00d7 144.0m)",
            "category": "infrastructure",
            "confidence": 92.2,
            "bbox": [
              22.55413,
              114.02752,
              22.55542,
              114.02939
            ],
            "span_km": 0.192,
            "area_m2": 6721.8
          },
          {
            "id": "clus_3",
            "label": "Cluster #3 (240.0m \u00d7 128.0m)",
            "category": "building",
            "confidence": 93.4,
            "bbox": [
              22.55413,
              114.02908,
              22.55528,
              114.03142
            ],
            "span_km": 0.24,
            "area_m2": 5612.0
          },
          {
            "id": "clus_4",
            "label": "Cluster #4 (152.0m \u00d7 88.0m)",
            "category": "infrastructure",
            "confidence": 94.6,
            "bbox": [
              22.55542,
              114.02705,
              22.55622,
              114.02853
            ],
            "span_km": 0.152,
            "area_m2": 2967.2
          },
          {
            "id": "clus_5",
            "label": "Cluster #5 (112.0m \u00d7 80.0m)",
            "category": "building",
            "confidence": 95.8,
            "bbox": [
              22.55528,
              114.0265,
              22.556,
              114.0276
            ],
            "span_km": 0.112,
            "area_m2": 2539.5
          },
          {
            "id": "clus_6",
            "label": "Cluster #6 (112.0m \u00d7 80.0m)",
            "category": "infrastructure",
            "confidence": 97.0,
            "bbox": [
              22.55369,
              114.02947,
              22.55441,
              114.03056
            ],
            "span_km": 0.112,
            "area_m2": 2374.0
          },
          {
            "id": "clus_7",
            "label": "Cluster #7 (88.0m \u00d7 64.0m)",
            "category": "building",
            "confidence": 98.2,
            "bbox": [
              22.55492,
              114.0265,
              22.5555,
              114.02736
            ],
            "span_km": 0.088,
            "area_m2": 1311.8
          },
          {
            "id": "clus_8",
            "label": "Cluster #8 (72.0m \u00d7 72.0m)",
            "category": "infrastructure",
            "confidence": 91.0,
            "bbox": [
              22.55441,
              114.0265,
              22.55506,
              114.02721
            ],
            "span_km": 0.072,
            "area_m2": 1226.2
          },
          {
            "id": "clus_9",
            "label": "Cluster #9 (64.0m \u00d7 56.0m)",
            "category": "building",
            "confidence": 92.2,
            "bbox": [
              22.55773,
              114.03087,
              22.55823,
              114.0315
            ],
            "span_km": 0.064,
            "area_m2": 1001.2
          },
          {
            "id": "clus_10",
            "label": "Cluster #10 (40.0m \u00d7 64.0m)",
            "category": "infrastructure",
            "confidence": 93.4,
            "bbox": [
              22.55377,
              114.0265,
              22.55434,
              114.02689
            ],
            "span_km": 0.064,
            "area_m2": 802.5
          },
          {
            "id": "clus_11",
            "label": "Cluster #11 (48.0m \u00d7 40.0m)",
            "category": "building",
            "confidence": 94.6,
            "bbox": [
              22.55607,
              114.0265,
              22.55643,
              114.02697
            ],
            "span_km": 0.048,
            "area_m2": 565.8
          },
          {
            "id": "clus_12",
            "label": "Cluster #12 (40.0m \u00d7 40.0m)",
            "category": "infrastructure",
            "confidence": 95.8,
            "bbox": [
              22.55377,
              114.03056,
              22.55413,
              114.03095
            ],
            "span_km": 0.04,
            "area_m2": 456.5
          }
        ],
        "has_heatmap": true,
        "has_swipe_comparison": true,
        "pre_image_url": "/database_samples/test_28/pre.png",
        "post_image_url": "/database_samples/test_28/post.png",
        "highlighted_image_url": "/database_samples/test_28/highlighted.png",
        "annotated_image_url": "/database_samples/test_28/annotated.png",
        "mask_image_url": "/database_samples/test_28/mask.png",
        "max_dist_km": 0.634,
        "total_area_m2": 25700.2
      }
    },
    {
      "id": "database-test_42",
      "title": "Database Test: Commercial Foundation Footprints",
      "description": "Benchmarking pair from Database/test (1). High-resolution 0.5m bi-temporal optical rasters covering 0.512 km \u00d7 0.512 km. Detects structural changes spanning 0.48 km.",
      "keywords": [
        "test_42",
        "database",
        "test 42",
        "commercial construction",
        "central tech innovation hub",
        "levir-cd",
        "change detection"
      ],
      "config_type": "Bi-Temporal Pair",
      "files": [
        {
          "id": "test_42_pre",
          "filename": "test_42_A_PreEvent.png",
          "sensor_hint": "cartosat3",
          "bands": 3,
          "crs": "EPSG:32650",
          "resolution_m": 0.5,
          "width": 1024,
          "height": 1024,
          "acquisition_date": "2022-03-12T04:15:00Z",
          "bbox": [
            22.536,
            114.057,
            22.54,
            114.061
          ],
          "center": [
            22.538,
            114.059
          ],
          "thumbnail_url": "/database_samples/test_42/pre.png",
          "data_type": "Optical",
          "file_size_mb": 2.1
        },
        {
          "id": "test_42_post",
          "filename": "test_42_B_PostEvent.png",
          "sensor_hint": "cartosat3",
          "bands": 3,
          "crs": "EPSG:32650",
          "resolution_m": 0.5,
          "width": 1024,
          "height": 1024,
          "acquisition_date": "2024-06-20T04:18:22Z",
          "bbox": [
            22.536,
            114.057,
            22.54,
            114.061
          ],
          "center": [
            22.538,
            114.059
          ],
          "thumbnail_url": "/database_samples/test_42/post.png",
          "data_type": "Optical",
          "file_size_mb": 1.9
        }
      ],
      "default_query": "Isolate all structural additions and concrete foundation footprints across commercial plots.",
      "response": {
        "text": "Automated Siamese-CD neural inference detected 11 distinct change clusters across the 0.512 km \u00d7 0.512 km observation tile (0.2621 km\u00b2 total footprint).\n\n\u2022 Total Changed Footprint: 13,646 m\u00b2 (0.0137 km\u00b2), representing 5.21% of the surveyed surface.\n\u2022 Spatial Distance Span: Visible changes span a direct linear distance of 0.48 km (480 meters) across the sector.\n\u2022 Identified Features: Structural building foundation footprints, new roofing envelopes, and connected impervious transport surfaces.\n\u2022 Sensor Metric: Ground Sampling Distance (GSD) calibrated at 0.50m/pixel with sub-pixel boundary refinement.",
        "confidence_tier": "HIGH",
        "confidence_score": 95.8,
        "scenario_id": "database-test_42",
        "execution_trace": [
          {
            "step": 1,
            "tool": "load_database_rasters",
            "tool_display_name": "Database Raster Pair Ingestion",
            "params": {
              "source": "Database/test (1)",
              "pair_id": "test_42",
              "gsd": 0.5
            },
            "duration_ms": 220,
            "status": "success",
            "output": {
              "resolution": "0.5m/px",
              "dimensions": [
                1024,
                1024
              ],
              "tile_footprint_km2": 0.2621
            }
          },
          {
            "step": 2,
            "tool": "siamese_feature_fusion",
            "tool_display_name": "Siamese-CD Differential Neural Backbone",
            "params": {
              "model": "Siamese-CD (S2Looking/LEVIR)",
              "channels": 3,
              "layers": 4
            },
            "duration_ms": 580,
            "status": "success",
            "output": {
              "feature_diff_norm": 0.428,
              "activated_clusters": 11
            }
          },
          {
            "step": 3,
            "tool": "metric_spatial_distance_quantifier",
            "tool_display_name": "Metric Distance & Cluster Quantifier",
            "params": {
              "gsd_m": 0.5,
              "metric_units": "km"
            },
            "duration_ms": 310,
            "status": "success",
            "output": {
              "max_span_km": 0.48,
              "max_span_m": 479.5,
              "total_changed_m2": 13646.0
            }
          },
          {
            "step": 4,
            "tool": "render_highlighted_overlay",
            "tool_display_name": "Highlight Overlay & Boundary Renderer",
            "params": {
              "overlay_color": "#e07856",
              "outline_width": 3
            },
            "duration_ms": 190,
            "status": "success",
            "output": {
              "status": "rendered",
              "clusters_annotated": 11
            }
          }
        ],
        "change_stats": {
          "baseline_area_km2": 0.2621,
          "changed_area_km2": 0.01365,
          "change_ratio": 0.0521,
          "change_type": "Commercial Construction",
          "confidence": 95.8,
          "breakdown": [
            {
              "category": "Structural Additions",
              "area_km2": 0.0089,
              "percentage": 65
            },
            {
              "category": "Ground Grading & Access",
              "area_km2": 0.0034,
              "percentage": 25
            },
            {
              "category": "Boundary Alteration",
              "area_km2": 0.0014,
              "percentage": 10
            }
          ]
        },
        "grounding_boxes": [
          {
            "id": "clus_1",
            "label": "Cluster #1 (232.0m \u00d7 144.0m)",
            "category": "building",
            "confidence": 91.0,
            "bbox": [
              22.5367,
              114.05923,
              22.538,
              114.0615
            ],
            "span_km": 0.232,
            "area_m2": 7481.0
          },
          {
            "id": "clus_2",
            "label": "Cluster #2 (168.0m \u00d7 112.0m)",
            "category": "infrastructure",
            "confidence": 92.2,
            "bbox": [
              22.53714,
              114.05986,
              22.53814,
              114.0615
            ],
            "span_km": 0.168,
            "area_m2": 4691.8
          },
          {
            "id": "clus_3",
            "label": "Cluster #3 (224.0m \u00d7 88.0m)",
            "category": "building",
            "confidence": 93.4,
            "bbox": [
              22.53757,
              114.05682,
              22.53836,
              114.059
            ],
            "span_km": 0.224,
            "area_m2": 3063.8
          },
          {
            "id": "clus_4",
            "label": "Cluster #4 (120.0m \u00d7 88.0m)",
            "category": "infrastructure",
            "confidence": 94.6,
            "bbox": [
              22.53786,
              114.06033,
              22.53865,
              114.0615
            ],
            "span_km": 0.12,
            "area_m2": 2118.8
          },
          {
            "id": "clus_5",
            "label": "Cluster #5 (88.0m \u00d7 80.0m)",
            "category": "building",
            "confidence": 95.8,
            "bbox": [
              22.53714,
              114.0565,
              22.53786,
              114.05736
            ],
            "span_km": 0.088,
            "area_m2": 1445.0
          },
          {
            "id": "clus_6",
            "label": "Cluster #6 (48.0m \u00d7 48.0m)",
            "category": "infrastructure",
            "confidence": 97.0,
            "bbox": [
              22.53757,
              114.0565,
              22.538,
              114.05697
            ],
            "span_km": 0.048,
            "area_m2": 598.2
          },
          {
            "id": "clus_7",
            "label": "Cluster #7 (16.0m \u00d7 24.0m)",
            "category": "building",
            "confidence": 98.2,
            "bbox": [
              22.53915,
              114.0565,
              22.53937,
              114.05666
            ],
            "span_km": 0.024,
            "area_m2": 153.5
          },
          {
            "id": "clus_8",
            "label": "Cluster #8 (16.0m \u00d7 16.0m)",
            "category": "infrastructure",
            "confidence": 91.0,
            "bbox": [
              22.53901,
              114.0604,
              22.53915,
              114.06056
            ],
            "span_km": 0.016,
            "area_m2": 78.5
          },
          {
            "id": "clus_9",
            "label": "Cluster #9 (16.0m \u00d7 16.0m)",
            "category": "building",
            "confidence": 92.2,
            "bbox": [
              22.53959,
              114.05666,
              22.53973,
              114.05682
            ],
            "span_km": 0.016,
            "area_m2": 70.0
          },
          {
            "id": "clus_10",
            "label": "Cluster #10 (16.0m \u00d7 16.0m)",
            "category": "infrastructure",
            "confidence": 93.4,
            "bbox": [
              22.53901,
              114.06064,
              22.53915,
              114.06079
            ],
            "span_km": 0.016,
            "area_m2": 34.8
          },
          {
            "id": "clus_11",
            "label": "Cluster #11 (8.0m \u00d7 16.0m)",
            "category": "building",
            "confidence": 94.6,
            "bbox": [
              22.53959,
              114.0565,
              22.53973,
              114.05658
            ],
            "span_km": 0.016,
            "area_m2": 20.5
          }
        ],
        "has_heatmap": true,
        "has_swipe_comparison": true,
        "pre_image_url": "/database_samples/test_42/pre.png",
        "post_image_url": "/database_samples/test_42/post.png",
        "highlighted_image_url": "/database_samples/test_42/highlighted.png",
        "annotated_image_url": "/database_samples/test_42/annotated.png",
        "mask_image_url": "/database_samples/test_42/mask.png",
        "max_dist_km": 0.48,
        "total_area_m2": 13646.0
      }
    }
];

export function matchExplicitScenario(query: string): MissionScenario | null {
  const q = query.toLowerCase().trim();

  // Match ONLY specific test IDs: e.g. "test_1", "test_10", "test_14", "test_28", "test_42", "test_100", "test_2"
  const m = q.match(/test[_\s-]?(\d+)/);
  if (m) {
    const num = m[1];
    const target = MOCK_SCENARIOS.find((s) => s.id === `database-test_${num}` || s.id.endsWith(`_${num}`));
    if (target) return target;
  }

  return null;
}

export function findMatchingScenario(query: string, uploadedFilesCount: number, hasSar: boolean): MissionScenario {
  const explicit = matchExplicitScenario(query);
  if (explicit) return explicit;
  return MOCK_SCENARIOS[0];
}
