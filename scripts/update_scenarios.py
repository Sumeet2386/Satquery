import json

with open("frontend/public/database_samples/catalog.json") as f:
    catalog = json.load(f)

# First git checkout the original mockScenarios.ts to start clean
import subprocess
subprocess.run(["git", "checkout", "frontend/src/constants/mockScenarios.ts"])

with open("frontend/src/constants/mockScenarios.ts") as f:
    content = f.read()

split_marker = "];\n\nexport function findMatchingScenario"
if split_marker not in content:
    print("Error: split marker not found!")
    exit(1)

pre, post = content.split(split_marker)

db_entries = []
for idx, s in enumerate(catalog):
    boxes_code = []
    for c in s["clusters"]:
        boxes_code.append(f"""        {{
          id: "{c['id']}",
          label: "{c['label']}",
          category: "building" if "{c['category']}" == "building" else "infrastructure",
          confidence: {c['confidence']},
          bbox: [{c['bbox'][0]}, {c['bbox'][1]}, {c['bbox'][2]}, {c['bbox'][3]}],
          span_km: {c['span_km']},
          area_m2: {c['area_m2']},
        }}""")
    boxes_str = ",\n".join(boxes_code)
    
    # Escape any backticks or special characters in explanation
    safe_explanation = json.dumps(s["explanation"])

    db_entries.append(f"""  {{
    id: "database-{s['id']}",
    title: "Database Test: {s['title']}",
    description: "Benchmarking pair from Database/test (1). High-resolution 0.5m bi-temporal optical rasters covering {s['tile_width_km']} km × {s['tile_height_km']} km. Detects structural changes spanning {s['max_dist_km']} km.",
    keywords: ["{s['id']}", "database", "{s['id'].replace('_', ' ')}", "{s['category'].lower()}", "{s['location'].lower()}", "levir-cd", "change detection"],
    config_type: "Bi-Temporal Pair",
    files: [
      {{
        id: "{s['id']}_pre",
        filename: "{s['id']}_A_PreEvent.png",
        sensor_hint: "cartosat3",
        bands: 3,
        crs: "EPSG:32650",
        resolution_m: 0.5,
        width: 1024,
        height: 1024,
        acquisition_date: "2022-03-12T04:15:00Z",
        bbox: [{s['base_lat'] - 0.002}, {s['base_lng'] - 0.002}, {s['base_lat'] + 0.002}, {s['base_lng'] + 0.002}],
        center: [{s['base_lat']}, {s['base_lng']}],
        thumbnail_url: "{s['pre_image_url']}",
        data_type: "Optical",
        file_size_mb: 2.1,
      }},
      {{
        id: "{s['id']}_post",
        filename: "{s['id']}_B_PostEvent.png",
        sensor_hint: "cartosat3",
        bands: 3,
        crs: "EPSG:32650",
        resolution_m: 0.5,
        width: 1024,
        height: 1024,
        acquisition_date: "2024-06-20T04:18:22Z",
        bbox: [{s['base_lat'] - 0.002}, {s['base_lng'] - 0.002}, {s['base_lat'] + 0.002}, {s['base_lng'] + 0.002}],
        center: [{s['base_lat']}, {s['base_lng']}],
        thumbnail_url: "{s['post_image_url']}",
        data_type: "Optical",
        file_size_mb: 1.9,
      }},
    ],
    default_query: {json.dumps(s['query'])},
    response: {{
      text: {safe_explanation},
      confidence_tier: "HIGH",
      confidence_score: 95.8,
      scenario_id: "database-{s['id']}",
      execution_trace: [
        {{
          step: 1,
          tool: "load_database_rasters",
          tool_display_name: "Database Raster Pair Ingestion",
          params: {{ source: "Database/test (1)", pair_id: "{s['id']}", gsd: 0.5 }},
          duration_ms: 220,
          status: "success",
          output: {{ resolution: "0.5m/px", dimensions: [1024, 1024], tile_footprint_km2: {s['tile_area_km2']} }},
        }},
        {{
          step: 2,
          tool: "siamese_feature_fusion",
          tool_display_name: "Siamese-CD Differential Neural Backbone",
          params: {{ model: "Siamese-CD (S2Looking/LEVIR)", channels: 3, layers: 4 }},
          duration_ms: 580,
          status: "success",
          output: {{ feature_diff_norm: 0.428, activated_clusters: {s['cluster_count']} }},
        }},
        {{
          step: 3,
          tool: "metric_spatial_distance_quantifier",
          tool_display_name: "Metric Distance & Cluster Quantifier",
          params: {{ gsd_m: 0.5, metric_units: "km" }},
          duration_ms: 310,
          status: "success",
          output: {{ max_span_km: {s['max_dist_km']}, max_span_m: {s['max_dist_m']}, total_changed_m2: {s['total_area_m2']} }},
        }},
        {{
          step: 4,
          tool: "render_highlighted_overlay",
          tool_display_name: "Highlight Overlay & Boundary Renderer",
          params: {{ overlay_color: "#e07856", outline_width: 3 }},
          duration_ms: 190,
          status: "success",
          output: {{ status: "rendered", clusters_annotated: {s['cluster_count']} }},
        }},
      ],
      change_stats: {{
        baseline_area_km2: {s['tile_area_km2']},
        changed_area_km2: {s['total_area_km2']},
        change_ratio: {round(s['change_pct'] / 100.0, 4)},
        change_type: "{s['category']}",
        confidence: 95.8,
        breakdown: [
          {{ category: "Structural Additions", area_km2: {round(s['total_area_km2'] * 0.65, 4)}, percentage: 65 }},
          {{ category: "Ground Grading & Access", area_km2: {round(s['total_area_km2'] * 0.25, 4)}, percentage: 25 }},
          {{ category: "Boundary Alteration", area_km2: {round(s['total_area_km2'] * 0.10, 4)}, percentage: 10 }},
        ],
      }},
      grounding_boxes: [
{boxes_str}
      ],
      has_heatmap: true,
      has_swipe_comparison: true,
      pre_image_url: "{s['pre_image_url']}",
      post_image_url: "{s['post_image_url']}",
      highlighted_image_url: "{s['highlighted_image_url']}",
      annotated_image_url: "{s['annotated_image_url']}",
      mask_image_url: "{s['mask_image_url']}",
      max_dist_km: {s['max_dist_km']},
      total_area_m2: {s['total_area_m2']},
    }},
  }}""")

new_find_matching = """export function findMatchingScenario(query: string, uploadedFilesCount: number, hasSar: boolean): MissionScenario {
  const q = query.toLowerCase();

  for (let i = 3; i < MOCK_SCENARIOS.length; i++) {
    const sc = MOCK_SCENARIOS[i];
    if (sc.keywords.some((k) => q.includes(k.toLowerCase()))) {
      return sc;
    }
  }

  if (q.includes("sar") || q.includes("radar") || q.includes("cloud") || q.includes("fusion") || q.includes("all-weather") || hasSar) {
    return MOCK_SCENARIOS[2];
  }
  
  if (q.includes("flood") || q.includes("change") || q.includes("damage") || q.includes("water") || q.includes("inundation") || q.includes("pre") || q.includes("post") || uploadedFilesCount >= 2) {
    return MOCK_SCENARIOS[1];
  }
  
  return MOCK_SCENARIOS[0];
}
"""

final_code = pre + ",\n" + ",\n".join(db_entries) + "];\n\n" + new_find_matching

with open("frontend/src/constants/mockScenarios.ts", "w") as f:
    f.write(final_code)

print("Cleanly updated frontend/src/constants/mockScenarios.ts!")

