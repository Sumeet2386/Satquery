"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeftRight, SplitSquareVertical } from "lucide-react";

interface SwipeSliderProps {
  preImageUrl: string;
  postImageUrl: string;
  preLabel?: string;
  postLabel?: string;
  isActive: boolean;
  onToggle: () => void;
}

export const SwipeSlider: React.FC<SwipeSliderProps> = ({
  preImageUrl,
  postImageUrl,
  preLabel = "T1: Pre-Event",
  postLabel = "T2: Post-Event",
  isActive,
  onToggle,
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      handleMove(e.touches[0].clientX);
    },
    [isDragging, handleMove]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    },
    [isDragging, handleMove]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  if (!isActive) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        fontFamily: "monospace",
        fontSize: "12px",
        userSelect: "none",
      }}
    >
      {/* Top Banner */}
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pointerEvents: "auto",
          background: "rgba(9, 10, 13, 0.90)",
          borderBottom: "1px solid #1c2028",
          backdropFilter: "blur(6px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#d0d7e2" }}>
          <SplitSquareVertical size={15} style={{ color: "#e07856" }} />
          <span style={{ fontWeight: 700 }}>Swipe Comparison Active</span>
          <span style={{ color: "#748094", fontSize: "11px" }}>• Drag divider to inspect delta</span>
        </div>
        <button
          onClick={onToggle}
          style={{
            padding: "5px 12px",
            borderRadius: "5px",
            background: "#15181f",
            border: "1px solid #252b36",
            color: "#d0d7e2",
            fontSize: "11px",
            fontFamily: "monospace",
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#1c2028")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#15181f")}
        >
          Exit Swipe View
        </button>
      </div>

      {/* Swipe Canvas */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          flex: 1,
          margin: "12px",
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid #1c2028",
          pointerEvents: "auto",
          cursor: "ew-resize",
          background: "#090a0d",
        }}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
      >
        {/* Post Layer (full width) */}
        <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <img
            src={postImageUrl}
            alt={postLabel}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            draggable={false}
          />
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              right: "10px",
              background: "rgba(13, 15, 18, 0.85)",
              border: "1px solid #252b36",
              padding: "3px 8px",
              borderRadius: "4px",
              fontSize: "10px",
              color: "#d0d7e2",
              fontFamily: "monospace",
            }}
          >
            {postLabel}
          </div>
        </div>

        {/* Pre Layer (clipped to left of slider) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            height: "100%",
            overflow: "hidden",
            width: `${sliderPosition}%`,
          }}
        >
          <img
            src={preImageUrl}
            alt={preLabel}
            style={{
              height: "100%",
              objectFit: "cover",
              width: `${100 / (sliderPosition / 100)}%`,
              maxWidth: "none",
            }}
            draggable={false}
          />
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              left: "10px",
              background: "rgba(13, 15, 18, 0.85)",
              border: "1px solid #252b36",
              padding: "3px 8px",
              borderRadius: "4px",
              fontSize: "10px",
              color: "#d0d7e2",
              fontFamily: "monospace",
            }}
          >
            {preLabel}
          </div>
        </div>

        {/* Divider line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "2px",
            background: "#e07856",
            zIndex: 10,
            left: `${sliderPosition}%`,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: "#15181f",
              border: "2px solid #e07856",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 10px rgba(0,0,0,0.6)",
            }}
          >
            <ArrowLeftRight size={13} style={{ color: "#e07856" }} />
          </div>
        </div>
      </div>
    </div>
  );
};
