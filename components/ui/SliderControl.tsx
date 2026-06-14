"use client";

import { Icon } from "@iconify/react";
import { useRef, useState, useEffect } from "react";

interface SliderControlProps {
    icon?: string;
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
    onChange?: (value: number) => void;
    onChangeEnd?: () => void;
}

export function SliderControl({ icon, label, value, min = 0, max = 100, step = 1, suffix = "", onChange, onChangeEnd }: SliderControlProps) {
    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = () => {
        setIsDragging(true);
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!sliderRef.current || !onChange) return;

        const rect = sliderRef.current.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const rawValue = (percentage / 100) * (max - min) + min;
        const newValue = Math.round(rawValue / step) * step;
        onChange(Math.max(min, Math.min(max, parseFloat(newValue.toFixed(1)))));
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!sliderRef.current || !onChange) return;

            const rect = sliderRef.current.getBoundingClientRect();
            const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            const rawValue = (percentage / 100) * (max - min) + min;
            const newValue = Math.round(rawValue / step) * step;
            onChange(Math.max(min, Math.min(max, parseFloat(newValue.toFixed(1)))));
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            onChangeEnd?.();
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, min, max, step, onChange, onChangeEnd]);

    const displayPercentage = Math.round(((value - min) / (max - min)) * 100);

    return (
        <div>
            <div className="flex items-center gap-2 text-xs mb-2 text-white/60">
                {icon && <Icon icon={icon} width="16" />}
                <span>{label}</span>
            </div>
            <div className="flex items-center gap-3">
                <div
                    ref={sliderRef}
                    className="flex-1 h-1 bg-[#27272A] rounded-full relative cursor-pointer"
                    onClick={handleClick}
                    onMouseDown={handleMouseDown}
                >
                    <div
                        className="absolute left-0 top-0 h-full bg-gradient-primary rounded-full"
                        style={{ width: `${displayPercentage}%` }}
                    ></div>
                    <div
                        className="absolute top-1/2 -translate-y-1/2 size-3 bg-white/70 rounded-full border border-white shadow"
                        style={{ left: `calc(${displayPercentage}% - 7px)` }}
                    ></div>

                </div>
                <span className="text-[11px] font-mono text-white/50 rounded  text-center">
                    {step < 1 ? value.toFixed(1) : value}{suffix}
                </span>
            </div>
        </div>
    );
}
