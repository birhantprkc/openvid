"use client";

import { useRecording } from "@/app/contexts/RecordingContext";
import FloatingCameraPreview from "./FloatingCameraPreview";
import { useTranslations } from "next-intl";

export default function RecordingOverlay() {
    const t = useTranslations('recording.overlay');
    const {
        state,
        countdown,
        recordingTime,
        stopRecording,
        isCountdown,
        isRecording,
        isProcessing,
        cameraStream,
        cameraConfig,
        updateCameraConfig,
    } = useRecording();

    if (state === "idle") return null;

    const showFloatingCamera = isCountdown && cameraStream && cameraConfig?.enabled;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-9999 pointer-events-none">
            {showFloatingCamera && cameraStream && cameraConfig && (
                <FloatingCameraPreview
                    stream={cameraStream}
                    config={cameraConfig}
                    onConfigChange={updateCameraConfig}
                />
            )}
            {isCountdown && (
                <div className="absolute inset-0 bg-[#000B13]/95 backdrop-blur-md flex items-center justify-center z-50 pointer-events-auto">
                    <div className="flex flex-col items-center scale-110">
                        <div className="relative w-44 h-44 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full bg-[#00A3FF]/30 animate-ping" />
                            <div className="absolute inset-2 rounded-full bg-[#00A3FF]/20 animate-[ping_2s_linear_infinite]" />
                            <div className="relative w-40 h-40 rounded-full bg-gradient-primary p-1 shadow-[0_0_50px_rgba(0,163,255,0.3)]">
                                <div className="w-full h-full rounded-full bg-[#0E0E12] flex items-center justify-center">
                                    <span className="text-8xl font-bold text-white tabular-nums tracking-tighter">
                                        {countdown}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="text-center mt-12 space-y-3">
                            <h2 className="text-3xl font-bold text-white animate-pulse tracking-tight">
                                {t('countdown.title')}
                            </h2>
                            <p className="text-lg text-neutral-400 max-w-sm mx-auto px-4">
                                {t('countdown.subtitle')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {isRecording && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-auto">
                    <div className="flex items-center gap-4 bg-[#1E1E20] border border-white/10 rounded-full pl-5 pr-2 py-2 shadow-2xl">
                        <div className="flex items-center gap-3 pr-2 border-r border-white/10">
                            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-sm text-white font-medium">{t('recording.status')}</span>
                            <span className="text-sm text-red-400 font-mono font-bold">
                                {formatTime(recordingTime)}
                            </span>
                        </div>
                        <button
                            onClick={stopRecording}
                            className="group flex items-center gap-3 px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-full transition-all"
                            aria-label={t('recording.stop')}
                        >
                            <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
                                <div className="w-3 h-3 bg-red-500 rounded-sm group-hover:scale-110 transition-transform" />
                                {t('recording.stop')}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] bg-red-500/10 text-red-300 px-1.5 py-0.5 rounded border border-red-500/20">
                                <kbd>Alt</kbd>
                                <span>+</span>
                                <kbd>D</kbd>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {isProcessing && (
                <div className="absolute inset-0 bg-[#000B13]/95 backdrop-blur-md flex items-center justify-center pointer-events-auto z-50">
                    <div className="text-center">
                        <div className="relative w-20 h-20 mb-8 mx-auto">
                            <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#00A3FF] border-r-[#00A3FF]/30 animate-spin shadow-[0_0_20px_rgba(0,163,255,0.2)]" />
                            <div className="absolute inset-0 rounded-full bg-[#00A3FF]/5 blur-xl" />
                        </div>

                        <div className="space-y-2">
                            <p className="text-2xl font-semibold text-white tracking-tight">
                                {t('processing.title')}
                            </p>
                            <p className="text-neutral-400 font-medium">
                                {t('processing.subtitle')}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}