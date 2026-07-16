"use client";

import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { ZoomFragment } from "@/types/zoom.types";
import { formatZoomTime, zoomLevelToFactor } from "@/types/zoom.types";

interface ZoomGlobalConfigProps {
    fragments: ZoomFragment[];
    onSelectFragment: (fragmentId: string) => void;
    onAddFragment: () => void;
}

export function ZoomGlobalConfig({
    fragments,
    onSelectFragment,
    onAddFragment,
}: ZoomGlobalConfigProps) {
    const t = useTranslations("zoomGlobalConfig");

    return (
        <div className="p-4 flex flex-col gap-6">
            <div className="flex items-center">
                <div className="flex items-center gap-2 text-white font-medium">
                    <Icon icon="iconamoon:zoom-in-bold" width="20" aria-hidden="true" />
                    <span>{t("title")}</span>
                </div>
            </div>

            {fragments.length > 0 && (
                <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-widest text-white/70 font-bold">
                        {t("fragments.title", { count: fragments.length })}
                    </div>
                    <div
                        className="space-y-1.5"
                        role="list"
                        aria-label={t("fragments.title", { count: fragments.length })}
                    >
                        {fragments.map((fragment, index) => (
                            <button
                                key={fragment.id}
                                onClick={() => onSelectFragment(fragment.id)}
                                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[#09090B] border border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
                                role="listitem"
                                aria-label={`${t("fragments.label", { index: index + 1 })}, ${formatZoomTime(
                                    fragment.startTime
                                )} to ${formatZoomTime(fragment.endTime)}, ${zoomLevelToFactor(
                                    fragment.zoomLevel
                                ).toFixed(1)}× zoom`}
                            >
                                <div className="size-8 rounded-md bg-blue-500/20 flex items-center justify-center">
                                    <Icon
                                        icon="iconamoon:zoom-in-bold"
                                        width="14"
                                        className="text-blue-400"
                                        aria-hidden="true"
                                    />
                                </div>
                                <div className="flex flex-col items-start flex-1 min-w-0">
                                    <span className="text-xs text-white/80 font-medium">
                                        {t("fragments.label", { index: index + 1 })}
                                    </span>
                                    <span className="text-[11px] text-white/40 font-mono">
                                        {formatZoomTime(fragment.startTime)} - {formatZoomTime(fragment.endTime)}
                                    </span>
                                </div>
                                <div className="text-[11px] text-white/30 font-mono">
                                    {zoomLevelToFactor(fragment.zoomLevel).toFixed(1)}×
                                </div>
                                <Icon
                                    icon="ph:caret-right"
                                    width="14"
                                    className="text-white/20 group-hover:text-white/40"
                                    aria-hidden="true"
                                />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <Button
                variant="outline"
                className="w-full text-xs"
                onClick={onAddFragment}
                aria-label={t("fragments.add")}
            >
                <Icon icon="ph:plus-bold" width="14" aria-hidden="true" />
                {t("fragments.add")}
            </Button>

            <div className="text-[11px] text-white/60 space-y-1 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-white/5 rounded font-mono">{t("shortcuts.keys.delete")}</kbd>
                    <span>{t("shortcuts.delete")}</span>
                </div>
                <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-white/5 rounded font-mono">{t("shortcuts.keys.esc")}</kbd>
                    <span>{t("shortcuts.esc")}</span>
                </div>
                <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-white/5 rounded font-mono">{t("shortcuts.keys.click")}</kbd>
                    <span>{t("shortcuts.clickTrack")}</span>
                </div>
            </div>
        </div>
    );
}