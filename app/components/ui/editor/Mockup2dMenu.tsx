"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { SliderControl } from "../../../../components/ui/SliderControl";
import { FRAME_COLORS, FRAME_COLORS_DARK, MockupConfig, MockupFeatures, getMockupFeatures } from "@/types/mockup.types";
import { MOCKUPS, MOCKUP_CATEGORIES } from "@/lib/mockup-data";
import { Button } from "@/components/ui/button";
import { DetailPageHeader } from "@/components/ui/DetailHeaderMenu";

export interface Mockup2dMenuProps {
  mockupId: string;
  mockupConfig?: MockupConfig;
  onMockupChange?: (mockupId: string) => void;
  onMockupConfigChange?: (config: Partial<MockupConfig>) => void;
  onBack: () => void;
}

export function Mockup2dMenu({
  mockupId,
  mockupConfig,
  onMockupChange,
  onMockupConfigChange,
  onBack,
}: Mockup2dMenuProps) {
  const t = useTranslations("mockupMenu");

  const currentMockup = MOCKUPS.find((m) => m.id === mockupId);
  const features: MockupFeatures = getMockupFeatures(currentMockup);

  const handleDarkModeChange = (isDark: boolean) => {
    const currentFrameColor = (mockupConfig?.frameColor || "#f6f6f6").toLowerCase();
    const isCurrentColorDark = FRAME_COLORS_DARK.includes(currentFrameColor);
    let newFrameColor = currentFrameColor;
    if (isDark && !isCurrentColorDark) newFrameColor = "#1e1e1e";
    else if (!isDark && isCurrentColorDark) newFrameColor = "#f6f6f6";
    onMockupConfigChange?.({ darkMode: isDark, frameColor: newFrameColor });
  };

  const handleFrameColorChange = (color: string) =>
    onMockupConfigChange?.({ frameColor: color.toLowerCase() });

  const handleUrlChange = (url: string) => onMockupConfigChange?.({ url });
  const handleHeaderScaleChange = (headerScale: number) => onMockupConfigChange?.({ headerScale });
  const handleHeaderOpacityChange = (headerOpacity: number) => onMockupConfigChange?.({ headerOpacity });

  const handleRemove = () => onMockupChange?.("none");

  return (
    <>
      <div className="flex items-center gap-2 p-3 border-b border-white/6 shrink-0">
        <DetailPageHeader
          label="Marco 2D"
          icon="hugeicons:ai-browser"
          onBack={onBack}
        />
      </div>

      <div className="p-4 flex flex-col gap-5">
        {currentMockup && (
          <div className="relative w-full h-32 squircle-element overflow-hidden bg-neutral-900 border border-blue-500/30">
            {(() => {
              const categoryConfig = MOCKUP_CATEGORIES.find(
                (c) => c.id === currentMockup.category
              );
              const bgUrl =
                categoryConfig?.bgUrl ||
                "https://i.ibb.co/r2JQ3Gcy/minimal-02.jpg";
              return (
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url('${bgUrl}')` }}
                />
              );
            })()}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {currentMockup.preview}
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
              <span className="text-[11px] font-bold text-white/90 tracking-wide">
                {currentMockup.name}
              </span>
            </div>
          </div>
        )}

        {features.hasDarkMode && (
          <fieldset className="flex items-center justify-between w-full gap-4">
            <legend className="float-left flex items-center gap-2 text-[11px] text-white/55 whitespace-nowrap">
              <Icon icon="ph:moon-bold" width="14" aria-hidden="true" />
              <span>{t("darkMode.label")}</span>
            </legend>
            <div
              className="flex items-center gap-1 p-0.5 rounded-lg bg-white/6 border border-white/[0.07]"
              role="group"
              aria-label={t("darkMode.label")}
            >
              <button
                onClick={() => handleDarkModeChange(true)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors ${mockupConfig?.darkMode
                  ? "bg-[#09090B] border border-white/10 text-white/70"
                  : "text-white/30 hover:text-white/50"
                  }`}
                aria-pressed={mockupConfig?.darkMode}
                aria-label={t("darkMode.dark")}
              >
                <Icon icon="ph:moon-bold" width="10" aria-hidden="true" />{" "}
                {t("darkMode.dark")}
              </button>
              <button
                onClick={() => handleDarkModeChange(false)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors ${!mockupConfig?.darkMode
                  ? "bg-[#09090B] border border-white/10 text-white/70"
                  : "text-white/30 hover:text-white/50"
                  }`}
                aria-pressed={!mockupConfig?.darkMode}
                aria-label={t("darkMode.light")}
              >
                <Icon icon="ph:sun-bold" width="10" aria-hidden="true" />{" "}
                {t("darkMode.light")}
              </button>
            </div>
          </fieldset>
        )}

        {features.hasFrameColor && (
          <div className="space-y-2.5">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
              {t("frameColor.label")}
            </p>
            <div className="grid grid-cols-6 gap-2">
              {FRAME_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleFrameColorChange(color)}
                  className={`aspect-square squircle-element cursor-pointer hover:ring-2 transition shadow-sm ring-white/60 border border-white/10 ${mockupConfig?.frameColor?.toLowerCase() === color.toLowerCase()
                    ? "ring-2 ring-white/90 shadow-lg shadow-white"
                    : "border-white/10 border-transparent hover:border-white/30"
                    }`}
                  style={{ backgroundColor: color }}
                  aria-label={t("frameColor.ariaLabel", { color })}
                />
              ))}
              <label className="aspect-square squircle-element border border-dashed border-white/30 bg-white/5 flex items-center justify-center hover:bg-white/10 transition group cursor-pointer relative">
                <Icon icon="mingcute:color-picker-fill" width="20" className="text-white/30" aria-hidden="true" />
                <input
                  type="color"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  onChange={(e) => handleFrameColorChange(e.target.value)}
                  value={mockupConfig?.frameColor || "#ffffff"}
                />
              </label>
            </div>
          </div>
        )}

        {features.hasUrl && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
              {t("url.label")}
            </p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#09090B] border border-white/[0.07] focus-within:border-blue-500/40 transition-colors">
              <Icon icon="line-md:link" width="13" className="text-white/30 shrink-0" aria-hidden="true" />
              <input
                type="text"
                value={mockupConfig?.url || ""}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder={t("url.placeholder")}
                className="flex-1 bg-transparent text-[11px] text-white/70 placeholder:text-white/20 outline-none font-mono"
                aria-label={t("url.label")}
              />
            </div>
          </div>
        )}

        {(features.hasHeaderScale || features.hasHeaderOpacity) && (
          <div className="space-y-3">
            {features.hasHeaderScale && (
              <SliderControl
                icon="mdi:resize"
                label={t("sliders.headerScale")}
                value={mockupConfig?.headerScale ?? 70}
                min={50}
                max={100}
                onChange={handleHeaderScaleChange}
              />
            )}
            {features.hasHeaderOpacity && (
              <SliderControl
                icon="mdi:opacity"
                label={t("sliders.headerOpacity")}
                value={mockupConfig?.headerOpacity ?? 100}
                min={0}
                max={100}
                onChange={handleHeaderOpacityChange}
              />
            )}
          </div>
        )}

        <Button
          onClick={handleRemove}
          variant="outline"
          className="w-full text-xs mt-auto"
          aria-label={t("remove")}
        >
          <Icon icon="ph:trash-bold" width="13" aria-hidden="true" />
          {t("remove")}
        </Button>
      </div>
    </>
  );
}
