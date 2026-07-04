"use client";

import type { MockupRenderProps } from "@/types/mockup.types";

interface GlassUIContainerProps extends MockupRenderProps {
    shadows?: number;
    roundedCorners?: number;
}

export function GlassUIContainerMockup({
    children,
    config,
    className = "",
    shadows = 20,
    roundedCorners
}: GlassUIContainerProps) {
    const cornerRadius = roundedCorners ?? config.cornerRadius ?? 12;

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