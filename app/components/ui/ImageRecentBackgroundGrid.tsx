"use client";

import { Icon } from "@iconify/react";
import { useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface ImageRecentBackgroundGridProps {
  images: string[];
  onSelect: (url: string) => void;
  onRemove: (url: string) => void;
  onUpload: (file: File) => void;
  selectedUrl?: string;
}

export function ImageRecentBackgroundGrid({ 
  images, 
  onSelect, 
  onRemove, 
  onUpload, 
  selectedUrl 
}: ImageRecentBackgroundGridProps) {
  const t = useTranslations("imageRecentGrid");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUpload(file);
    }
  };

  return (
    <div className="space-y-6">
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleFileSelect}
        aria-label={t("upload.action")}
      />
      
      <div 
        className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center hover:border-white/20 transition cursor-pointer group bg-white/2"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="button"
        aria-label={t("upload.instruction")}
        tabIndex={0}
      >
        <Icon icon="mdi:cloud-upload" className="text-3xl mx-auto mb-2 text-white/60 group-hover:text-white/70 transition-colors" aria-hidden="true" />
        <p className="text-xs text-white/70">
          {t("upload.instruction")} <span className="text-white">{t("upload.action")}</span>
        </p>
      </div>

      {images.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-white/70 font-bold mb-3 flex items-center gap-2">
            <Icon icon="mdi:history" width="14" aria-hidden="true" />
            <span>{t("sections.recent")}</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {images.map((url, i) => (
              <div 
                key={i} 
                onClick={() => onSelect(url)}
                className={`aspect-square squircle-element cursor-pointer hover:ring-2 ring-white/60 transition relative overflow-hidden group border border-white/10 ${
                  selectedUrl === url ? "ring-2 ring-white-500" : ""
                }`}
                role="button"
                aria-label={t("alt.recent", { index: i + 1 })}
                aria-pressed={selectedUrl === url}
              >
                <div className={`absolute inset-0 bg-white-500/20 transition-opacity z-10 flex items-center justify-center ${
                  selectedUrl === url ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}>
                  <Icon icon="mdi:check" className="text-white" width="14" aria-hidden="true" />
                </div>

                <button 
                  className="absolute top-1 right-1 z-20 p-1 rounded-md bg-black/40 text-white/70 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(url);
                  }}
                  aria-label={t("alt.recent", { index: i + 1 }) + " - Remove"}
                >
                  <Icon icon="lucide:trash-2" width="12" aria-hidden="true" />
                </button>

                {url ? (
                  <Image 
                    src={url} 
                    alt={t("alt.recent", { index: i })} 
                    fill 
                    className="object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all" 
                  />
                ) : (
                  <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
                    <Icon icon="mdi:image-broken-variant" className="text-white/20" width="24" aria-hidden="true" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}