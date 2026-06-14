"use client";

import { Icon } from "@iconify/react";
import { SliderControl } from "../../../../components/ui/SliderControl";
import { TooltipAction } from "@/components/ui/tooltip-action";
import type { CursorConfig, CursorStyle, ClickEffect, CursorRecordingData } from "@/types/cursor.types";
import { DEFAULT_CURSOR_CONFIG } from "@/types/cursor.types";
import { MacDefaultCursor, WinDefaultCursor, DotDefaultCursor } from "@/components/cursor-svg";

const PRESET_COLORS = ["#FFFFFF", "#000000", "#3B82F6", "#EF4444", "#10B981"];

const CURSOR_STYLES: { id: CursorStyle; name: string; icon: string }[] = [
    { id: "none", name: "Ninguno", icon: "radix-icons:value-none" },
    { id: "mac", name: "macOS", icon: "ph:cursor-fill" },
    { id: "windows", name: "Windows", icon: "ph:cursor" },
    { id: "dot", name: "Minimalista", icon: "ph:circle-fill" },
];

const CLICK_EFFECTS: { id: ClickEffect; name: string }[] = [
    { id: "none", name: "Ninguno" },
    { id: "ripple", name: "Onda" },
    { id: "ring", name: "Aro" },
];

interface CursorMenuProps {
    cursorConfig: CursorConfig;
    onCursorConfigChange: (config: Partial<CursorConfig>) => void;
    cursorData?: CursorRecordingData;
    isRecordedVideo?: boolean;
}

