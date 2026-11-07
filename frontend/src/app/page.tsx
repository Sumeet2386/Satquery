"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Satellite, ArrowRight, ShieldCheck, Globe2, BarChart3, Layers,
  Sparkles, Terminal, Radio, Cpu, Zap, Activity,
} from "lucide-react";

const QUERIES = [
  "Compare both images and identify newly constructed building footprints.",
  "Detect impervious surface expansions and road infrastructure additions.",
  "Show deforestation patterns in the northern conservation zone.",
  "Identify industrial zone changes and logistics expansion.",
];

const FEATURES = [
  { icon: Satellite, title: "Transformer Change Detection", desc: "State-of-the-art Siamese architectures detect structural transformations at pixel level across temporal satellite rasters." },
  { icon: Sparkles, title: "Natural Language Queries", desc: "Query spatial datasets in plain English. Automated workflow selects and tunes the optimal model parameters." },
  { icon: ShieldCheck, title: "Evidence-Backed Results", desc: "Every detected change polygon links to verifiable model inference output with visible confidence metrics." },
  { icon: Globe2, title: "Geospatial Data Exports", desc: "Export georeferenced GeoJSON polygon layers, GeoTIFF masks, and executive summary reports." },
  { icon: BarChart3, title: "Complete Provenance", desc: "Input SHA-256 hashes, preprocessing sequences, and model checkpoint versions tracked for complete auditability." },
  { icon: Layers, title: "Multi-Model Architecture", desc: "Evaluate and toggle across ChangeFormer, BIT, and SNUNet adapters pre-trained on LEVIR-CD benchmark data." },
];

const STATS = [
  { value: "< 90s", label: "Analysis Latency" },
  { value: "0.5m", label: "Ground Resolution" },
  { value: "90.4%", label: "LEVIR-CD F1-Score" },
  { value: "100%", label: "Provenance Audited" },
];

const MODES = [
  {
    href: "/mission", label: "Mission Control", tag: "RECOMMENDED",
    Icon: Terminal,
    desc: "Odysseus-style tri-panel layout: satellite ingestion, live map canvas, and conversational AI agent.",
    accent: "#e07856",
  },
  {
    href: "/upload", label: "Analysis Workflow", tag: "ENTERPRISE",
    Icon: Layers,
    desc: "Step-by-step upload → model selection → result inspection with full audit trail.",
    accent: "#5294e2",
  },
  {
    href: "/dashboard", label: "Project Dashboard", tag: "MANAGEMENT",
    Icon: BarChart3,
    desc: "Overview of all analyses, job queue status, and historical audit logs across projects.",
    accent: "#48b27e",
  },
];

function useTypewriter(items: string[]) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  useEffect(() => {
    const target = items[idx] || "";
    let i = 0;
    const iv = setInterval(() => {
      if (i < target.length) { setText(target.slice(0, i + 1)); i++; }
      else { clearInterval(iv); setTimeout(() => { setText(""); setIdx(p => (p + 1) % items.length); }, 2800); }
    }, 28);
    return () => clearInterval(iv);
  }, [idx, items]);
  return text;
}

const C = {
  bg: "#090a0d",
  panel: "#0d0f12",
  card: "#111419",
  elevated: "#15181f",
  border: "#1c2028",
  borderMid: "#252b36",
  coral: "#e07856",
  coralHover: "#e98767",
  text: "#d0d7e2",
  textSub: "#748094",
  textMuted: "#4b5565",
  green: "#48b27e",
};

