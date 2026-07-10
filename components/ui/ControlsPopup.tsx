"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Leva } from "leva";

export function ControlsPopup() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setMounted(true);
        }, 0);
        return () => clearTimeout(timeoutId);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div
            style={{
                position: "fixed",
                bottom: "220px",
                right: "290px",
                width: "320px",
                zIndex: 10,
            }}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <Leva titleBar={{ filter: false }} fill flat />
        </div>,
        document.body
    );
}