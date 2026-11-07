"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import {
  Satellite,
  LayoutDashboard,
  Upload,
  History,
  Settings,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Terminal,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  action?: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/mission",   label: "Mission Control",   icon: Terminal },
  { href: "/dashboard", label: "Dashboard",          icon: LayoutDashboard },
  { href: "/upload",    label: "New Analysis",       icon: Upload },
  { href: "/history",   label: "Analysis History",   icon: History },
  { href: "/settings",  label: "Settings",           icon: Settings },
];

function NavLinks() {
  const pathname = usePathname();
  return (
    <nav style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && item.href !== "/mission" && pathname?.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderRadius: 6,
              borderLeft: isActive ? "2px solid #e07856" : "2px solid transparent",
              background: isActive ? "#15181f" : "transparent",
              color: isActive ? "#d0d7e2" : "#748094",
              textDecoration: "none",
              fontFamily: "monospace",
              fontSize: 12,
              fontWeight: isActive ? 700 : 400,
              transition: "all 0.15s",
            }}
          >
            <Icon size={14} style={{ color: isActive ? "#e07856" : "#4b5565", flexShrink: 0 }} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppShell({
  children,
  title,
  subtitle,
  breadcrumbs,
  action,
}: AppShellProps) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#090a0d", color: "#d0d7e2" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          background: "#0d0f12",
          borderRight: "1px solid #1c2028",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "16px 12px",
          flexShrink: 0,
        }}
      >
        <div>
          {/* Brand */}
          <div style={{ marginBottom: 24, padding: "0 4px" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
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
                <Satellite size={15} />
              </div>
              <div>
                <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 13, color: "#d0d7e2" }}>
                  SatQuery <span style={{ color: "#e07856" }}>AI</span>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#4b5565", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>
                  Satellite Intelligence
                </div>
              </div>
            </Link>
          </div>

          {/* Nav label */}
          <div style={{ padding: "0 4px", fontFamily: "monospace", fontSize: 9, color: "#4b5565", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
            Workspace
          </div>

          <Suspense fallback={<div style={{ height: 120 }} />}>
            <NavLinks />
          </Suspense>
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #1c2028", paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              background: "#111419",
              border: "1px solid #1c2028",
              borderRadius: 6,
              padding: "8px 10px",
              fontFamily: "monospace",
              fontSize: 10,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#4b5565" }}>
              <span>Engine</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#48b27e", fontWeight: 700 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#48b27e", display: "inline-block" }} />
                Active
              </span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#a2acbd" }}>ChangeFormer (LEVIR-CD)</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px", fontFamily: "monospace", fontSize: 10, color: "#4b5565" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <ShieldCheck size={12} style={{ color: "#e07856" }} />
              SIH26167
            </span>
            <span>v2.0.0</span>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top Header */}
        <header
          style={{
            height: 56,
            borderBottom: "1px solid #1c2028",
            background: "#0d0f12",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            {breadcrumbs ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace", fontSize: 13 }}>
                {breadcrumbs.map((b, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {b.href ? (
                      <Link href={b.href} style={{ color: "#748094", textDecoration: "none", fontWeight: 500 }}>
                        {b.label}
                      </Link>
                    ) : (
                      <span style={{ color: "#d0d7e2", fontWeight: 700 }}>{b.label}</span>
                    )}
                    {i < breadcrumbs.length - 1 && <ChevronRight size={12} style={{ color: "#323a48" }} />}
                  </span>
                ))}
              </div>
            ) : (
              <div>
                <h1 style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 800, color: "#d0d7e2", margin: 0, lineHeight: 1.2 }}>
                  {title}
                </h1>
                {subtitle && (
                  <p style={{ fontFamily: "monospace", fontSize: 10, color: "#4b5565", margin: "3px 0 0", letterSpacing: "0.01em" }}>
                    {subtitle}
                  </p>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {action}
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 5,
                background: "#111419",
                border: "1px solid #1c2028",
                color: "#748094",
                textDecoration: "none",
                fontFamily: "monospace",
                fontSize: 11,
                transition: "all 0.15s",
              }}
            >
              <span>Product Page</span>
              <ExternalLink size={11} />
            </Link>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: "auto", background: "#090a0d" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
