"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { SliderControl } from "../../../../components/ui/SliderControl";
import { HANDLE_R, ImageDeviceId, PAD_H, X_HALF, Y_HALF } from "@/types/mockup.types";
import { Button } from "@/components/ui/button";
import { DetailPageHeader } from "@/components/ui/DetailHeaderMenu";

function PositionPad({
  x,
  y,
  onChangeX,
  onChangeY,
  onDragStart,
  backgroundUrl,
  backgroundColorCss,
}: {
  x: number;
  y: number;
  onChangeX: (v: number) => void;
  onChangeY: (v: number) => void;
  onDragStart?: () => void;
  backgroundUrl?: string | null;
  backgroundColorCss?: string | null;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [isDraggingState, setIsDraggingState] = useState(false);

  const cx = Math.max(-X_HALF, Math.min(X_HALF, x));
  const cy = Math.max(-Y_HALF, Math.min(Y_HALF, y));
  const pctX = (cx + X_HALF) / (X_HALF * 2);
  const hy = ((cy + Y_HALF) / (Y_HALF * 2)) * PAD_H;

  const fromEvent = (e: React.PointerEvent) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const currentWidth = rect.width;
    const rx = Math.max(0, Math.min(currentWidth, e.clientX - rect.left));
    const ry = Math.max(0, Math.min(PAD_H, e.clientY - rect.top));
    onChangeX(Math.round((rx / currentWidth) * X_HALF * 2 - X_HALF));
    onChangeY(Math.round((ry / PAD_H) * Y_HALF * 2 - Y_HALF));
  };

  const bgLayerStyle: React.CSSProperties = backgroundUrl
    ? {
      backgroundImage: `url('${backgroundUrl}')`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }
    : backgroundColorCss
      ? backgroundColorCss.startsWith("#") || backgroundColorCss.startsWith("rgb")
        ? { backgroundColor: backgroundColorCss }
        : {
          backgroundImage: backgroundColorCss,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : {};

  return (
    <div className="relative group w-full cursor-default">
      <div
        ref={padRef}
        className={`relative w-full rounded-[14px] overflow-hidden select-none border shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] transition-all duration-200 ${isDraggingState
          ? "border-cyan-500/40 ring-1 ring-cyan-500/20"
          : "border-zinc-800/50"
          }`}
        style={{ height: PAD_H }}
        onPointerDown={(e) => {
          dragging.current = true;
          setIsDraggingState(true);
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          onDragStart?.();
          fromEvent(e);
        }}
        onPointerMove={(e) => { if (dragging.current) fromEvent(e); }}
        onPointerUp={() => {
          dragging.current = false;
          setIsDraggingState(false);
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={bgLayerStyle} />
        <div className="absolute inset-0 pointer-events-none bg-black/40" />
        {isDraggingState && (
          <div className="absolute inset-0 pointer-events-none rounded-[14px] ring-2 ring-cyan-400/30 animate-pulse" />
        )}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#a1a1aa_1px,transparent_1px)] bg-size-[14px_14px]" />

        <div className="absolute top-0 bottom-0 w-px bg-linear-to-b from-transparent via-white/10 to-transparent -translate-x-1/2" style={{ left: "50%" }} />
        <div className="absolute left-0 right-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent -translate-y-1/2" style={{ top: "50%" }} />

        <div
          className="absolute pointer-events-none bg-white/10 transition-opacity -translate-x-1/2"
          style={{ left: `${pctX * 100}%`, top: 0, bottom: 0, width: '1px' }}
        />

        <div
          className="absolute pointer-events-none bg-white/10 transition-opacity -translate-y-1/2"
          style={{ top: hy, left: 0, right: 0, height: '1px' }}
        />

        <div
          className={`absolute bg-white border border-white/40 rounded-full shadow-[0_0_20px_4px_rgba(255,255,255,0.12),0_4px_12px_rgba(0,0,0,0.6)] mix-blend-screen flex items-center justify-center pointer-events-auto transition-transform duration-75`}
          style={{
            width: HANDLE_R * 3,
            height: HANDLE_R * 3,
            left: `${pctX * 100}%`,
            top: hy,
            transform: `translate(-50%, -50%) ${isDraggingState ? "scale(1.25)" : "scale(1)"}`,
            cursor: isDraggingState ? "grabbing" : "grab",
          }}
        />
      </div>
    </div>

  );
}

export interface ActiveDeviceTpl {
  id: ImageDeviceId;
  title: string;
  accentColor: string;
  icon: string;
  modelUrl: string;
}

export interface Mockup3dMenuProps {
  activeDeviceTpl: ActiveDeviceTpl | null;
  imagePhoneDevice: string;
  isLaptop: boolean;

  imagePhoneScale: number;
  setImagePhoneScale: (v: number) => void;
  imagePhoneOpening: number;
  setImagePhoneOpening: (v: number) => void;
  imagePhoneShadow: number;
  setImagePhoneShadow: (v: number) => void;
  setImagePhoneShadowColor: (v: string) => void;
  imagePhoneX: number;
  setImagePhoneX: (v: number) => void;
  imagePhoneY: number;
  setImagePhoneY: (v: number) => void;
  setImagePhoneRotX: (v: number) => void;
  setImagePhoneRotY: (v: number) => void;

  backgroundUrl?: string | null;
  backgroundColorCss?: string | null;

  onBack: () => void;
  onRemove: () => void;
}

export function Mockup3dMenu({
  activeDeviceTpl,
  imagePhoneDevice,
  isLaptop,

  imagePhoneScale,
  setImagePhoneScale,
  imagePhoneOpening,
  setImagePhoneOpening,
  imagePhoneShadow,
  setImagePhoneShadow,
  setImagePhoneShadowColor,
  imagePhoneX,
  setImagePhoneX,
  imagePhoneY,
  setImagePhoneY,
  setImagePhoneRotX,
  setImagePhoneRotY,

  backgroundUrl,
  backgroundColorCss,

  onBack,
  onRemove,
}: Mockup3dMenuProps) {
  const t = useTranslations("mockupMenu");

  const handleReset = () => {
    setImagePhoneX(0);
    setImagePhoneY(0);
    setImagePhoneScale(0.8);
    const defaultRotX = imagePhoneDevice === "laptop" ? 43.23 : -58.23;
    const defaultRotY = imagePhoneDevice === "laptop" ? -37.82 : -29.82;
    setImagePhoneRotX(defaultRotX);
    setImagePhoneRotY(defaultRotY);
    if (imagePhoneDevice === "laptop") {
      setImagePhoneOpening(1);
      setImagePhoneShadow(0.7);
    } else {
      setImagePhoneShadow(0.4);
    }
    setImagePhoneShadowColor("#000000");
  };

  return (
    <>
      <div className="flex items-center gap-2 p-3 border-b border-white/6 shrink-0">
        <DetailPageHeader
          label="Dispositivo 3D"
          icon="mage:box-3d"
          onBack={onBack}
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-5">
        {activeDeviceTpl && (
          <div
            className="relative w-full h-70 overflow-hidden rounded-2xl border"
            style={{ borderColor: `${activeDeviceTpl.accentColor}44` }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${activeDeviceTpl.accentColor}22 0%, transparent 70%)`,
              }}
            />
            <div className="absolute inset-0 bg-[#0d0d10]" style={{ zIndex: -1 }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon
                icon={activeDeviceTpl.icon}
                width="48"
                style={{ color: `${activeDeviceTpl.accentColor}cc` }}
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
              <span className="text-[11px] font-bold text-white/90 tracking-wide">
                {activeDeviceTpl.title}
              </span>
            </div>
            <div
              className="absolute top-2 right-2 size-5 rounded-full flex items-center justify-center"
              style={{ background: activeDeviceTpl.accentColor }}
            >
              <Icon icon="mdi:check-bold" width={11} className="text-white" />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">
              Configuración
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/80 transition-colors"
            >
              <Icon icon="lucide:rotate-ccw" width="11" />
              Resetear
            </button>
          </div>

          <SliderControl
            label="Escala"
            value={Math.round(imagePhoneScale * 100)}
            min={30}
            max={300}
            step={1}
            onChange={(v) => { setImagePhoneScale(v / 100); }}
            suffix="%"
          />

          {isLaptop && (
            <SliderControl
              icon="material-symbols:laptop-chromebook-outline"
              label="Apertura de laptop"
              value={Math.round(imagePhoneOpening * 100)}
              min={0}
              max={100}
              step={1}
              onChange={(v) => { setImagePhoneOpening(v / 100); }}
              suffix="%"
            />
          )}

          <SliderControl
            icon="mdi:blur"
            label="Sombra"
            value={Math.round(imagePhoneShadow * 100)}
            min={0}
            max={100}
            step={1}
            onChange={(v) => { setImagePhoneShadow(v / 100); }}
            suffix="%"
          />

          <div className="flex flex-col gap-2">
            <span className="text-xs text-white/60 font-medium">Posición</span>
            <PositionPad
              x={imagePhoneX}
              y={imagePhoneY}
              onChangeX={setImagePhoneX}
              onChangeY={setImagePhoneY}
              backgroundUrl={backgroundUrl}
              backgroundColorCss={backgroundColorCss}
            />
          </div>
        </div>

        <Button
          onClick={onRemove}
          variant="outline"
          className="w-full text-xs mt-2"
        >
          <Icon icon="ph:trash-bold" width="13" aria-hidden="true" />
          Quitar marco
        </Button>
      </div>
    </>
  );
}