export default function LandingPage() {
  const queryText = useTypewriter(QUERIES);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "sans-serif" }}>

      {/* ── Navbar ── */}
      <header style={{
        height: 60, borderBottom: `1px solid ${C.border}`, background: C.panel,
        padding: "0 48px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 7, background: C.elevated,
            border: `1px solid ${C.borderMid}`, display: "flex", alignItems: "center",
            justifyContent: "center", color: C.coral,
          }}>
            <Satellite size={16} />
          </div>
          <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 14, color: C.text, letterSpacing: "-0.01em" }}>
            SatQuery <span style={{ color: C.coral }}>AI</span>
          </span>
          <span style={{
            fontFamily: "monospace", fontSize: 9, color: C.textMuted,
            background: C.elevated, border: `1px solid ${C.border}`,
            padding: "2px 7px", borderRadius: 4, letterSpacing: "0.06em",
          }}>
            SIH26167
          </span>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {[
            { label: "Modes", href: "#modes" },
            { label: "Capabilities", href: "#capabilities" },
            { label: "Audit Trail", href: "/history" },
          ].map(n => (
            <a key={n.label} href={n.href} style={{ fontFamily: "monospace", fontSize: 12, color: C.textSub, textDecoration: "none" }}>
              {n.label}
            </a>
          ))}
        </nav>

        <Link href="/mission" style={{
          display: "flex", alignItems: "center", gap: 7, padding: "8px 18px",
          borderRadius: 6, background: C.coral, color: "#090a0d",
          fontWeight: 800, fontSize: 12, fontFamily: "monospace", textDecoration: "none",
        }}>
          Open Mission Control <ArrowRight size={13} />
        </Link>
      </header>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "80px 24px 60px", textAlign: "center" }}>
        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 16px", borderRadius: 100, background: C.card,
          border: `1px solid ${C.border}`, fontFamily: "monospace", fontSize: 11, color: C.textSub,
          marginBottom: 32,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.coral, display: "inline-block" }} />
          ISRO EO Scientist Suite · Agentic VLM + Siamese Change Detection
        </div>

        <h1 style={{ fontSize: 48, fontWeight: 900, color: C.text, lineHeight: 1.1, margin: "0 0 20px", letterSpacing: "-0.03em" }}>
          Precision Satellite{" "}
          <span style={{ color: C.coral }}>Change Detection</span>
          <br />Powered by Multimodal AI
        </h1>

        <p style={{ fontSize: 15, color: C.textSub, maxWidth: 600, margin: "0 auto 36px", lineHeight: 1.7 }}>
          Upload bi-temporal satellite imagery, ask questions in natural language, and receive verified spatial change polygons with complete audit provenance.
        </p>

        {/* Live typewriter demo */}
        <div style={{
          maxWidth: 680, margin: "0 auto 32px",
          background: C.panel, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12, textAlign: "left",
        }}>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: C.coral, fontWeight: 800, letterSpacing: "0.08em", flexShrink: 0 }}>
            QUERY:
          </span>
          <span style={{ fontFamily: "monospace", fontSize: 12, color: C.text, flex: 1, overflow: "hidden" }}>
            {queryText}
            <span style={{ display: "inline-block", width: 7, height: 14, background: C.coral, marginLeft: 2, verticalAlign: "middle" }} />
          </span>
          <Link href="/mission" style={{
            flexShrink: 0, padding: "6px 14px", borderRadius: 5,
            background: C.coral, color: "#090a0d",
            fontFamily: "monospace", fontWeight: 800, fontSize: 11, textDecoration: "none",
          }}>
            Run →
          </Link>
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Link href="/mission" style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 28px", borderRadius: 7,
            background: C.coral, color: "#090a0d",
            fontWeight: 800, fontSize: 14, textDecoration: "none",
          }}>
            <Terminal size={16} /> Open Mission Control <ArrowRight size={15} />
          </Link>
          <Link href="/upload" style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 28px", borderRadius: 7,
            background: C.elevated, border: `1px solid ${C.borderMid}`,
            color: C.text, fontWeight: 700, fontSize: 14, textDecoration: "none",
          }}>
            <Sparkles size={15} /> Start Analysis
          </Link>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: C.panel, padding: "36px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, textAlign: "center" }}>
          {STATS.map((s, i) => (
            <div key={i}>
              <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 28, color: C.text, letterSpacing: "-0.02em" }}>{s.value}</div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Modes ── */}
      <section id="modes" style={{ maxWidth: 1000, margin: "0 auto", padding: "72px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 24, color: C.text, margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            Choose Your <span style={{ color: C.coral }}>Operational Mode</span>
          </h2>
          <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>
            Three distinct entry points for different workflows and expertise levels.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {MODES.map(mode => (
            <Link key={mode.href} href={mode.href} style={{
              display: "block", padding: "24px 22px",
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 10, textDecoration: "none", transition: "all 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 8,
                  background: `${mode.accent}18`, border: `1px solid ${mode.accent}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: mode.accent,
                }}>
                  <mode.Icon size={20} />
                </div>
                <span style={{
                  fontFamily: "monospace", fontSize: 9, fontWeight: 800,
                  padding: "3px 7px", borderRadius: 4, letterSpacing: "0.07em",
                  background: `${mode.accent}18`, border: `1px solid ${mode.accent}40`,
                  color: mode.accent,
                }}>
                  {mode.tag}
                </span>
              </div>
              <h3 style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 15, color: C.text, margin: "0 0 10px", letterSpacing: "-0.01em" }}>
                {mode.label}
              </h3>
              <p style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6, margin: "0 0 20px" }}>
                {mode.desc}
              </p>
              <div style={{ fontFamily: "monospace", fontSize: 12, color: mode.accent, display: "flex", alignItems: "center", gap: 4 }}>
                Enter <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="capabilities" style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px 72px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 24, color: C.text, margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            Engineered for <span style={{ color: C.coral }}>Geospatial Rigor</span>
          </h2>
          <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>
            A production-ready pipeline that validates CRS alignment, resamples resolutions, and executes real neural inference.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              padding: "22px 20px", background: C.card,
              border: `1px solid ${C.border}`, borderRadius: 10,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 7,
                background: C.elevated, border: `1px solid ${C.borderMid}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: C.coral, marginBottom: 14,
              }}>
                <f.icon size={17} />
              </div>
              <h3 style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: C.text, margin: "0 0 8px" }}>{f.title}</h3>
              <p style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Telemetry Banner ── */}
      <section style={{ borderTop: `1px solid ${C.border}`, background: C.panel, padding: "20px 48px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, fontFamily: "monospace", fontSize: 11, color: C.textMuted }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Radio size={12} style={{ color: C.coral }} /> ISRO SIH26167 EO Platform
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Cpu size={12} /> Apple Silicon MPS / CUDA / CPU
            </span>
          </div>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "monospace", fontSize: 11, color: C.green }}>
            <Activity size={11} /> System Operational
          </span>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, background: C.panel, padding: "20px 48px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: C.textMuted }}>
            <span style={{ color: C.text, fontWeight: 700 }}>SatQuery AI</span>
            {" "}— Agentic Satellite Image Intelligence Platform
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {["/mission", "/dashboard", "/upload", "/history"].map((href, i) => (
              <Link key={href} href={href} style={{ fontFamily: "monospace", fontSize: 11, color: C.textMuted, textDecoration: "none" }}>
                {["Mission Control", "Dashboard", "New Analysis", "History"][i]}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
