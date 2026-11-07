"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  ExternalLink,
  Layers,
  Upload,
  Trash2,
} from "lucide-react";

interface AnalysisRecord {
  id: string;
  query: string;
  status: "done" | "running" | "failed" | "pending";
  model: string;
  created: string;
  elapsed?: number | null;
  regions_detected?: number | null;
}

const INITIAL_HISTORY: AnalysisRecord[] = [
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
    id: "i9j0k1l2",
    query: "Identify deforestation in northern forest reserve",
    status: "failed",
    model: "ChangeFormer",
    created: "2025-10-22",
    elapsed: null,
    regions_detected: null,
  },
  {
    id: "m3n4o5p6",
    query: "Highlight changes in agricultural land use & crop rotation",
    status: "done",
    model: "ChangeFormer",
    created: "2025-10-21",
    elapsed: 124,
    regions_detected: 8,
  },
  {
    id: "r7s8t9u0",
    query: "Identify coastal erosion and shoreline movement post-monsoon",
    status: "done",
    model: "ChangeFormer",
    created: "2025-10-19",
    elapsed: 95,
    regions_detected: 19,
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

export default function HistoryPage() {
  const [records, setRecords] = useState<AnalysisRecord[]>(INITIAL_HISTORY);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = records.filter((r) => {
    const matchesSearch =
      r.query.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <AppShell
      title="Analysis History"
      subtitle="Complete chronological audit trail of all processed change detection jobs."
      action={
        <Link href="/upload" className="sq-btn-primary">
          <Upload size={14} />
          <span>New Analysis</span>
        </Link>
      }
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "History" },
      ]}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Filter & Search Bar */}
        <div
          className="sq-card"
          style={{
            marginBottom: 0,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search by job ID or inquiry text…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sq-input"
              style={{ paddingLeft: "36px", fontSize: "13px" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
              <Filter size={13} /> Filter:
            </span>
            {(["all", "done", "running", "failed"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  textTransform: "capitalize",
                  backgroundColor: filterStatus === st ? "var(--bg-elevated)" : "var(--bg-input)",
                  color: filterStatus === st ? "var(--text-primary)" : "var(--text-secondary)",
                  border: filterStatus === st ? "1px solid var(--border-medium)" : "1px solid var(--border-subtle)",
                  transition: "all 0.15s ease",
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Table Card */}
        <div className="sq-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="sq-table">
              <thead>
                <tr>
                  <th>Job ID & Objective</th>
                  <th>Status</th>
                  <th>Model</th>
                  <th>Detections</th>
                  <th>Runtime</th>
                  <th>Date</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                      No analyses found matching the search criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id}>
                      <td style={{ maxWidth: "340px" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--brand-light)", display: "block", marginBottom: "3px", fontWeight: 600 }}>
                          {r.id}
                        </span>
                        <p style={{ fontSize: "13.5px", fontWeight: 500, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.query}>
                          {r.query}
                        </p>
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {r.model}
                      </td>
                      <td>
                        {r.regions_detected != null ? (
                          <span style={{ color: "var(--success)", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
                            <Layers size={14} /> {r.regions_detected} clusters
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td style={{ fontFamily: "monospace" }}>
                        {r.elapsed ? `${r.elapsed}s` : "—"}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>
                        {r.created}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                          <Link
                            href={`/analysis/${r.id}`}
                            className="sq-btn-secondary"
                            style={{ padding: "6px 10px", fontSize: "12px" }}
                            title="Open Analysis Report"
                          >
                            <ExternalLink size={13} />
                          </Link>
                          <button
                            onClick={() => handleDelete(r.id)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "6px",
                              color: "var(--text-muted)",
                              border: "1px solid var(--border-subtle)",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.color = "var(--danger)";
                              (e.currentTarget as HTMLElement).style.borderColor = "var(--danger)";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
                            }}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