export default function CursorMenu({ 
    cursorConfig = DEFAULT_CURSOR_CONFIG, 
    onCursorConfigChange,
    cursorData,
    isRecordedVideo = false,
}: CursorMenuProps) {
    const hasCursorData = cursorData?.hasCursorData || false;

    // Get the cursor preview element based on current style
    const getCursorPreviewElement = () => {
        const size = 40;
        const color = cursorConfig.color;
        
        switch (cursorConfig.style) {
            case "mac":
                return <MacDefaultCursor color={color === "#FFFFFF" ? "#000000" : color} size={size} />;
            case "windows":
                return <WinDefaultCursor color={color === "#FFFFFF" ? "#000000" : color} size={size} />;
            case "dot":
                return <DotDefaultCursor color={color} size={size} />;
            default:
                return null;
        }
    };

    return (
        <div className="p-4 flex flex-col gap-6">
            
            {/* Cabecera */}
            <div className="flex items-center gap-2 text-white font-medium">
                <Icon icon="ph:mouse-left-click-bold" width="20" className="text-white" />
                <span>Cursor</span>
            </div>

            {/* Warning if video has no cursor data */}
            {!isRecordedVideo && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400/90 text-xs">
                    <div className="flex items-start gap-2">
                        <Icon icon="ph:warning" width="16" className="shrink-0 mt-0.5" />
                        <p>
                            Esta función solo está disponible para videos grabados con el navegador. 
                            Los videos subidos no incluyen datos del cursor.
                        </p>
                    </div>
                </div>
            )}

            {/* Info about cursor data availability */}
            {isRecordedVideo && !hasCursorData && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400/90 text-xs">
                    <div className="flex items-start gap-2">
                        <Icon icon="ph:info" width="16" className="shrink-0 mt-0.5" />
                        <p>
                            Tu navegador no soporta la captura de posición del cursor. 
                            El cursor personalizado se mostrará en una posición estimada basada en las interacciones detectadas.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-6 animate-in fade-in duration-150">
                
                {/* Cursor Preview */}
                {cursorConfig.style !== "none" && (
                    <div className="flex justify-center p-6 bg-linear-to-br from-white/5 to-white/2 rounded-xl border border-white/10">
                        <div className="relative">
                            {getCursorPreviewElement()}
                            {cursorConfig.clickEffect !== "none" && (
                                <div 
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-ping opacity-30"
                                    style={{ 
                                        width: 32, 
                                        height: 32, 
                                        backgroundColor: cursorConfig.clickEffectColor,
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Sección: Estilo del Cursor */}
                <div className="space-y-3">
                    <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                        Estilo
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {CURSOR_STYLES.map((style) => (
                            <TooltipAction label={style.name} key={style.id}>
                                <button
                                    onClick={() => onCursorConfigChange({ style: style.id })}
                                    className={`py-3 bg-white/3 hover:bg-white/8 border squircle-element flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group ${
                                        cursorConfig.style === style.id 
                                            ? "border-blue-500/50 bg-blue-500/10 text-blue-400" 
                                            : "border-white/[0.07] hover:border-white/20 text-white/50"
                                    }`}
                                >
                                    <Icon 
                                        icon={style.icon} 
                                        width="20" 
                                        className={cursorConfig.style === style.id ? "text-blue-400" : "group-hover:text-white transition-colors"} 
                                    />
                                    <span className="text-[8px] font-medium">{style.name}</span>
                                </button>
                            </TooltipAction>
                        ))}
                    </div>
                </div>

                {/* Rest of options only show when cursor style is not "none" */}
                {cursorConfig.style !== "none" && (
                    <>
                        {/* Sección: Color */}
                        <div className="space-y-3">
                            <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                                Color Principal
                            </div>
                            <div className="flex gap-2">
                                <div className="grid grid-cols-5 gap-2 flex-1">
                                    {PRESET_COLORS.map((color) => (
                                        <TooltipAction label={color} key={color}>
                                            <button
                                                onClick={() => onCursorConfigChange({ color })}
                                                className={`aspect-square squircle-element cursor-pointer transition-all border border-white/20 ${
                                                    cursorConfig.color === color 
                                                        ? "ring-2 ring-white/90 border-white/40 shadow-md shadow-black/50" 
                                                        : "border-white/10 hover:border-white/30 hover:ring-1 ring-white/20"
                                                }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        </TooltipAction>
                                    ))}
                                </div>
                                <label className="relative cursor-pointer">
                                    <input
                                        type="color"
                                        value={cursorConfig.color}
                                        onChange={(e) => onCursorConfigChange({ color: e.target.value })}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div
                                        className="w-10 h-10 aspect-square squircle-element border border-dashed border-white/30 bg-white/5 flex items-center justify-center hover:bg-white/10 transition group"
                                        style={{ backgroundColor: cursorConfig.color }}
                                    >
                                        <Icon icon="mdi:eyedropper" width="18" className="text-white mix-blend-difference" />
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Tamaño del cursor */}
                        <div className="space-y-4">
                            <SliderControl
                                icon="mdi:resize"
                                label="Tamaño"
                                value={cursorConfig.size}
                                onChange={(size) => onCursorConfigChange({ size })}
                                min={16}
                                max={80}
                            />
                        </div>

                        {/* Suavizado del movimiento */}
                        <div className="space-y-4">
                            <SliderControl
                                icon="ph:wave-sine"
                                label="Suavizado"
                                value={cursorConfig.smoothing}
                                onChange={(smoothing) => onCursorConfigChange({ smoothing })}
                                min={0}
                                max={100}
                            />
                        </div>

                        {/* Separador */}
                        <div className="h-px w-full bg-white/5" />

                        {/* Sección: Efectos de Clic */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                                    Efecto al hacer clic
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 bg-[#09090B] squircle-element p-1 text-xs font-medium border border-white/5">
                                {CLICK_EFFECTS.map((effect) => (
                                    <button
                                        key={effect.id}
                                        className={`flex justify-center items-center py-1.5 rounded transition ${
                                            cursorConfig.clickEffect === effect.id 
                                                ? "bg-white/10 text-white" 
                                                : "text-white/50 hover:text-white/80"
                                        }`}
                                        onClick={() => onCursorConfigChange({ clickEffect: effect.id })}
                                    >
                                        {effect.name}
                                    </button>
                                ))}
                            </div>

                            {/* Click effect color */}
                            {cursorConfig.clickEffect !== "none" && (
                                <div className="flex items-center gap-3 pt-2">
                                    <span className="text-[10px] text-white/40">Color del efecto</span>
                                    <div className="flex gap-1.5 flex-1">
                                        {["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6"].map((color) => (
                                            <button
                                                key={color}
                                                onClick={() => onCursorConfigChange({ clickEffectColor: color })}
                                                className={`w-6 h-6 rounded-full transition-all ${
                                                    cursorConfig.clickEffectColor === color 
                                                        ? "ring-2 ring-white/60 scale-110" 
                                                        : "hover:scale-105"
                                                }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Separador */}
                        <div className="h-px w-full bg-white/5" />

                        {/* Toggle visibilidad */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Icon icon="ph:eye" width="16" className="text-white/40" />
                                <span className="text-xs text-white/60">Mostrar cursor</span>
                            </div>
                            <button
                                onClick={() => onCursorConfigChange({ visible: !cursorConfig.visible })}
                                className={`w-10 h-5 rounded-full transition-all relative ${
                                    cursorConfig.visible 
                                        ? "bg-blue-500" 
                                        : "bg-white/20"
                                }`}
                            >
                                <div 
                                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                                        cursorConfig.visible ? "left-5" : "left-0.5"
                                    }`}
                                />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}