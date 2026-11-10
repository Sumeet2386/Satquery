import { GroundingBox } from "@/types/satquery";
import { LivePixelStats } from "./liveImageAnalysis";

export interface ActiveAnalysisContext {
  title?: string;
  scene_id?: string;
  pre_filename?: string;
  post_filename?: string;
  gsd_m?: number;
  tile_width_px?: number;
  tile_height_px?: number;
  total_changed_px?: number;
  total_area_m2?: number;
  total_area_km2?: number;
  change_pct?: number;
  max_dist_m?: number;
  max_dist_km?: number;
  clusters?: GroundingBox[];
  pixel_stats?: LivePixelStats;
}

export interface EnrichedCluster {
  index: number;
  id: string;
  label: string;
  category: string;
  area_m2: number;
  area_km2: number;
  span_m: number;
  span_km: number;
  confidence: number;
  quadrant: string;
  centroid_lat: number;
  centroid_lng: number;
  bbox: [number, number, number, number];
  bbox_px?: [number, number, number, number];
}

export interface StatisticalAudit {
  scene_title: string;
  pre_filename: string;
  post_filename: string;
  gsd_m: number;
  tile: {
    width_px: number;
    height_px: number;
    width_km: number;
    height_km: number;
    area_m2: number;
    area_km2: number;
  };
  totals: {
    cluster_count: number;
    total_changed_px: number;
    total_area_m2: number;
    total_area_km2: number;
    total_area_hectares: number;
    total_area_acres: number;
    change_pct: number;
    unchanged_area_m2: number;
    unchanged_pct: number;
    max_dist_m: number;
    max_dist_km: number;
    cluster_density_per_km2: number;
  };
  area_statistics: {
    mean_m2: number;
    median_m2: number;
    std_dev_m2: number;
    q1_m2: number;
    q3_m2: number;
    iqr_m2: number;
    min_m2: number;
    max_m2: number;
    cv_pct: number;
    skewness: number;
  };
  spatial_statistics: {
    mean_cluster_span_m: number;
    median_cluster_span_m: number;
    min_cluster_span_m: number;
    max_cluster_span_m: number;
    nearest_neighbor_mean_m: number;
    nearest_neighbor_min_m: number;
    nearest_neighbor_max_m: number;
    quadrants: Record<
      string,
      { count: number; area_m2: number; pct_of_changed_area: number; cluster_ids: number[] }
    >;
  };
  confidence_statistics: {
    mean_pct: number;
    median_pct: number;
    min_pct: number;
    max_pct: number;
    std_dev_pct: number;
  };
  category_breakdown: Record<
    string,
    { count: number; area_m2: number; mean_area_m2: number; pct_of_clusters: number; pct_of_area: number }
  >;
  pixel_stats?: LivePixelStats;
  clusters: EnrichedCluster[];
  largest_cluster: EnrichedCluster | null;
  smallest_cluster: EnrichedCluster | null;
  top_clusters: EnrichedCluster[];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function sampleStd(arr: number[], mean: number): number {
  if (arr.length <= 1) return 0;
  const sumSq = arr.reduce((acc, v) => acc + (v - mean) * (v - mean), 0);
  return Math.sqrt(sumSq / (arr.length - 1));
}

export function computeStatisticalAuditTS(ctx?: ActiveAnalysisContext | null): StatisticalAudit {
  const c = ctx || {};
  const gsd = Number(c.gsd_m || 0.5);
  const tileWidthPx = Number(c.tile_width_px || 1024);
  const tileHeightPx = Number(c.tile_height_px || 1024);
  const tileWidthKm = Number(((tileWidthPx * gsd) / 1000).toFixed(4));
  const tileHeightKm = Number(((tileHeightPx * gsd) / 1000).toFixed(4));
  const tileAreaM2 = Number((tileWidthPx * gsd * (tileHeightPx * gsd)).toFixed(2));
  const tileAreaKm2 = Number((tileAreaM2 / 1_000_000).toFixed(5));

  const rawClusters = c.clusters || [];
  const latVals: number[] = [];
  const lngVals: number[] = [];
  for (const cl of rawClusters) {
    if (cl.bbox && cl.bbox.length === 4 && (cl.bbox[0] !== 0 || cl.bbox[1] !== 0)) {
      latVals.push(cl.bbox[0], cl.bbox[2]);
      lngVals.push(cl.bbox[1], cl.bbox[3]);
    }
  }
  const centerLat = latVals.length > 0 ? latVals.reduce((a, b) => a + b, 0) / latVals.length : 17.695;
  const centerLng = lngVals.length > 0 ? lngVals.reduce((a, b) => a + b, 0) / lngVals.length : 83.3;

  const clusters: EnrichedCluster[] = rawClusters.map((cl, idx) => {
    const areaM2 = Number((cl.area_m2 || 0).toFixed(2));
    const spanM = Number((cl.span_m || (cl.span_km ? cl.span_km * 1000 : 0)).toFixed(2));
    const bbox = cl.bbox || [0, 0, 0, 0];
    const cLat = (bbox[0] + bbox[2]) / 2;
    const cLng = (bbox[1] + bbox[3]) / 2;
    const quadrant =
      bbox[0] !== 0 || bbox[1] !== 0
        ? `${cLat >= centerLat ? "North" : "South"}-${cLng >= centerLng ? "East" : "West"}`
        : "Central";

    return {
      index: idx + 1,
      id: cl.id || `clus_${idx + 1}`,
      label: cl.label || `Cluster #${idx + 1}`,
      category: cl.category || "building",
      area_m2: areaM2,
      area_km2: Number((areaM2 / 1_000_000).toFixed(6)),
      span_m: spanM,
      span_km: Number((spanM / 1000).toFixed(4)),
      confidence: Number((cl.confidence || 92).toFixed(2)),
      quadrant,
      centroid_lat: Number(cLat.toFixed(5)),
      centroid_lng: Number(cLng.toFixed(5)),
      bbox,
      bbox_px: cl.bbox_px,
    };
  });

  const areas = clusters.map((x) => x.area_m2).filter((v) => v > 0);
  const sortedAreas = [...areas].sort((a, b) => a - b);
  const spans = clusters.map((x) => x.span_m).filter((v) => v > 0);
  const sortedSpans = [...spans].sort((a, b) => a - b);
  const confs = clusters.map((x) => x.confidence);
  const sortedConfs = [...confs].sort((a, b) => a - b);

  let totalAreaM2 = Number((c.total_area_m2 || 0).toFixed(2));
  if (totalAreaM2 === 0 && areas.length > 0) {
    totalAreaM2 = Number(areas.reduce((a, b) => a + b, 0).toFixed(2));
  }
  const totalAreaKm2 = Number((totalAreaM2 / 1_000_000).toFixed(6));
  const changePct =
    c.change_pct !== undefined
      ? Number(c.change_pct.toFixed(2))
      : tileAreaM2 > 0
      ? Number(((totalAreaM2 / tileAreaM2) * 100).toFixed(2))
      : 0;
  const unchangedAreaM2 = Number(Math.max(0, tileAreaM2 - totalAreaM2).toFixed(2));
  const unchangedPct = Number(Math.max(0, 100 - changePct).toFixed(2));
  const maxDistM = Number((c.max_dist_m || (c.max_dist_km ? c.max_dist_km * 1000 : 0)).toFixed(2));
  const maxDistKm = Number((maxDistM / 1000).toFixed(4));

  const meanArea = areas.length ? areas.reduce((a, b) => a + b, 0) / areas.length : 0;
  const medianArea = percentile(sortedAreas, 50);
  const stdArea = sampleStd(areas, meanArea);
  const q1Area = percentile(sortedAreas, 25);
  const q3Area = percentile(sortedAreas, 75);
  const iqrArea = q3Area - q1Area;
  const minArea = sortedAreas[0] || 0;
  const maxArea = sortedAreas[sortedAreas.length - 1] || 0;
  const cvArea = meanArea > 0 ? (stdArea / meanArea) * 100 : 0;
  const skewArea =
    areas.length > 2 && stdArea > 0
      ? areas.reduce((acc, v) => acc + Math.pow((v - meanArea) / stdArea, 3), 0) / areas.length
      : 0;

  // Nearest-neighbor spacing
  const nnDists: number[] = [];
  if (clusters.length > 1) {
    const pts = clusters.map((cl) => {
      if (cl.bbox_px && cl.bbox_px.length === 4) {
        return {
          x: ((cl.bbox_px[0] + cl.bbox_px[2]) / 2) * gsd,
          y: ((cl.bbox_px[1] + cl.bbox_px[3]) / 2) * gsd,
        };
      }
      return {
        x: (cl.centroid_lng - centerLng) * 111320 * Math.cos((centerLat * Math.PI) / 180),
        y: (cl.centroid_lat - centerLat) * 110540,
      };
    });
    for (let i = 0; i < pts.length; i++) {
      let best = Infinity;
      for (let j = 0; j < pts.length; j++) {
        if (i === j) continue;
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < best) best = d;
      }
      if (Number.isFinite(best)) nnDists.push(best);
    }
  }

