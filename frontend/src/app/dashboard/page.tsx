"use client";

import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import {
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  Layers,
  ArrowRight,
  TrendingUp,
  Activity,
} from "lucide-react";

const STATS = [
  {
    label: "Total Analyses",
    value: "4",
    subtext: "Across 2 projects",
    icon: <Activity size={18} color="var(--brand-light)" />,
  },
  {
    label: "Completed",
    value: "2",
    subtext: "100% verified",
    icon: <CheckCircle2 size={18} color="var(--success)" />,
  },
  {
    label: "Processing",
    value: "1",
    subtext: "Job in queue",
    icon: <Loader2 size={18} color="var(--brand-light)" className="animate-spin" />,
  },
  {
    label: "Mean Runtime",
    value: "1m 45s",
    subtext: "Inference & fusion",
    icon: <TrendingUp size={18} color="#A78BFA" />,
  },
];

const RECENT_ANALYSES = [
  {
    id: "a1b2c3d4",
    query: "Compare urban development between 2020 and 2023",
    status: "done",
    model: "ChangeFormer",
    created: "2025-10-23",
    elapsed: 87,
    regions_detected: 14,
  },
  {
    id: "e5f6g7h8",
    query: "Detect flooded areas compared to baseline image",
    status: "running",
    model: "ChangeFormer",
    created: "2025-10-24",
    elapsed: null,
    regions_detected: null,
  },
  {
    id: "m3n4o5p6",
    query: "Highlight changes in agricultural land use",
    status: "done",
    model: "ChangeFormer",
    created: "2025-10-21",
    elapsed: 124,
    regions_detected: 8,
  },
  {
    id: "i9j0k1l2",
    query: "Identify deforestation in northern forest reserve",
    status: "failed",
    model: "ChangeFormer",
    created: "2025-10-22",
    elapsed: null,
    regions_detected: null,
  },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending: { label: "Pending", className: "sq-badge-warning", icon: <Clock size={12} /> },
    running: { label: "Running", className: "sq-badge-blue", icon: <Loader2 size={12} className="animate-spin" /> },
    done: { label: "Complete", className: "sq-badge-success", icon: <CheckCircle2 size={12} /> },
    failed: { label: "Failed", className: "sq-badge-danger", icon: <XCircle size={12} /> },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`sq-badge ${s.className}`}>
      {s.icon}
      <span>{s.label}</span>
    </span>
  );
}

export default function DashboardPage() {
  return (
    <AppShell
      title="Platform Overview"
      subtitle="Monitor spatial inference jobs, pipeline performance, and detection histories."
      action={
        <Link href="/upload" className="sq-btn-primary">
          <Upload size={15} />
          <span>New Analysis</span>
        </Link>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* ── KPI Metrics Cards ─────────────────────────────────────── */}
        <div className="sq-grid-4">
          {STATS.map((stat, i) => (
            <div key={i} className="sq-card" style={{ marginBottom: 0, padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                  {stat.label}
                </span>
                {stat.icon}
              </div>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", fontFamily: "monospace", letterSpacing: "-0.02em" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                {stat.subtext}
              </div>
            </div>
          ))}
        </div>

        {/* ── Recent Analyses Table ─────────────────────────────────── */}
        <div className="sq-card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h2 className="sq-card-title">Recent Analyses</h2>
              <p className="sq-card-desc">
                Verified satellite change detection executions.
              </p>
            </div>
            <Link
              href="/history"
              style={{
                fontSize: "13px",
                color: "var(--brand-light)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                transition: "opacity 0.15s ease",
              }}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="sq-table">
              <thead>
                <tr>
                  <th>Objective Query</th>
                  <th>Status</th>
                  <th>Model</th>
                  <th>Detections</th>
                  <th>Runtime</th>
                  <th>Date</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_ANALYSES.map((row) => (
                  <tr key={row.id}>
                    <td style={{ maxWidth: "340px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--brand-light)", display: "block", marginBottom: "3px", fontWeight: 600 }}>
                        {row.id}
                      </span>
                      <p style={{ fontSize: "13.5px", fontWeight: 500, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.query}>
                        {row.query}
                      </p>
                    </td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {row.model}
                    </td>
                    <td>
                      {row.regions_detected != null ? (
                        <span style={{ color: "var(--success)", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
                          <Layers size={14} /> {row.regions_detected} clusters
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td style={{ fontFamily: "monospace" }}>
                      {row.elapsed ? `${row.elapsed}s` : "—"}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>
                      {row.created}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        href={`/analysis/${row.id}`}
                        className="sq-btn-secondary"
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                      >
                        <span>Report</span>
                        <ExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
