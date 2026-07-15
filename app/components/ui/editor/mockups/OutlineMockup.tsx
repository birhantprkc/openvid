"use client";

import type { MockupRenderProps } from "@/types/mockup.types";

interface OutlineMockupProps extends MockupRenderProps {
  shadows?: number;
  roundedCorners?: number;
}

export function OutlineMockup({
  children,
  config,
  className = "",
  shadows = 30,
  roundedCorners,
}: OutlineMockupProps) {
  const isDark = config.darkMode;
  const cornerRadius = roundedCorners ?? config.cornerRadius;
  const screenBg = isDark ? "#0a0a0a" : "#ffffff";
  const frameColor = config.frameColor || (isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)");
  
  const offset = 8;
  const innerRadius = cornerRadius * 2.5;
  const outerRadius = innerRadius + offset;

  return (
    <div className={`relative w-full h-full flex flex-col ${className}`}>
      <div
        className="relative w-full h-full flex flex-col"
        style={{
          padding: `${offset}px`,
          borderRadius: `${outerRadius}px`,
          border: `1px solid ${frameColor}`,
        }}
      >
        <div
          className="relative w-full h-full overflow-hidden shadow-inner"
          style={{
            backgroundColor: screenBg,
            borderRadius: `${innerRadius}px`,
            boxShadow: shadows > 0 ? `0 ${shadows}px ${shadows * 2}px rgba(0,0,0,0.12)` : 'none',
          }}
        >
          <div className="relative z-10 w-full h-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}