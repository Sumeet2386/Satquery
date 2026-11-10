"use client";

import React from "react";
import {
  UploadCloud,
  Map as MapIcon,
  MessageSquare,
  FileText,
  Terminal,
  Satellite,
  Cpu,
  Activity,
} from "lucide-react";
import { MissionScenario } from "../../types/satquery";
import { MOCK_SCENARIOS } from "../../constants/mockScenarios";

export type NavSection = "upload" | "map" | "chat" | "reports" | "trace";

interface SidebarNavProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  isProcessing: boolean;
  filesCount: number;
  currentScenario?: MissionScenario | null;
  onSelectScenario: (scenario: MissionScenario) => void;
  backendOnline?: boolean;
  backendDevice?: string;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeSection,
  onSelectSection,
  isProcessing,
  filesCount,
  currentScenario,
  onSelectScenario,
  backendOnline = false,
  backendDevice = "mps",
}) => {
  const navItems: {
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: "chat",
      label: "Agent Chat",
      icon: MessageSquare,
      badge: isProcessing ? "RUNNING" : "IDLE",
      badgeColor: isProcessing ? "#e07856" : "#323a48",
    },
    {
      id: "upload",
      label: "Raster Ingest",
      icon: UploadCloud,
      badge: filesCount > 0 ? `${filesCount} LOADED` : "EMPTY",
      badgeColor: filesCount > 0 ? "#48b27e" : "#323a48",
    },
    {
      id: "reports",
      label: "Mission Report",
      icon: FileText,
    },
    {
      id: "trace",
      label: "Exec Trace",
      icon: Terminal,
      badge: isProcessing ? "ACTIVE" : undefined,
      badgeColor: "#e07856",
    },
  ];

  return (
    <aside
      style={{
        width: "220px",
        flexShrink: 0,
        height: "100%",
        background: "#0d0f12",
        borderRight: "1px solid #1c2028",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        zIndex: 30,
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: "16px 16px 12px",
          borderBottom: "1px solid #1c2028",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: "#15181f",
            border: "1px solid #252b36",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#e07856",
            flexShrink: 0,
          }}
        >
          <Satellite size={16} />
        </div>
        <div>
          <div
            style={{
              fontFamily: "monospace",
              fontWeight: 800,
              fontSize: 13,
              color: "#d0d7e2",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}
          >
            SatQuery <span style={{ color: "#e07856" }}>AI</span>
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              color: "#4b5565",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginTop: 2,
            }}
          >
            ISRO EO · SIH26167
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ padding: "8px 8px", flex: 1 }}>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            color: "#4b5565",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "8px 8px 4px",
          }}
        >
          Workspace
        </div>
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                marginBottom: 2,
                background: isActive ? "#15181f" : "transparent",
                borderLeft: isActive ? "2px solid #e07856" : "2px solid transparent",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "#111419";
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Icon
                  size={14}
                  style={{ color: isActive ? "#e07856" : "#4b5565", flexShrink: 0 }}
                />
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? "#d0d7e2" : "#748094",
                    letterSpacing: "0.01em",
                  }}
                >
                  {item.label}
                </span>
              </div>
              {item.badge && (
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    color: item.badgeColor,
                    padding: "2px 5px",
                    borderRadius: 3,
                    background: `${item.badgeColor}18`,
                    border: `1px solid ${item.badgeColor}40`,
                    flexShrink: 0,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Real-Time Benchmark Satellite Imagery */}
        <div
          style={{
            marginTop: 14,
            fontFamily: "monospace",
            fontSize: 9,
            color: "#e07856",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "8px 8px 4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>Real-Time Imagery</span>
          <span style={{ fontSize: 8, background: "rgba(224,120,86,0.15)", padding: "1px 4px", borderRadius: 3, border: "1px solid rgba(224,120,86,0.3)" }}>
            0.5m GSD
          </span>
        </div>
        {MOCK_SCENARIOS.map((s) => {
          const isSelected = currentScenario?.id === s.id;
          const distKm = s.response.max_dist_km || 0.3;
          return (
            <button
              key={s.id}
              onClick={() => onSelectScenario(s)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 8px",
                borderRadius: 5,
                border: isSelected ? "1px solid #e07856" : "1px solid transparent",
                cursor: "pointer",
                marginBottom: 2,
                background: isSelected ? "#15181f" : "transparent",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "#111419";
              }}
              onMouseLeave={(e) => {
                if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
              title={s.description}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: isSelected ? "#e07856" : "#252b36",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 10,
                    color: isSelected ? "#d0d7e2" : "#748094",
                    fontWeight: isSelected ? 700 : 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.id.replace("database-", "")}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 8,
                  fontWeight: 700,
                  color: isSelected ? "#e07856" : "#4b5565",
                  background: isSelected ? "rgba(224,120,86,0.15)" : "#111419",
                  padding: "1px 5px",
                  borderRadius: 3,
                  border: isSelected ? "1px solid rgba(224,120,86,0.3)" : "1px solid #1c2028",
                  flexShrink: 0,
                }}
              >
                {distKm} km
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer: Hardware & Status */}
      <div
        style={{
          borderTop: "1px solid #1c2028",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Cpu size={11} style={{ color: "#e07856" }} />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              color: "#748094",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 700,
            }}
          >
            {backendDevice}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Activity size={10} style={{ color: backendOnline ? "#48b27e" : "#4b5565" }} />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              color: backendOnline ? "#48b27e" : "#4b5565",
            }}
          >
            {backendOnline ? "online" : "offline"}
          </span>
        </div>
      </div>
    </aside>
  );
};