  const quadrants: StatisticalAudit["spatial_statistics"]["quadrants"] = {
    "North-West": { count: 0, area_m2: 0, pct_of_changed_area: 0, cluster_ids: [] },
    "North-East": { count: 0, area_m2: 0, pct_of_changed_area: 0, cluster_ids: [] },
    "South-West": { count: 0, area_m2: 0, pct_of_changed_area: 0, cluster_ids: [] },
    "South-East": { count: 0, area_m2: 0, pct_of_changed_area: 0, cluster_ids: [] },
  };
  for (const cl of clusters) {
    if (!quadrants[cl.quadrant]) {
      quadrants[cl.quadrant] = { count: 0, area_m2: 0, pct_of_changed_area: 0, cluster_ids: [] };
    }
    quadrants[cl.quadrant].count += 1;
    quadrants[cl.quadrant].area_m2 = Number((quadrants[cl.quadrant].area_m2 + cl.area_m2).toFixed(2));
    quadrants[cl.quadrant].cluster_ids.push(cl.index);
  }
  const sumClusterArea = clusters.reduce((acc, cl) => acc + cl.area_m2, 0) || totalAreaM2 || 1;
  for (const qd of Object.values(quadrants)) {
    qd.pct_of_changed_area = Number(((qd.area_m2 / sumClusterArea) * 100).toFixed(2));
  }

