import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SatQuery AI — ISRO Agentic Remote-Sensing Intelligence (SIH26167)",
  description:
    "Autonomous agentic remote-sensing VQA and multimodal spatial grounding dashboard for ISRO Earth Observation scientists.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="stylesheet" href="/maplibre-gl.css" />
      </head>
      <body style={{ background: "#090a0d", color: "#d0d7e2", minHeight: "100vh", margin: 0, padding: 0, WebkitFontSmoothing: "antialiased" }}>
        {children}
      </body>
    </html>
  );
}
