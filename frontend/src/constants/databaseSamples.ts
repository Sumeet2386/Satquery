export interface DatabaseSampleCluster {
  id: string;
  label: string;
  category: string;
  confidence: number;
  area_m2: number;
  area_km2: number;
  span_m: number;
  span_km: number;
  bbox_px: [number, number, number, number];
  bbox: [number, number, number, number];
}

export interface DatabaseSample {
  id: string;
  title: string;
  category: string;
  location: string;
  query: string;
  base_lat: number;
  base_lng: number;
  center: [number, number];
  total_changed_px: number;
  change_pct: number;
  total_area_m2: number;
  total_area_km2: number;
  tile_width_km: number;
  tile_height_km: number;
  tile_area_km2: number;
  max_dist_km: number;
  max_dist_m: number;
  cluster_count: number;
  explanation: string;
  pre_image_url: string;
  post_image_url: string;
  mask_image_url: string;
  highlighted_image_url: string;
  annotated_image_url: string;
  clusters: DatabaseSampleCluster[];
}

export const DATABASE_SAMPLES: DatabaseSample[] = [
  {
    "id": "test_1",
    "title": "Urban Expansion — Residential Footprints",
    "category": "Building Construction",
    "location": "North Sector Sector-4A",
    "query": "Identify new residential building construction and impervious structural footprints.",
    "base_lat": 22.542,
    "base_lng": 114.055,
    "center": [
      22.542,
      114.055
    ],
    "total_changed_px": 13189,
    "change_pct": 1.26,
    "total_area_m2": 3297.2,
    "total_area_km2": 0.0033,
    "tile_width_km": 0.512,
    "tile_height_km": 0.512,
    "tile_area_km2": 0.2621,
    "max_dist_km": 0.114,
    "max_dist_m": 113.7,
    "cluster_count": 5,
    "explanation": "Automated Siamese-CD neural inference detected 5 distinct change clusters across the 0.512 km × 0.512 km observation tile (0.2621 km² total footprint).\n\n• Total Changed Footprint: 3,297 m² (0.0033 km²), representing 1.26% of the surveyed surface.\n• Spatial Distance Span: Visible changes span a direct linear distance of 0.114 km (114 meters) across the sector.\n• Identified Features: Structural building foundation footprints, new roofing envelopes, and connected impervious transport surfaces.\n• Sensor Metric: Ground Sampling Distance (GSD) calibrated at 0.50m/pixel with sub-pixel boundary refinement.",
    "pre_image_url": "/database_samples/test_1/pre.png",
    "post_image_url": "/database_samples/test_1/post.png",
    "mask_image_url": "/database_samples/test_1/mask.png",
    "highlighted_image_url": "/database_samples/test_1/highlighted.png",
    "annotated_image_url": "/database_samples/test_1/annotated.png",
    "clusters": [
      {
        "id": "clus_1",
        "label": "Cluster #1 (72.0m × 48.0m)",
        "category": "building",
        "confidence": 91,
        "area_m2": 1005,
        "area_km2": 0.001005,
        "span_m": 72,
        "span_km": 0.072,
        "bbox_px": [
          784,
          160,
          928,
          256
        ],
        "bbox": [
          22.54315,
          114.05633,
          22.54359,
          114.05703
        ]
      },
      {
        "id": "clus_2",
        "label": "Cluster #2 (32.0m × 64.0m)",
        "category": "infrastructure",
        "confidence": 92.2,
        "area_m2": 890.8,
        "area_km2": 0.000891,
        "span_m": 64,
        "span_km": 0.064,
        "bbox_px": [
          800,
          0,
          864,
          128
        ],
        "bbox": [
          22.54373,
          114.0564,
          22.54431,
          114.05672
        ]
      },
      {
        "id": "clus_3",
        "label": "Cluster #3 (40.0m × 32.0m)",
        "category": "building",
        "confidence": 93.4,
        "area_m2": 585,
        "area_km2": 0.000585,
        "span_m": 40,
        "span_km": 0.04,
        "bbox_px": [
          944,
          192,
          1024,
          256
        ],
        "bbox": [
          22.54315,
          114.05711,
          22.54344,
          114.0575
        ]
      },
      {
        "id": "clus_4",
        "label": "Cluster #4 (32.0m × 32.0m)",
        "category": "infrastructure",
        "confidence": 94.6,
        "area_m2": 516.2,
        "area_km2": 0.000516,
        "span_m": 32,
        "span_km": 0.032,
        "bbox_px": [
          896,
          0,
          960,
          64
        ],
        "bbox": [
          22.54402,
          114.05687,
          22.54431,
          114.05718
        ]
      },
      {
        "id": "clus_5",
        "label": "Cluster #5 (24.0m × 32.0m)",
        "category": "building",
        "confidence": 95.8,
        "area_m2": 298.5,
        "area_km2": 0.000298,
        "span_m": 32,
        "span_km": 0.032,
        "bbox_px": [
          976,
          0,
          1024,
          64
        ],
        "bbox": [
          22.54402,
          114.05726,
          22.54431,
          114.0575
        ]
      }
    ]
  },
  {
    "id": "test_2",
    "title": "Suburban Housing Cluster Development",
    "category": "Residential Development",
    "location": "East Valley Residential Zone",
    "query": "Detect housing cluster expansion and new foundation groundwork.",
    "base_lat": 22.548,
    "base_lng": 114.062,
    "center": [
      22.548,
      114.062
    ],
    "total_changed_px": 50321,
    "change_pct": 4.8,
    "total_area_m2": 12580.2,
    "total_area_km2": 0.01258,
    "tile_width_km": 0.512,
    "tile_height_km": 0.512,
    "tile_area_km2": 0.2621,
    "max_dist_km": 0.552,
    "max_dist_m": 551.6,
    "cluster_count": 11,
    "explanation": "Automated Siamese-CD neural inference detected 11 distinct change clusters across the 0.512 km × 0.512 km observation tile (0.2621 km² total footprint).\n\n• Total Changed Footprint: 12,580 m² (0.0126 km²), representing 4.8% of the surveyed surface.\n• Spatial Distance Span: Visible changes span a direct linear distance of 0.552 km (552 meters) across the sector.\n• Identified Features: Structural building foundation footprints, new roofing envelopes, and connected impervious transport surfaces.\n• Sensor Metric: Ground Sampling Distance (GSD) calibrated at 0.50m/pixel with sub-pixel boundary refinement.",
    "pre_image_url": "/database_samples/test_2/pre.png",
    "post_image_url": "/database_samples/test_2/post.png",
    "mask_image_url": "/database_samples/test_2/mask.png",
    "highlighted_image_url": "/database_samples/test_2/highlighted.png",
    "annotated_image_url": "/database_samples/test_2/annotated.png",
    "clusters": [
      {
        "id": "clus_1",
        "label": "Cluster #1 (312.0m × 40.0m)",
        "category": "building",
        "confidence": 91,
        "area_m2": 3608.2,
        "area_km2": 0.003608,
        "span_m": 312,
        "span_km": 0.312,
        "bbox_px": [
          0,
          176,
          624,
          256
        ],
        "bbox": [
          22.54915,
          114.0595,
          22.54951,
          114.06255
        ]
      },
      {
        "id": "clus_2",
        "label": "Cluster #2 (104.0m × 88.0m)",
        "category": "infrastructure",
        "confidence": 92.2,
        "area_m2": 2563.5,
        "area_km2": 0.002563,
        "span_m": 104,
        "span_km": 0.104,
        "bbox_px": [
          32,
          0,
          240,
          176
        ],
        "bbox": [
          22.54951,
          114.05966,
          22.55031,
          114.06067
        ]
      },
      {
        "id": "clus_3",
        "label": "Cluster #3 (144.0m × 48.0m)",
        "category": "building",
        "confidence": 93.4,
        "area_m2": 1625.2,
        "area_km2": 0.001625,
        "span_m": 144,
        "span_km": 0.144,
        "bbox_px": [
          352,
          80,
          640,
          176
        ],
        "bbox": [
          22.54951,
          114.06122,
          22.54995,
          114.06262
        ]
      },
      {
        "id": "clus_4",
        "label": "Cluster #4 (96.0m × 48.0m)",
        "category": "infrastructure",
        "confidence": 94.6,
        "area_m2": 1095,
        "area_km2": 0.001095,
        "span_m": 96,
        "span_km": 0.096,
        "bbox_px": [
          368,
          0,
          560,
          96
        ],
        "bbox": [
          22.54987,
          114.0613,
          22.55031,
          114.06223
        ]
      },
      {
        "id": "clus_5",
        "label": "Cluster #5 (32.0m × 88.0m)",
        "category": "building",
        "confidence": 95.8,
        "area_m2": 1080.2,
        "area_km2": 0.00108,
        "span_m": 88,
        "span_km": 0.088,
        "bbox_px": [
          272,
          0,
          336,
          176
        ],
        "bbox": [
          22.54951,
          114.06083,
          22.55031,
          114.06114
        ]
      },
      {
        "id": "clus_6",
        "label": "Cluster #6 (80.0m × 40.0m)",
        "category": "infrastructure",
        "confidence": 97,
        "area_m2": 818,
        "area_km2": 0.000818,
        "span_m": 80,
        "span_km": 0.08,
        "bbox_px": [
          640,
          144,
          800,
          224
        ],
        "bbox": [
          22.5493,
          114.06262,
          22.54966,
          114.0634
        ]
      },
      {
        "id": "clus_7",
        "label": "Cluster #7 (72.0m × 48.0m)",
        "category": "building",
        "confidence": 98.2,
        "area_m2": 805.5,
        "area_km2": 0.000806,
        "span_m": 72,
        "span_km": 0.072,
        "bbox_px": [
          704,
          48,
          848,
          144
        ],
        "bbox": [
          22.54966,
          114.06294,
          22.55009,
          114.06364
        ]
      },
      {
        "id": "clus_8",
        "label": "Cluster #8 (40.0m × 48.0m)",
        "category": "infrastructure",
        "confidence": 91,
        "area_m2": 566.2,
        "area_km2": 0.000566,
        "span_m": 48,
        "span_km": 0.048,
        "bbox_px": [
          0,
          0,
          80,
          96
        ],
        "bbox": [
          22.54987,
          114.0595,
          22.55031,
          114.05989
        ]
      },
      {
        "id": "clus_9",
        "label": "Cluster #9 (40.0m × 40.0m)",
        "category": "building",
        "confidence": 92.2,
        "area_m2": 439.5,
        "area_km2": 0.00044,
        "span_m": 40,
        "span_km": 0.04,
        "bbox_px": [
          784,
          784,
          864,
          864
        ],
        "bbox": [
          22.54641,
          114.06333,
          22.54677,
          114.06372
        ]
      },
      {
        "id": "clus_10",
        "label": "Cluster #10 (24.0m × 32.0m)",
        "category": "infrastructure",
        "confidence": 93.4,
        "area_m2": 391.2,
        "area_km2": 0.000391,
        "span_m": 32,
        "span_km": 0.032,
        "bbox_px": [
          608,
          0,
          656,
          64
        ],
        "bbox": [
          22.55002,
          114.06247,
          22.55031,
          114.0627
        ]
      },
      {
        "id": "clus_11",
        "label": "Cluster #11 (24.0m × 8.0m)",
        "category": "building",
        "confidence": 94.6,
        "area_m2": 72,
        "area_km2": 0.000072,
        "span_m": 24,
        "span_km": 0.024,
        "bbox_px": [
          96,
          0,
          144,
          16
        ],
        "bbox": [
          22.55023,
          114.05997,
          22.55031,
          114.06021
        ]
      }
    ]
  },
  {
    "id": "test_10",
    "title": "High-Density Commercial Construction",
    "category": "Commercial Infrastructure",
    "location": "Metro Logistics & Transit Corridor",
    "query": "Detect high-density commercial structures, roadway paving, and large compound grading.",
    "base_lat": 22.531,
    "base_lng": 114.048,
    "center": [
      22.531,
      114.048
    ],
    "total_changed_px": 101730,
    "change_pct": 9.7,
    "total_area_m2": 25432.5,
    "total_area_km2": 0.02543,
    "tile_width_km": 0.512,
    "tile_height_km": 0.512,
    "tile_area_km2": 0.2621,
    "max_dist_km": 0.276,
    "max_dist_m": 276,
    "cluster_count": 6,
    "explanation": "Automated Siamese-CD neural inference detected 6 distinct change clusters across the 0.512 km × 0.512 km observation tile (0.2621 km² total footprint).\n\n• Total Changed Footprint: 25,432 m² (0.0254 km²), representing 9.7% of the surveyed surface.\n• Spatial Distance Span: Visible changes span a direct linear distance of 0.276 km (276 meters) across the sector.\n• Identified Features: Structural building foundation footprints, new roofing envelopes, and connected impervious transport surfaces.\n• Sensor Metric: Ground Sampling Distance (GSD) calibrated at 0.50m/pixel with sub-pixel boundary refinement.",
    "pre_image_url": "/database_samples/test_10/pre.png",
    "post_image_url": "/database_samples/test_10/post.png",
    "mask_image_url": "/database_samples/test_10/mask.png",
    "highlighted_image_url": "/database_samples/test_10/highlighted.png",
    "annotated_image_url": "/database_samples/test_10/annotated.png",
    "clusters": [
      {
        "id": "clus_1",
        "label": "Cluster #1 (440.0m × 288.0m)",
        "category": "building",
        "confidence": 91,
        "area_m2": 22812.8,
        "area_km2": 0.022813,
        "span_m": 440,
        "span_km": 0.44,
        "bbox_px": [
          144,
          448,
          1024,
          1024
        ],
        "bbox": [
          22.52869,
          114.04621,
          22.53129,
          114.0505
        ]
      },
      {
        "id": "clus_2",
        "label": "Cluster #2 (224.0m × 152.0m)",
        "category": "infrastructure",
        "confidence": 92.2,
        "area_m2": 7544,
        "area_km2": 0.007544,
        "span_m": 224,
        "span_km": 0.224,
        "bbox_px": [
          0,
          720,
          448,
          1024
        ],
        "bbox": [
          22.52869,
          114.0455,
          22.53006,
          114.04769
        ]
      },
      {
        "id": "clus_3",
        "label": "Cluster #3 (136.0m × 144.0m)",
        "category": "building",
        "confidence": 93.4,
        "area_m2": 4506.5,
        "area_km2": 0.004507,
        "span_m": 144,
        "span_km": 0.144,
        "bbox_px": [
          640,
          736,
          912,
          1024
        ],
        "bbox": [
          22.52869,
          114.04862,
          22.52999,
          114.04995
        ]
      },
      {
        "id": "clus_4",
        "label": "Cluster #4 (32.0m × 24.0m)",
        "category": "infrastructure",
        "confidence": 94.6,
        "area_m2": 269.2,
        "area_km2": 0.000269,
        "span_m": 32,
        "span_km": 0.032,
        "bbox_px": [
          496,
          976,
          560,
          1024
        ],
        "bbox": [
          22.52869,
          114.04792,
          22.52891,
          114.04823
        ]
      },
      {
        "id": "clus_5",
        "label": "Cluster #5 (24.0m × 24.0m)",
        "category": "building",
        "confidence": 95.8,
        "area_m2": 267.5,
        "area_km2": 0.000267,
        "span_m": 24,
        "span_km": 0.024,
        "bbox_px": [
          656,
          672,
          704,
          720
        ],
        "bbox": [
          22.53006,
          114.0487,
          22.53028,
          114.04894
        ]
      },
      {
        "id": "clus_6",
        "label": "Cluster #6 (24.0m × 24.0m)",
        "category": "infrastructure",
        "confidence": 97,
        "area_m2": 231,
        "area_km2": 0.000231,
        "span_m": 24,
        "span_km": 0.024,
        "bbox_px": [
          720,
          688,
          768,
          736
        ],
        "bbox": [
          22.52999,
          114.04901,
          22.53021,
          114.04925
        ]
      }
    ]
  },
  {
    "id": "test_14",
    "title": "Industrial Logistics Depot Expansion",
    "category": "Industrial Facilities",
    "location": "Southern Port Freight Complex",
    "query": "Highlight large-scale industrial warehouses, loading docks, and concrete tarmac expansion.",
    "base_lat": 22.522,
    "base_lng": 114.038,
    "center": [
      22.522,
      114.038
    ],
    "total_changed_px": 113492,
    "change_pct": 10.82,
    "total_area_m2": 28373,
    "total_area_km2": 0.02837,
    "tile_width_km": 0.512,
    "tile_height_km": 0.512,
    "tile_area_km2": 0.2621,
    "max_dist_km": 0.274,
    "max_dist_m": 274.4,
    "cluster_count": 10,
    "explanation": "Automated Siamese-CD neural inference detected 10 distinct change clusters across the 0.512 km × 0.512 km observation tile (0.2621 km² total footprint).\n\n• Total Changed Footprint: 28,373 m² (0.0284 km²), representing 10.82% of the surveyed surface.\n• Spatial Distance Span: Visible changes span a direct linear distance of 0.274 km (274 meters) across the sector.\n• Identified Features: Structural building foundation footprints, new roofing envelopes, and connected impervious transport surfaces.\n• Sensor Metric: Ground Sampling Distance (GSD) calibrated at 0.50m/pixel with sub-pixel boundary refinement.",
    "pre_image_url": "/database_samples/test_14/pre.png",
    "post_image_url": "/database_samples/test_14/post.png",
    "mask_image_url": "/database_samples/test_14/mask.png",
    "highlighted_image_url": "/database_samples/test_14/highlighted.png",
    "annotated_image_url": "/database_samples/test_14/annotated.png",
    "clusters": [
      {
        "id": "clus_1",
        "label": "Cluster #1 (320.0m × 440.0m)",
        "category": "building",
        "confidence": 91,
        "area_m2": 26665.5,
        "area_km2": 0.026666,
        "span_m": 440,
        "span_km": 0.44,
        "bbox_px": [
          0,
          112,
          640,
          992
        ],
        "bbox": [
          22.51984,
          114.0355,
          22.5238,
          114.03862
        ]
      },
      {
        "id": "clus_2",
        "label": "Cluster #2 (168.0m × 96.0m)",
        "category": "infrastructure",
        "confidence": 92.2,
        "area_m2": 4201,
        "area_km2": 0.004201,
        "span_m": 168,
        "span_km": 0.168,
        "bbox_px": [
          208,
          208,
          544,
          400
        ],
        "bbox": [
          22.5225,
          114.03652,
          22.52337,
          114.03816
        ]
      },
      {
        "id": "clus_3",
        "label": "Cluster #3 (144.0m × 96.0m)",
        "category": "building",
        "confidence": 93.4,
        "area_m2": 3258.8,
        "area_km2": 0.003259,
        "span_m": 144,
        "span_km": 0.144,
        "bbox_px": [
          0,
          0,
          288,
          192
        ],
        "bbox": [
          22.52344,
          114.0355,
          22.52431,
          114.03691
        ]
      },
      {
        "id": "clus_4",
        "label": "Cluster #4 (128.0m × 80.0m)",
        "category": "infrastructure",
        "confidence": 94.6,
        "area_m2": 2808.8,
        "area_km2": 0.002809,
        "span_m": 128,
        "span_km": 0.128,
        "bbox_px": [
          240,
          368,
          496,
          528
        ],
        "bbox": [
          22.52193,
          114.03667,
          22.52265,
          114.03792
        ]
      },
      {
        "id": "clus_5",
        "label": "Cluster #5 (112.0m × 80.0m)",
        "category": "building",
        "confidence": 95.8,
        "area_m2": 2707.8,
        "area_km2": 0.002708,
        "span_m": 112,
        "span_km": 0.112,
        "bbox_px": [
          0,
          384,
          224,
          544
        ],
        "bbox": [
          22.52186,
          114.0355,
          22.52258,
          114.0366
        ]
      },
      {
        "id": "clus_6",
        "label": "Cluster #6 (112.0m × 40.0m)",
        "category": "infrastructure",
        "confidence": 97,
        "area_m2": 1325.5,
        "area_km2": 0.001326,
        "span_m": 112,
        "span_km": 0.112,
        "bbox_px": [
          80,
          528,
          304,
          608
        ],
        "bbox": [
          22.52157,
          114.03589,
          22.52193,
          114.03699
        ]
      },
      {
        "id": "clus_7",
        "label": "Cluster #7 (96.0m × 40.0m)",
        "category": "building",
        "confidence": 98.2,
        "area_m2": 1198.5,
        "area_km2": 0.001198,
        "span_m": 96,
        "span_km": 0.096,
        "bbox_px": [
          0,
          304,
          192,
          384
        ],
        "bbox": [
          22.52258,
          114.0355,
          22.52294,
          114.03644
        ]
      },
      {
        "id": "clus_8",
        "label": "Cluster #8 (80.0m × 48.0m)",
        "category": "infrastructure",
        "confidence": 91,
        "area_m2": 1143.8,
        "area_km2": 0.001144,
        "span_m": 80,
        "span_km": 0.08,
        "bbox_px": [
          0,
          208,
          160,
          304
        ],
        "bbox": [
          22.52294,
          114.0355,
          22.52337,
          114.03628
        ]
      },
      {
        "id": "clus_9",
        "label": "Cluster #9 (104.0m × 48.0m)",
        "category": "building",
        "confidence": 92.2,
        "area_m2": 1130,
        "area_km2": 0.00113,
        "span_m": 104,
        "span_km": 0.104,
        "bbox_px": [
          112,
          592,
          320,
          688
        ],
        "bbox": [
          22.52121,
          114.03605,
          22.52164,
          114.03706
        ]
      },
      {
        "id": "clus_10",
        "label": "Cluster #10 (32.0m × 24.0m)",
        "category": "infrastructure",
        "confidence": 93.4,
        "area_m2": 327.5,
        "area_km2": 0.000327,
        "span_m": 32,
        "span_km": 0.032,
        "bbox_px": [
          176,
          208,
          240,
          256
        ],
        "bbox": [
          22.52315,
          114.03636,
          22.52337,
          114.03667
        ]
      }
    ]
  },
  {
    "id": "test_28",
    "title": "Highway & Grading Infrastructure Additions",
    "category": "Transportation & Civil Works",
    "location": "West Highway Interchange Zone",
    "query": "Identify transportation corridor clearing, highway grading, and arterial additions.",
    "base_lat": 22.556,
    "base_lng": 114.029,
    "center": [
      22.556,
      114.029
    ],
    "total_changed_px": 102801,
    "change_pct": 9.8,
    "total_area_m2": 25700.2,
    "total_area_km2": 0.0257,
    "tile_width_km": 0.512,
    "tile_height_km": 0.512,
    "tile_area_km2": 0.2621,
    "max_dist_km": 0.634,
    "max_dist_m": 634,
    "cluster_count": 17,
    "explanation": "Automated Siamese-CD neural inference detected 17 distinct change clusters across the 0.512 km × 0.512 km observation tile (0.2621 km² total footprint).\n\n• Total Changed Footprint: 25,700 m² (0.0257 km²), representing 9.8% of the surveyed surface.\n• Spatial Distance Span: Visible changes span a direct linear distance of 0.634 km (634 meters) across the sector.\n• Identified Features: Structural building foundation footprints, new roofing envelopes, and connected impervious transport surfaces.\n• Sensor Metric: Ground Sampling Distance (GSD) calibrated at 0.50m/pixel with sub-pixel boundary refinement.",
    "pre_image_url": "/database_samples/test_28/pre.png",
    "post_image_url": "/database_samples/test_28/post.png",
    "mask_image_url": "/database_samples/test_28/mask.png",
    "highlighted_image_url": "/database_samples/test_28/highlighted.png",
    "annotated_image_url": "/database_samples/test_28/annotated.png",
    "clusters": [
      {
        "id": "clus_1",
        "label": "Cluster #1 (232.0m × 112.0m)",
        "category": "building",
        "confidence": 91,
        "area_m2": 6856.8,
        "area_km2": 0.006857,
        "span_m": 232,
        "span_km": 0.232,
        "bbox_px": [
          112,
          800,
          576,
          1024
        ],
        "bbox": [
          22.55369,
          114.02705,
          22.5547,
          114.02931
        ]
      },
      {
        "id": "clus_2",
        "label": "Cluster #2 (192.0m × 144.0m)",
        "category": "infrastructure",
        "confidence": 92.2,
        "area_m2": 6721.8,
        "area_km2": 0.006722,
        "span_m": 192,
        "span_km": 0.192,
        "bbox_px": [
          208,
          640,
          592,
          928
        ],
        "bbox": [
          22.55413,
          114.02752,
          22.55542,
          114.02939
        ]
      },
      {
        "id": "clus_3",
        "label": "Cluster #3 (240.0m × 128.0m)",
        "category": "building",
        "confidence": 93.4,
        "area_m2": 5612,
        "area_km2": 0.005612,
        "span_m": 240,
        "span_km": 0.24,
        "bbox_px": [
          528,
          672,
          1008,
          928
        ],
        "bbox": [
          22.55413,
          114.02908,
          22.55528,
          114.03142
        ]
      },
      {
        "id": "clus_4",
        "label": "Cluster #4 (152.0m × 88.0m)",
        "category": "infrastructure",
        "confidence": 94.6,
        "area_m2": 2967.2,
        "area_km2": 0.002967,
        "span_m": 152,
        "span_km": 0.152,
        "bbox_px": [
          112,
          464,
          416,
          640
        ],
        "bbox": [
          22.55542,
          114.02705,
          22.55622,
          114.02853
        ]
      },
      {
        "id": "clus_5",
        "label": "Cluster #5 (112.0m × 80.0m)",
        "category": "building",
        "confidence": 95.8,
        "area_m2": 2539.5,
        "area_km2": 0.00254,
        "span_m": 112,
        "span_km": 0.112,
        "bbox_px": [
          0,
          512,
          224,
          672
        ],
        "bbox": [
          22.55528,
          114.0265,
          22.556,
          114.0276
        ]
      },
      {
        "id": "clus_6",
        "label": "Cluster #6 (112.0m × 80.0m)",
        "category": "infrastructure",
        "confidence": 97,
        "area_m2": 2374,
        "area_km2": 0.002374,
        "span_m": 112,
        "span_km": 0.112,
        "bbox_px": [
          608,
          864,
          832,
          1024
        ],
        "bbox": [
          22.55369,
          114.02947,
          22.55441,
          114.03056
        ]
      },
      {
        "id": "clus_7",
        "label": "Cluster #7 (88.0m × 64.0m)",
        "category": "building",
        "confidence": 98.2,
        "area_m2": 1311.8,
        "area_km2": 0.001312,
        "span_m": 88,
        "span_km": 0.088,
        "bbox_px": [
          0,
          624,
          176,
          752
        ],
        "bbox": [
          22.55492,
          114.0265,
          22.5555,
          114.02736
        ]
      },
      {
        "id": "clus_8",
        "label": "Cluster #8 (72.0m × 72.0m)",
        "category": "infrastructure",
        "confidence": 91,
        "area_m2": 1226.2,
        "area_km2": 0.001226,
        "span_m": 72,
        "span_km": 0.072,
        "bbox_px": [
          0,
          720,
          144,
          864
        ],
        "bbox": [
          22.55441,
          114.0265,
          22.55506,
          114.02721
        ]
      },
      {
        "id": "clus_9",
        "label": "Cluster #9 (64.0m × 56.0m)",
        "category": "building",
        "confidence": 92.2,
        "area_m2": 1001.2,
        "area_km2": 0.001001,
        "span_m": 64,
        "span_km": 0.064,
        "bbox_px": [
          896,
          16,
          1024,
          128
        ],
        "bbox": [
          22.55773,
          114.03087,
          22.55823,
          114.0315
        ]
      },
      {
        "id": "clus_10",
        "label": "Cluster #10 (40.0m × 64.0m)",
        "category": "infrastructure",
        "confidence": 93.4,
        "area_m2": 802.5,
        "area_km2": 0.000803,
        "span_m": 64,
        "span_km": 0.064,
        "bbox_px": [
          0,
          880,
          80,
          1008
        ],
        "bbox": [
          22.55377,
          114.0265,
          22.55434,
          114.02689
        ]
      },
      {
        "id": "clus_11",
        "label": "Cluster #11 (48.0m × 40.0m)",
        "category": "building",
        "confidence": 94.6,
        "area_m2": 565.8,
        "area_km2": 0.000566,
        "span_m": 48,
        "span_km": 0.048,
        "bbox_px": [
          0,
          416,
          96,
          496
        ],
        "bbox": [
          22.55607,
          114.0265,
          22.55643,
          114.02697
        ]
      },
      {
        "id": "clus_12",
        "label": "Cluster #12 (40.0m × 40.0m)",
        "category": "infrastructure",
        "confidence": 95.8,
        "area_m2": 456.5,
        "area_km2": 0.000456,
        "span_m": 40,
        "span_km": 0.04,
        "bbox_px": [
          832,
          928,
          912,
          1008
        ],
        "bbox": [
          22.55377,
          114.03056,
          22.55413,
          114.03095
        ]
      }
    ]
  },
  {
    "id": "test_42",
    "title": "Commercial Foundation Footprints",
    "category": "Commercial Construction",
    "location": "Central Tech Innovation Hub",
    "query": "Isolate all structural additions and concrete foundation footprints across commercial plots.",
    "base_lat": 22.538,
    "base_lng": 114.059,
    "center": [
      22.538,
      114.059
    ],
    "total_changed_px": 54584,
    "change_pct": 5.21,
    "total_area_m2": 13646,
    "total_area_km2": 0.01365,
    "tile_width_km": 0.512,
    "tile_height_km": 0.512,
    "tile_area_km2": 0.2621,
    "max_dist_km": 0.48,
    "max_dist_m": 479.5,
    "cluster_count": 11,
    "explanation": "Automated Siamese-CD neural inference detected 11 distinct change clusters across the 0.512 km × 0.512 km observation tile (0.2621 km² total footprint).\n\n• Total Changed Footprint: 13,646 m² (0.0137 km²), representing 5.21% of the surveyed surface.\n• Spatial Distance Span: Visible changes span a direct linear distance of 0.48 km (480 meters) across the sector.\n• Identified Features: Structural building foundation footprints, new roofing envelopes, and connected impervious transport surfaces.\n• Sensor Metric: Ground Sampling Distance (GSD) calibrated at 0.50m/pixel with sub-pixel boundary refinement.",
    "pre_image_url": "/database_samples/test_42/pre.png",
    "post_image_url": "/database_samples/test_42/post.png",
    "mask_image_url": "/database_samples/test_42/mask.png",
    "highlighted_image_url": "/database_samples/test_42/highlighted.png",
    "annotated_image_url": "/database_samples/test_42/annotated.png",
    "clusters": [
      {
        "id": "clus_1",
        "label": "Cluster #1 (232.0m × 144.0m)",
        "category": "building",
        "confidence": 91,
        "area_m2": 7481,
        "area_km2": 0.007481,
        "span_m": 232,
        "span_km": 0.232,
        "bbox_px": [
          560,
          512,
          1024,
          800
        ],
        "bbox": [
          22.5367,
          114.05923,
          22.538,
          114.0615
        ]
      },
      {
        "id": "clus_2",
        "label": "Cluster #2 (168.0m × 112.0m)",
        "category": "infrastructure",
        "confidence": 92.2,
        "area_m2": 4691.8,
        "area_km2": 0.004692,
        "span_m": 168,
        "span_km": 0.168,
        "bbox_px": [
          688,
          480,
          1024,
          704
        ],
        "bbox": [
          22.53714,
          114.05986,
          22.53814,
          114.0615
        ]
      },
      {
        "id": "clus_3",
        "label": "Cluster #3 (224.0m × 88.0m)",
        "category": "building",
        "confidence": 93.4,
        "area_m2": 3063.8,
        "area_km2": 0.003064,
        "span_m": 224,
        "span_km": 0.224,
        "bbox_px": [
          64,
          432,
          512,
          608
        ],
        "bbox": [
          22.53757,
          114.05682,
          22.53836,
          114.059
        ]
      },
      {
        "id": "clus_4",
        "label": "Cluster #4 (120.0m × 88.0m)",
        "category": "infrastructure",
        "confidence": 94.6,
        "area_m2": 2118.8,
        "area_km2": 0.002119,
        "span_m": 120,
        "span_km": 0.12,
        "bbox_px": [
          784,
          368,
          1024,
          544
        ],
        "bbox": [
          22.53786,
          114.06033,
          22.53865,
          114.0615
        ]
      },
      {
        "id": "clus_5",
        "label": "Cluster #5 (88.0m × 80.0m)",
        "category": "building",
        "confidence": 95.8,
        "area_m2": 1445,
        "area_km2": 0.001445,
        "span_m": 88,
        "span_km": 0.088,
        "bbox_px": [
          0,
          544,
          176,
          704
        ],
        "bbox": [
          22.53714,
          114.0565,
          22.53786,
          114.05736
        ]
      },
      {
        "id": "clus_6",
        "label": "Cluster #6 (48.0m × 48.0m)",
        "category": "infrastructure",
        "confidence": 97,
        "area_m2": 598.2,
        "area_km2": 0.000598,
        "span_m": 48,
        "span_km": 0.048,
        "bbox_px": [
          0,
          512,
          96,
          608
        ],
        "bbox": [
          22.53757,
          114.0565,
          22.538,
          114.05697
        ]
      },
      {
        "id": "clus_7",
        "label": "Cluster #7 (16.0m × 24.0m)",
        "category": "building",
        "confidence": 98.2,
        "area_m2": 153.5,
        "area_km2": 0.000153,
        "span_m": 24,
        "span_km": 0.024,
        "bbox_px": [
          0,
          208,
          32,
          256
        ],
        "bbox": [
          22.53915,
          114.0565,
          22.53937,
          114.05666
        ]
      },
      {
        "id": "clus_8",
        "label": "Cluster #8 (16.0m × 16.0m)",
        "category": "infrastructure",
        "confidence": 91,
        "area_m2": 78.5,
        "area_km2": 0.000078,
        "span_m": 16,
        "span_km": 0.016,
        "bbox_px": [
          800,
          256,
          832,
          288
        ],
        "bbox": [
          22.53901,
          114.0604,
          22.53915,
          114.06056
        ]
      },
      {
        "id": "clus_9",
        "label": "Cluster #9 (16.0m × 16.0m)",
        "category": "building",
        "confidence": 92.2,
        "area_m2": 70,
        "area_km2": 0.00007,
        "span_m": 16,
        "span_km": 0.016,
        "bbox_px": [
          32,
          128,
          64,
          160
        ],
        "bbox": [
          22.53959,
          114.05666,
          22.53973,
          114.05682
        ]
      },
      {
        "id": "clus_10",
        "label": "Cluster #10 (16.0m × 16.0m)",
        "category": "infrastructure",
        "confidence": 93.4,
        "area_m2": 34.8,
        "area_km2": 0.000035,
        "span_m": 16,
        "span_km": 0.016,
        "bbox_px": [
          848,
          256,
          880,
          288
        ],
        "bbox": [
          22.53901,
          114.06064,
          22.53915,
          114.06079
        ]
      },
      {
        "id": "clus_11",
        "label": "Cluster #11 (8.0m × 16.0m)",
        "category": "building",
        "confidence": 94.6,
        "area_m2": 20.5,
        "area_km2": 0.000021,
        "span_m": 16,
        "span_km": 0.016,
        "bbox_px": [
          0,
          128,
          16,
          160
        ],
        "bbox": [
          22.53959,
          114.0565,
          22.53973,
          114.05658
        ]
      }
    ]
  },
  {
    "id": "test_100",
    "title": "Sprawling Multi-Quadrant Urban Transformation",
    "category": "Mixed-Use Urbanization",
    "location": "Northern Riverfront Re-development",
    "query": "Comprehensive change audit: isolate all new buildings, road corridors, and cleared land parcels.",
    "base_lat": 22.565,
    "base_lng": 114.072,
    "center": [
      22.565,
      114.072
    ],
    "total_changed_px": 118843,
    "change_pct": 11.33,
    "total_area_m2": 29710.8,
    "total_area_km2": 0.02971,
    "tile_width_km": 0.512,
    "tile_height_km": 0.512,
    "tile_area_km2": 0.2621,
    "max_dist_km": 0.546,
    "max_dist_m": 545.7,
    "cluster_count": 19,
    "explanation": "Automated Siamese-CD neural inference detected 19 distinct change clusters across the 0.512 km × 0.512 km observation tile (0.2621 km² total footprint).\n\n• Total Changed Footprint: 29,711 m² (0.0297 km²), representing 11.33% of the surveyed surface.\n• Spatial Distance Span: Visible changes span a direct linear distance of 0.546 km (546 meters) across the sector.\n• Identified Features: Structural building foundation footprints, new roofing envelopes, and connected impervious transport surfaces.\n• Sensor Metric: Ground Sampling Distance (GSD) calibrated at 0.50m/pixel with sub-pixel boundary refinement.",
    "pre_image_url": "/database_samples/test_100/pre.png",
    "post_image_url": "/database_samples/test_100/post.png",
    "mask_image_url": "/database_samples/test_100/mask.png",
    "highlighted_image_url": "/database_samples/test_100/highlighted.png",
    "annotated_image_url": "/database_samples/test_100/annotated.png",
    "clusters": [
      {
        "id": "clus_1",
        "label": "Cluster #1 (344.0m × 224.0m)",
        "category": "building",
        "confidence": 91,
        "area_m2": 17902.5,
        "area_km2": 0.017902,
        "span_m": 344,
        "span_km": 0.344,
        "bbox_px": [
          272,
          576,
          960,
          1024
        ],
        "bbox": [
          22.56269,
          114.07083,
          22.56471,
          114.07419
        ]
      },
      {
        "id": "clus_2",
        "label": "Cluster #2 (184.0m × 120.0m)",
        "category": "infrastructure",
        "confidence": 92.2,
        "area_m2": 6333.5,
        "area_km2": 0.006333,
        "span_m": 184,
        "span_km": 0.184,
        "bbox_px": [
          464,
          784,
          832,
          1024
        ],
        "bbox": [
          22.56269,
          114.07177,
          22.56377,
          114.07356
        ]
      },
      {
        "id": "clus_3",
        "label": "Cluster #3 (168.0m × 232.0m)",
        "category": "building",
        "confidence": 93.4,
        "area_m2": 6103.2,
        "area_km2": 0.006103,
        "span_m": 232,
        "span_km": 0.232,
        "bbox_px": [
          624,
          32,
          960,
          496
        ],
        "bbox": [
          22.56507,
          114.07255,
          22.56716,
          114.07419
        ]
      },
      {
        "id": "clus_4",
        "label": "Cluster #4 (200.0m × 104.0m)",
        "category": "infrastructure",
        "confidence": 94.6,
        "area_m2": 5953.8,
        "area_km2": 0.005954,
        "span_m": 200,
        "span_km": 0.2,
        "bbox_px": [
          592,
          512,
          992,
          720
        ],
        "bbox": [
          22.56406,
          114.07239,
          22.565,
          114.07434
        ]
      },
      {
        "id": "clus_5",
        "label": "Cluster #5 (160.0m × 88.0m)",
        "category": "building",
        "confidence": 95.8,
        "area_m2": 4688.8,
        "area_km2": 0.004689,
        "span_m": 160,
        "span_km": 0.16,
        "bbox_px": [
          592,
          672,
          912,
          848
        ],
        "bbox": [
          22.56349,
          114.07239,
          22.56428,
          114.07395
        ]
      },
      {
        "id": "clus_6",
        "label": "Cluster #6 (168.0m × 88.0m)",
        "category": "infrastructure",
        "confidence": 97,
        "area_m2": 4571.8,
        "area_km2": 0.004572,
        "span_m": 168,
        "span_km": 0.168,
        "bbox_px": [
          544,
          736,
          880,
          912
        ],
        "bbox": [
          22.5632,
          114.07216,
          22.56399,
          114.0738
        ]
      },
      {
        "id": "clus_7",
        "label": "Cluster #7 (160.0m × 96.0m)",
        "category": "building",
        "confidence": 98.2,
        "area_m2": 4343,
        "area_km2": 0.004343,
        "span_m": 160,
        "span_km": 0.16,
        "bbox_px": [
          704,
          464,
          1024,
          656
        ],
        "bbox": [
          22.56435,
          114.07294,
          22.56522,
          114.0745
        ]
      },
      {
        "id": "clus_8",
        "label": "Cluster #8 (136.0m × 80.0m)",
        "category": "infrastructure",
        "confidence": 91,
        "area_m2": 3304.2,
        "area_km2": 0.003304,
        "span_m": 136,
        "span_km": 0.136,
        "bbox_px": [
          752,
          416,
          1024,
          576
        ],
        "bbox": [
          22.56471,
          114.07317,
          22.56543,
          114.0745
        ]
      },
      {
        "id": "clus_9",
        "label": "Cluster #9 (120.0m × 72.0m)",
        "category": "building",
        "confidence": 92.2,
        "area_m2": 2640.5,
        "area_km2": 0.002641,
        "span_m": 120,
        "span_km": 0.12,
        "bbox_px": [
          784,
          352,
          1024,
          496
        ],
        "bbox": [
          22.56507,
          114.07333,
          22.56572,
          114.0745
        ]
      },
      {
        "id": "clus_10",
        "label": "Cluster #10 (96.0m × 56.0m)",
        "category": "infrastructure",
        "confidence": 93.4,
        "area_m2": 1647.8,
        "area_km2": 0.001648,
        "span_m": 96,
        "span_km": 0.096,
        "bbox_px": [
          832,
          288,
          1024,
          400
        ],
        "bbox": [
          22.5655,
          114.07356,
          22.56601,
          114.0745
        ]
      },
      {
        "id": "clus_11",
        "label": "Cluster #11 (72.0m × 48.0m)",
        "category": "building",
        "confidence": 94.6,
        "area_m2": 982.8,
        "area_km2": 0.000983,
        "span_m": 72,
        "span_km": 0.072,
        "bbox_px": [
          880,
          224,
          1024,
          320
        ],
        "bbox": [
          22.56586,
          114.0738,
          22.5663,
          114.0745
        ]
      },
      {
        "id": "clus_12",
        "label": "Cluster #12 (64.0m × 40.0m)",
        "category": "infrastructure",
        "confidence": 95.8,
        "area_m2": 701.8,
        "area_km2": 0.000702,
        "span_m": 64,
        "span_km": 0.064,
        "bbox_px": [
          896,
          896,
          1024,
          976
        ],
        "bbox": [
          22.56291,
          114.07387,
          22.56327,
          114.0745
        ]
      }
    ]
  }
];
