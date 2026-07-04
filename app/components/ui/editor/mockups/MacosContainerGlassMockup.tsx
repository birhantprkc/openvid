"use client";

import type { MockupRenderProps } from "@/types/mockup.types";

interface MacosContainerGlassMockupProps extends MockupRenderProps {
    shadows?: number;
    roundedCorners?: number;
}

export function MacosContainerGlassMockup({
    children,
    config,
    className = "",
    shadows = 20,
    roundedCorners
}: MacosContainerGlassMockupProps) {
    const cornerRadius = roundedCorners ?? config.cornerRadius ?? 12;
    const headerScale = (config.headerScale || 100) / 100;
    const dotSize = 8 * headerScale;
    const dotGap = 8 * headerScale;
    const headerPaddingX = 4 * headerScale;
    const headerPaddingB = 8 * headerScale;
    return (
        <div
            className={`glass-border relative w-full flex flex-col overflow-hidden ${className}`}
            style={{
                borderRadius: `${cornerRadius}px`,
                boxShadow: shadows > 0
                    ? `0 ${shadows * 0.3}px ${shadows}px rgba(0,0,0,1)`
                    : "none",
                borderTop: "1px solid rgba(255,255,255,0.6)",
                borderLeft: "1px solid rgba(255,255,255,0.6)",
            }}
        >
            <div
                className="flex items-center shrink-0"
                style={{
                    paddingLeft: `${headerPaddingX}px`,
                    paddingRight: `${headerPaddingX}px`,
                    paddingBottom: `${headerPaddingB}px`,
                    paddingTop: `${headerPaddingX}px`,
                }}
            >
                <div className="flex" style={{ gap: `${dotGap}px` }}>
                    <div
                        className="rounded-full bg-white/80 shadow-sm"
                        style={{ width: `${dotSize}px`, height: `${dotSize}px` }}
                    />
                    <div
                        className="rounded-full bg-white/80 shadow-sm"
                        style={{ width: `${dotSize}px`, height: `${dotSize}px` }}
                    />
                    <div
                        className="rounded-full bg-white/80 shadow-sm"
                        style={{ width: `${dotSize}px`, height: `${dotSize}px` }}
                    />
                </div>
            </div>

            <div
                className="flex-1 relative overflow-hidden"
                style={{
                    borderRadius: `${Math.max(0, cornerRadius - 3)}px`,
                }}
            >
                {children}
            </div>
        </div>
    );
}