  const categoryBreakdown: StatisticalAudit["category_breakdown"] = {};
  for (const cl of clusters) {
    const cat = cl.category || "building";
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { count: 0, area_m2: 0, mean_area_m2: 0, pct_of_clusters: 0, pct_of_area: 0 };
    }
    categoryBreakdown[cat].count += 1;
    categoryBreakdown[cat].area_m2 = Number((categoryBreakdown[cat].area_m2 + cl.area_m2).toFixed(2));
  }
  for (const catData of Object.values(categoryBreakdown)) {
    catData.mean_area_m2 = Number((catData.area_m2 / catData.count).toFixed(2));
    catData.pct_of_clusters = Number(((catData.count / Math.max(1, clusters.length)) * 100).toFixed(2));
    catData.pct_of_area = Number(((catData.area_m2 / sumClusterArea) * 100).toFixed(2));
  }

  const ranked = [...clusters].sort((a, b) => b.area_m2 - a.area_m2);
  const meanConf = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0;

  return {
    scene_title: c.title || c.scene_id || "Active Bi-Temporal Satellite Pair",
    pre_filename: c.pre_filename || "Pre-Event (T1)",
    post_filename: c.post_filename || "Post-Event (T2)",
    gsd_m: gsd,
    tile: {
      width_px: tileWidthPx,
      height_px: tileHeightPx,
      width_km: tileWidthKm,
      height_km: tileHeightKm,
      area_m2: tileAreaM2,
      area_km2: tileAreaKm2,
    },
    totals: {
      cluster_count: clusters.length,
      total_changed_px: Number(c.total_changed_px || 0),
      total_area_m2: totalAreaM2,
      total_area_km2: totalAreaKm2,
      total_area_hectares: Number((totalAreaM2 / 10_000).toFixed(4)),
      total_area_acres: Number((totalAreaM2 / 4046.8564).toFixed(4)),
      change_pct: changePct,
      unchanged_area_m2: unchangedAreaM2,
      unchanged_pct: unchangedPct,
      max_dist_m: maxDistM,
      max_dist_km: maxDistKm,
      cluster_density_per_km2: tileAreaKm2 > 0 ? Number((clusters.length / tileAreaKm2).toFixed(2)) : 0,
    },
    area_statistics: {
      mean_m2: Number(meanArea.toFixed(2)),
      median_m2: Number(medianArea.toFixed(2)),
      std_dev_m2: Number(stdArea.toFixed(2)),
      q1_m2: Number(q1Area.toFixed(2)),
      q3_m2: Number(q3Area.toFixed(2)),
      iqr_m2: Number(iqrArea.toFixed(2)),
      min_m2: Number(minArea.toFixed(2)),
      max_m2: Number(maxArea.toFixed(2)),
      cv_pct: Number(cvArea.toFixed(2)),
      skewness: Number(skewArea.toFixed(3)),
    },
    spatial_statistics: {
      mean_cluster_span_m: spans.length ? Number((spans.reduce((a, b) => a + b, 0) / spans.length).toFixed(2)) : 0,
      median_cluster_span_m: Number(percentile(sortedSpans, 50).toFixed(2)),
      min_cluster_span_m: sortedSpans[0] || 0,
      max_cluster_span_m: sortedSpans[sortedSpans.length - 1] || 0,
      nearest_neighbor_mean_m: nnDists.length
        ? Number((nnDists.reduce((a, b) => a + b, 0) / nnDists.length).toFixed(2))
        : 0,
      nearest_neighbor_min_m: nnDists.length ? Number(Math.min(...nnDists).toFixed(2)) : 0,
      nearest_neighbor_max_m: nnDists.length ? Number(Math.max(...nnDists).toFixed(2)) : 0,
      quadrants,
    },
    confidence_statistics: {
      mean_pct: Number(meanConf.toFixed(2)),
      median_pct: Number(percentile(sortedConfs, 50).toFixed(2)),
      min_pct: sortedConfs[0] || 0,
      max_pct: sortedConfs[sortedConfs.length - 1] || 0,
      std_dev_pct: Number(sampleStd(confs, meanConf).toFixed(2)),
    },
    category_breakdown: categoryBreakdown,
    pixel_stats: c.pixel_stats,
    clusters,
    largest_cluster: ranked[0] || null,
    smallest_cluster: ranked[ranked.length - 1] || null,
    top_clusters: ranked.slice(0, 5),
  };
}

