"use client";

import { Icon } from "@iconify/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover";
import { TooltipAction } from "@/components/ui/tooltip-action";
import { useTranslations } from "next-intl";
import {
  PhoneImagePreviewConfig,
  LaptopImagePreviewConfig,
  LAPTOP_IMAGE_PREVIEWS,
  getPhoneImagePreviews,
} from "@/types/photo.types";
import { PositionCustomControls } from "./PositionCustomControls";

type DevicePreset = PhoneImagePreviewConfig | LaptopImagePreviewConfig;

export interface Position3DPresetsEditorProps {
  device: string;
  isLaptop: boolean;
  selectedPresetId: string;
  onSelectPreset: (preset: DevicePreset) => void;

  rotateX: number;
  rotateY: number;
  onRotationXYChange: (rotateX: number, rotateY: number) => void;
  rotateZ: number;
  onRotateZChange: (v: number) => void;
  onCustomReset?: () => void;
}

export function Position3DPresetsEditor({
  device,
  isLaptop,
  selectedPresetId,
  onSelectPreset,
  rotateX,
  rotateY,
  onRotationXYChange,
  rotateZ,
  onRotateZChange,
  onCustomReset,
}: Position3DPresetsEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");
  const t = useTranslations("mockupMenu.positionPresets");

  const presets: DevicePreset[] = isLaptop
    ? LAPTOP_IMAGE_PREVIEWS
    : getPhoneImagePreviews(device);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <TooltipAction label={t("tooltip")}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`gap-2 text-xs transition-all duration-200 w-full justify-start
              }`}
            size="sm"
          >
            <Icon icon="mdi:image-multiple-outline" width="16" />
            {t("trigger")}
            <Icon icon="lucide:chevron-down" width="14" className="ml-auto opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
      </TooltipAction>
      <PopoverContent
        align="start"
        className="w-80 h-130 bg-[#0A0A0A] border-white/10 shadow-2xl p-0 rounded-xl overflow-hidden"
      >
        <div className="flex flex-col">
          <PopoverHeader className="px-4 py-3 border-b border-white/10 bg-white/5">
            <div className="flex items-center justify-between">
              <PopoverTitle className="text-xs font-semibold text-white/80 tracking-wide uppercase flex items-center gap-2">
                <Icon icon="mdi:image-multiple-outline" width="14" className="text-blue-400" aria-hidden="true" />
                {t("title")}
              </PopoverTitle>
            </div>
          </PopoverHeader>

          <div className="flex border-b border-white/10 bg-black/20">
            <button
              onClick={() => setActiveTab("presets")}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all ${activeTab === "presets"
                ? "text-blue-400 border-b-2 border-blue-400 bg-blue-500/5"
                : "text-white/60 hover:text-white/80 hover:bg-white/5"
                }`}
            >
              <Icon icon="mdi:palette-outline" width="14" className="inline mr-1.5" />
              {t("tabs.presets")}
            </button>
            <button
              onClick={() => setActiveTab("custom")}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all ${activeTab === "custom"
                ? "text-blue-400 border-b-2 border-blue-400 bg-blue-500/5"
                : "text-white/60 hover:text-white/80 hover:bg-white/5"
                }`}
            >
              <Icon icon="mdi:tune" width="14" className="inline mr-1.5" />
              {t("tabs.custom")}
            </button>
          </div>

          <div className="p-4 max-h-120 overflow-y-auto custom-scrollbar">
            {activeTab === "presets" ? (
              <div className="grid grid-cols-2 gap-3 w-full">
                {onCustomReset && (
                  <button
                    onClick={onCustomReset}
                    className="group relative flex flex-col squircle-element border border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all overflow-hidden"
                  >
                    <div className="relative w-full aspect-video bg-zinc-900 flex flex-col items-center justify-center gap-1.5">
                      <div className="size-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center">
                        <Icon
                          icon="mdi:restore"
                          width="16"
                          className="text-white/70 group-hover:text-blue-400 transition-colors"
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-white/60 group-hover:text-white/80 transition-colors">
                        {t("resetDefault")}
                      </span>
                    </div>
                  </button>
                )}
                {presets.map((preset) => {
                  const active = preset.id === selectedPresetId;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => onSelectPreset(preset)}
                      className={`group relative flex flex-col squircle-element border transition-all overflow-hidden ${active ? "border-blue-500 bg-blue-500/10" : "border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10"}`}
                    >
                      <div className="relative w-full aspect-video bg-zinc-900">
                        {preset.imageUrl ? (
                          <img src={preset.imageUrl} alt={preset.label} className="w-full h-full object-cover" draggable={false} />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Icon icon="mdi:image-off-outline" width="20" className="text-white/30" />
                          </div>
                        )}

                        {/* Tu nuevo diseño de badge para el texto del preset */}
                        <div className="absolute bottom-0 left-0 bg-black/60 border-t border-r border-white/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-tight rounded-tr-md rounded-bl-lg z-30 max-w-[85%] truncate">
                          <span className={`transition-colors ${active ? "text-blue-400" : "text-white/80"}`}>
                            {preset.label}
                          </span>
                        </div>

                        {active && (
                          <div className="absolute top-2 right-2 z-30 size-4 rounded-full bg-blue-500 flex items-center justify-center shadow-xl">
                            <Icon icon="mdi:check" width="10" className="text-white" />
                          </div>
                        )}
                      </div>
                    </button>

                  );
                })}
              </div>
            ) : (
              <PositionCustomControls
                rotateX={rotateX}
                rotateY={rotateY}
                onRotationXYChange={onRotationXYChange}
                rotateZ={rotateZ}
                onRotateZChange={onRotateZChange}
                onReset={onCustomReset}
                labels={{
                  perspective: t("custom.perspective"),
                  scale: t("custom.scale"),
                  rotationXY: t("custom.rotationXY"),
                  rotationZ: t("custom.rotationZ"),
                  vertical: t("custom.vertical"),
                  reset: t("custom.reset"),
                }}
              />
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}