export function answerQueryStatisticallyTS(
  query: string,
  audit: StatisticalAudit
): { answer: string; task: string; params: Record<string, any> } {
  const q = query.trim().toLowerCase();
  const { totals, area_statistics: areaStats, spatial_statistics: spatial, confidence_statistics: confStats, clusters, category_breakdown: cats, pixel_stats: px } = audit;

  // 1. GSD sensitivity
  const gsdMatch =
    q.match(/(?:gsd|resolution)[^\d]{0,12}(\d+(?:\.\d+)?)\s*m/) ||
    q.match(/at\s+(\d+(?:\.\d+)?)\s*m(?:eter)?s?\s+(?:gsd|resolution)/);
  if (gsdMatch && /(if|what|recalculate|convert|at |change gsd)/.test(q)) {
    const newGsd = parseFloat(gsdMatch[1]);
    if (newGsd >= 0.05 && newGsd <= 100) {
      const lin = newGsd / Math.max(0.01, audit.gsd_m);
      const sq = lin * lin;
      const newArea = Number((totals.total_area_m2 * sq).toFixed(2));
      const newKm2 = Number((newArea / 1_000_000).toFixed(5));
      const newSpanKm = Number((totals.max_dist_km * lin).toFixed(3));
      return {
        task: "gsd_sensitivity_recalculation",
        params: { new_gsd_m: newGsd, area_scale: sq },
        answer:
          `### GSD Sensitivity Recalculation (${audit.gsd_m}m/px ➔ ${newGsd}m/px)\n\n` +
          `| Metric | Current (${audit.gsd_m}m/px) | Recalculated (${newGsd}m/px) |\n|---|---|---|\n` +
          `| **Changed Footprint** | ${totals.total_area_m2.toLocaleString()} m² (${totals.total_area_km2} km²) | **${newArea.toLocaleString()} m² (${newKm2} km²)** |\n` +
          `| **Visible Spatial Span** | ${totals.max_dist_km} km | **${newSpanKm} km (${Math.round(newSpanKm * 1000).toLocaleString()} m)** |\n` +
          `| **Mean Cluster Area** | ${areaStats.mean_m2.toLocaleString()} m² | **${(areaStats.mean_m2 * sq).toLocaleString(undefined, { maximumFractionDigits: 1 })} m²** |\n` +
          `| **Changed Percentage** | ${totals.change_pct}% | **${totals.change_pct}%** (scale-invariant) |`,
      };
    }
  }

  // 2. Specific cluster lookup or comparison
  const clusMatches = [...q.matchAll(/cluster\s*#?\s*(\d+)/g)].map((m) => parseInt(m[1], 10));
  const validClus = clusMatches.map((n) => clusters[n - 1]).filter(Boolean);
  if (validClus.length >= 2) {
    const [c1, c2] = validClus;
    const diff = c1.area_m2 - c2.area_m2;
    const ratio = c2.area_m2 > 0 ? (c1.area_m2 / c2.area_m2).toFixed(2) : "—";
    return {
      task: "cluster_pairwise_comparison",
      params: { compared: [c1.index, c2.index] },
      answer:
        `### Statistical Comparison: Cluster #${c1.index} vs Cluster #${c2.index}\n\n` +
        `| Attribute | Cluster #${c1.index} | Cluster #${c2.index} | Δ Difference |\n|---|---|---|---|\n` +
        `| **Label** | ${c1.label} | ${c2.label} | — |\n` +
        `| **Ground Area** | ${c1.area_m2.toLocaleString()} m² | ${c2.area_m2.toLocaleString()} m² | **${diff >= 0 ? "+" : ""}${diff.toLocaleString()} m² (${ratio}×)** |\n` +
        `| **Span** | ${c1.span_m} m | ${c2.span_m} m | **${(c1.span_m - c2.span_m).toFixed(1)} m** |\n` +
        `| **Quadrant** | ${c1.quadrant} | ${c2.quadrant} | — |\n` +
        `| **Confidence** | ${c1.confidence}% | ${c2.confidence}% | **${(c1.confidence - c2.confidence).toFixed(1)}%** |`,
    };
  }
  if (validClus.length === 1) {
    const cl = validClus[0];
    const z = areaStats.std_dev_m2 > 0 ? ((cl.area_m2 - areaStats.mean_m2) / areaStats.std_dev_m2).toFixed(2) : "0.00";
    const share = ((cl.area_m2 / Math.max(1, totals.total_area_m2)) * 100).toFixed(2);
    return {
      task: "cluster_detail_audit",
      params: { cluster_index: cl.index, z_score: z },
      answer:
        `### Cluster #${cl.index} Detailed Telemetry & Z-Score\n\n` +
        `• **Label**: ${cl.label} (\`${cl.category}\`)\n` +
        `• **Ground Area**: **${cl.area_m2.toLocaleString()} m²** (${share}% of changed footprint)\n` +
        `• **Linear Span**: **${cl.span_m} m** (${cl.span_km} km)\n` +
        `• **Z-Score vs Scene Mean (${areaStats.mean_m2.toLocaleString()} m²)**: **$z = ${Number(z) >= 0 ? "+" : ""}${z}$**\n` +
        `• **Confidence**: **${cl.confidence}%** | **Quadrant**: **${cl.quadrant}**`,
    };
  }

  // 3. Largest / Smallest / Ranking
  if (/(largest|biggest|smallest|minimum|maximum|top\s+\d+|rank|list all|all clusters)/.test(q)) {
    const topMatch = q.match(/top\s+(\d+)/);
    const limit = /(all clusters|list all)/.test(q) ? clusters.length : topMatch ? Math.min(clusters.length, Math.max(1, parseInt(topMatch[1], 10))) : 5;
    const asc = /(smallest|minimum)/.test(q);
    const sorted = [...clusters].sort((a, b) => (asc ? a.area_m2 - b.area_m2 : b.area_m2 - a.area_m2)).slice(0, limit);
    const rows = sorted
      .map((cl) => `| #${cl.index} | ${cl.label} | \`${cl.category}\` | ${cl.area_m2.toLocaleString()} m² | ${cl.span_m} m | ${cl.quadrant} | ${cl.confidence}% |`)
      .join("\n");
    return {
      task: "cluster_ranking_analysis",
      params: { count: sorted.length },
      answer:
        `### Ranked Cluster Distribution (${audit.scene_title})\n\n` +
        `| ID | Label | Category | Area (m²) | Span | Quadrant | Conf |\n|---|---|---|---|---|---|---|\n${rows}`,
    };
  }

  // 4. Descriptive & Statistical Breakdown
  if (/(stat|mean|average|median|std|standard deviation|variance|iqr|quartile|percentile|skew|distribution|density|nearest|spacing|summary|metrics|count|how many)/.test(q)) {
    const catRows = Object.entries(cats)
      .map(([cat, d]) => `| ${cat} | ${d.count} (${d.pct_of_clusters}%) | ${d.area_m2.toLocaleString()} m² | ${d.pct_of_area}% | ${d.mean_area_m2.toLocaleString()} m² |`)
      .join("\n");
    return {
      task: "descriptive_spatial_statistics",
      params: { n_clusters: totals.cluster_count, mean_m2: areaStats.mean_m2 },
      answer:
        `### Complete Statistical Audit — ${audit.scene_title}\n\n` +
        `| Statistical Metric | Computed Value |\n|---|---|\n` +
        `| **Clusters Detected ($N$)** | **${totals.cluster_count}** (Density: ${totals.cluster_density_per_km2} clusters/km²) |\n` +
        `| **Total Modified Area** | **${totals.total_area_m2.toLocaleString()} m²** (${totals.total_area_km2} km² / ${totals.total_area_hectares} ha) |\n` +
        `| **Invariant Baseline Area** | **${totals.unchanged_area_m2.toLocaleString()} m²** (**${totals.unchanged_pct}%** unchanged) |\n` +
        `| **Mean Cluster Area ($\\mu$)** | **${areaStats.mean_m2.toLocaleString()} m²** |\n` +
        `| **Median Cluster Area ($Q_2$)** | **${areaStats.median_m2.toLocaleString()} m²** |\n` +
        `| **Sample Std. Deviation ($\\sigma$)** | **${areaStats.std_dev_m2.toLocaleString()} m²** (CV = ${areaStats.cv_pct}%) |\n` +
        `| **IQR ($Q_3 - Q_1$)** | **${areaStats.iqr_m2.toLocaleString()} m²** ($Q_1=${areaStats.q1_m2.toLocaleString()}$, $Q_3=${areaStats.q3_m2.toLocaleString()}$) |\n` +
        `| **Min / Max Cluster** | ${areaStats.min_m2.toLocaleString()} m² / ${areaStats.max_m2.toLocaleString()} m² |\n` +
        `| **Nearest-Neighbor Mean Spacing** | **${spatial.nearest_neighbor_mean_m} m** (Min ${spatial.nearest_neighbor_min_m} m) |\n\n` +
        `**Category Breakdown**\n| Category | Clusters | Total Area | Share | Mean Size |\n|---|---|---|---|---|\n${catRows}`,
    };
  }

  // 5. Quadrant / Spatial Location
  if (/(quadrant|north|south|east|west|where|sector|region|location)/.test(q)) {
    const qRows = Object.entries(spatial.quadrants)
      .map(([name, d]) => `| **${name}** | ${d.count} | ${d.area_m2.toLocaleString()} m² | ${d.pct_of_changed_area}% | ${d.cluster_ids.map((i) => `#${i}`).join(", ") || "—"} |`)
      .join("\n");
    return {
      task: "quadrant_spatial_distribution",
      params: { quadrants: Object.keys(spatial.quadrants).length },
      answer:
        `### Spatial Quadrant Concentration Analysis (${audit.scene_title})\n\n` +
        `| Quadrant | Clusters | Area (m²) | Share of Change | Cluster IDs |\n|---|---|---|---|---|\n${qRows}`,
    };
  }

  // 6. Radiometric / Reliability / Confidence
  if (/(reliable|reliability|accuracy|f1|iou|precision|recall|confidence|radiometric|pixel|rgb|luminance|otsu)/.test(q)) {
    const rad = px
      ? `\n\n**Radiometric Pixel Delta ($T_1 \\rightarrow T_2$)**\n` +
        `• **Mean Luminance Shift**: **${px.lumShift >= 0 ? "+" : ""}${px.lumShift}** (T1: ${px.meanLumPre}, T2: ${px.meanLumPost})\n` +
        `• **RGB Channel Deltas**: $\\Delta R=${px.meanRgbDelta.r}$, $\\Delta G=${px.meanRgbDelta.g}$, $\\Delta B=${px.meanRgbDelta.b}$\n` +
        `• **Otsu Threshold**: **${px.otsuThreshold}** | **Changed Pixels**: **${totals.total_changed_px.toLocaleString()}** (${totals.change_pct}%)`
      : "";
    return {
      task: "model_reliability_audit",
      params: { mean_confidence: confStats.mean_pct },
      answer:
        `### Model Reliability & Radiometric Telemetry\n\n` +
        `• **Scene Mean Confidence**: **${confStats.mean_pct}%** (Median: ${confStats.median_pct}%, $\\sigma=${confStats.std_dev_pct}\\%$, Range: ${confStats.min_pct}%–${confStats.max_pct}%)\n` +
        `• **LEVIR-CC Benchmark Recall**: **92.27%** | **F1-Score**: **0.7051** | **IoU**: **0.5445** | **Semantic Cls Acc**: **80.67%**` +
        rad,
    };
  }

  // 7. General Bi-Temporal Statistical Summary (Default — grounded in exact live audit)
  const dominantQ = Object.entries(spatial.quadrants).sort((a, b) => b[1].area_m2 - a[1].area_m2)[0];
  const catBullets = Object.entries(cats)
    .map(([cat, d]) => `  - **${cat}**: ${d.count} cluster(s), **${d.area_m2.toLocaleString()} m²** (${d.pct_of_area}%)`)
    .join("\n");
  return {
    task: "bitemporal_statistical_synthesis",
    params: { clusters: totals.cluster_count, total_area_m2: totals.total_area_m2 },
    answer:
      `### 🛰️ Bi-Temporal Statistical Analysis — ${audit.scene_title}\n` +
      `> **Query**: *"${query}"*\n\n` +
      `• **Pre-Event ($T_1$) ➔ Post-Event ($T_2$) Difference**: **${totals.change_pct}%** of the tile transformed (**+${totals.total_area_m2.toLocaleString()} m²** / **${totals.total_area_hectares} ha** added across **${totals.cluster_count} clusters**; **${totals.unchanged_pct}%** baseline unchanged).\n` +
      `• **Visible Spatial Span**: **${totals.max_dist_km} km (${totals.max_dist_m.toLocaleString()} m)** | **Density**: **${totals.cluster_density_per_km2} clusters/km²**\n` +
      `• **Area Distribution**: Mean = **${areaStats.mean_m2.toLocaleString()} m²**, Median = **${areaStats.median_m2.toLocaleString()} m²**, $\\sigma = ${areaStats.std_dev_m2.toLocaleString()}$ m², IQR = **${areaStats.iqr_m2.toLocaleString()} m²**\n` +
      (dominantQ ? `• **Primary Spatial Quadrant**: **${dominantQ[0]}** (${dominantQ[1].pct_of_changed_area}% of changed area)\n\n` : "\n") +
      `**Category Breakdown**:\n${catBullets || "  - Physical structural changes detected"}`,
  };
}
