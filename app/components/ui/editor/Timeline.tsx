"use client";
import { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { formatTime, getZoomMultiplier } from "@/lib/video.utils";
import { TIMELINE_LABEL_WIDTH, MIN_TRIM_DURATION } from "@/lib/constants";
import type { TimelineProps } from "@/types/timeline.types";
import LabelSidebar from "./LabelSidebar";
import { ZoomFragmentTrackItem, findValidFragmentPosition } from "./ZoomFragmentTrackItem";
import { AudioFragmentTrackItem } from "./AudioFragmentTrackItem";
import { VideoClipTrackItem } from "./VideoClipTrackItem";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";

const DEFAULT_ZOOM_FRAGMENT_DURATION = 2;

export function Timeline({
    videoDuration,
    currentTime,
    onSeek,
    videoUrl = null,
    zoomLevel,
    isDraggingPlayhead = false,
    onDragStart,
    onDragEnd,
    trimRange,
    onTrimChange,
    videoClips = [],
    selectedVideoClipId,
    onSelectVideoClip,
    onUpdateVideoClip,
    onDeleteVideoClip,
    zoomFragments = [],
    selectedZoomFragmentId,
    onSelectZoomFragment,
    onAddZoomFragment,
    onUpdateZoomFragment,
    onActivateZoomTool,
    audioTracks = [],
    uploadedAudios = [],
    selectedAudioTrackId,
    onSelectAudioTrack,
    onUpdateAudioTrack,
    globalSpeed = 1,
    isPlaying = false,
    onZoomChange,
}: TimelineProps) {
    const t = useTranslations("timeline");
    const trackRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [trackWidth, setTrackWidth] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isDraggingTrim, setIsDraggingTrim] = useState<'start' | 'end' | null>(null);
    const [draggingFragmentId, setDraggingFragmentId] = useState<string | null>(null);
    const [hoveredFragmentId, setHoveredFragmentId] = useState<string | null>(null);
    const [isDraggingVideoClip, setIsDraggingVideoClip] = useState(false);
    const pendingSeekRef = useRef<number | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const isSeekingRef = useRef<boolean>(false);
    const [isHoveringZoomRow, setIsHoveringZoomRow] = useState(false);
    const [ghostX, setGhostX] = useState(0);
    const ghostRafRef = useRef<number | null>(null);
    const pendingGhostXRef = useRef<number | null>(null);
    const lastValidPositionRef = useRef<{ startTime: number; endTime: number } | null>(null);
    const isOverFragment = useMemo(() => {
        return hoveredFragmentId ? zoomFragments.some(f => f.id === hoveredFragmentId) : false;
    }, [hoveredFragmentId, zoomFragments]);

    const isDraggingZoomFragment = useMemo(() => {
        return draggingFragmentId ? zoomFragments.some(f => f.id === draggingFragmentId) : false;
    }, [draggingFragmentId, zoomFragments]);
    const validDuration = useMemo(() => {
        if (videoClips.length > 0) {
            const lastClipEnd = Math.max(...videoClips.map(c => c.startTime + (c.trimEnd - c.trimStart)));
            return Number.isFinite(lastClipEnd) && lastClipEnd > 0 ? lastClipEnd : 0;
        }
        return Number.isFinite(videoDuration) && videoDuration > 0 ? videoDuration : 0;
    }, [videoDuration, videoClips]);

    const speed = globalSpeed && globalSpeed > 0 ? globalSpeed : 1;
    const scaledDuration = validDuration * speed;
    const outputDuration = validDuration / speed;
    const pendingTrimRef = useRef<{ start: number; end: number } | null>(null);
    const TRACK_PADDING = 0;

    const contentWidth = useMemo(() => {
        if (trackWidth === 0) return 0;
        const availableWidth = trackWidth - TRACK_PADDING;
        return availableWidth * getZoomMultiplier(zoomLevel);
    }, [trackWidth, zoomLevel]);

    const timelineWidth = useMemo(() => {
        return speed > 0 ? contentWidth / speed : contentWidth;
    }, [contentWidth, speed]);

    const playheadX = useMotionValue(0);
    const trimStartX = useMotionValue(0);
    const trimEndX = useMotionValue(0);
    const contentWidthMotion = useMotionValue(0);
    const timelineWidthMotion = useMotionValue(0);
    const validDurationMotion = useMotionValue(0);

    useEffect(() => {
        contentWidthMotion.set(contentWidth);
    }, [contentWidth, contentWidthMotion]);
    useEffect(() => {
        timelineWidthMotion.set(timelineWidth);
    }, [timelineWidth, timelineWidthMotion]);
    useEffect(() => {
        validDurationMotion.set(validDuration);
    }, [validDuration, validDurationMotion]);

    const trimmedDurationLabel = useTransform(
        [trimStartX, trimEndX, contentWidthMotion, validDurationMotion] as const,
        ([start, end, cw, vd]: number[]) => {
            const prefix = videoUrl ? 'Media Clip' : 'No Media';
            if (cw === 0 || vd === 0) return `${prefix} · 0:00`;
            const secs = ((end - start) / cw) * vd;
            return `${prefix} · ${formatTime(secs)}`;
        }
    );

    const trimStartPosition = useMemo(() => {
        if (scaledDuration === 0 || contentWidth === 0) return 0;
        return (trimRange.start / scaledDuration) * contentWidth;
    }, [trimRange.start, scaledDuration, contentWidth]);

    const trimEndPosition = useMemo(() => {
        if (scaledDuration === 0 || contentWidth === 0) return contentWidth;
        return (trimRange.end / scaledDuration) * contentWidth;
    }, [trimRange.end, scaledDuration, contentWidth]);

    useEffect(() => {
        if (!isDraggingTrim) {
            trimStartX.set(trimStartPosition);
            trimEndX.set(trimEndPosition);
        }
    }, [trimStartPosition, trimEndPosition, isDraggingTrim, trimStartX, trimEndX]);

    const playheadPosition = useMemo(() => {
        if (scaledDuration === 0 || contentWidth === 0) return 0;
        return (currentTime / scaledDuration) * contentWidth;
    }, [currentTime, scaledDuration, contentWidth]);

    useEffect(() => {
        const updateTrackWidth = () => {
            if (containerRef.current) {
                setTrackWidth(containerRef.current.clientWidth - 12 - TIMELINE_LABEL_WIDTH - 5);
            }
        };
        updateTrackWidth();
        window.addEventListener("resize", updateTrackWidth);
        return () => window.removeEventListener("resize", updateTrackWidth);
    }, []);

    useEffect(() => {
        if (!isDragging && !isDraggingPlayhead) {
            animate(playheadX, playheadPosition, { type: "tween", duration: 0.05, ease: "linear" });
        }
    }, [playheadPosition, isDragging, isDraggingPlayhead, playheadX]);

    useEffect(() => {
        return () => {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, []);

    const timeMarkers = useMemo(() => {
        if (outputDuration === 0 || validDuration === 0) return [];
        const baseInterval = outputDuration / 6;
        const adjustedInterval = baseInterval / Math.sqrt(getZoomMultiplier(zoomLevel));
        const markerCount = Math.ceil(outputDuration / adjustedInterval) + 1;
        return Array.from({ length: Math.min(markerCount, 50) }, (_, i) => ({
            time: adjustedInterval * i,
            position: (adjustedInterval * i / validDuration) * contentWidth
        })).filter(m => m.time <= outputDuration);
    }, [outputDuration, validDuration, zoomLevel, contentWidth]);

    const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (isDragging || isDraggingTrim) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const scrollLeft = e.currentTarget.scrollLeft;
        const clickX = e.clientX - rect.left + scrollLeft;
        if (clickX >= 0 && contentWidth > 0 && scaledDuration > 0) {
            const rawTime = (clickX / contentWidth) * scaledDuration;
            const boundedTime = Math.max(0, Math.min(validDuration, rawTime));
            const clampedTime = Math.max(trimRange.start, Math.min(trimRange.end, boundedTime));
            onSeek(clampedTime);
        }
    }, [contentWidth, scaledDuration, validDuration, onSeek, isDragging, isDraggingTrim, trimRange]);

    const handleDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (contentWidth === 0 || scaledDuration === 0) return;
        const maxX = videoClips.length > 0 ? timelineWidth : trimEndPosition;
        const minX = videoClips.length > 0 ? 0 : trimStartPosition;
        const newX = Math.max(minX, Math.min(maxX, playheadX.get() + info.delta.x));
        playheadX.set(newX);
        const newTime = (newX / contentWidth) * scaledDuration;
        pendingSeekRef.current = newTime;
        if (!isSeekingRef.current) {
            isSeekingRef.current = true;
            rafIdRef.current = requestAnimationFrame(() => {
                if (pendingSeekRef.current !== null) {
                    onSeek(pendingSeekRef.current);
                }
                isSeekingRef.current = false;
            });
        }
    }, [contentWidth, scaledDuration, timelineWidth, onSeek, playheadX, trimStartPosition, trimEndPosition, videoClips]);

    const handleDragStart = useCallback(() => {
        setIsDragging(true);
        pendingSeekRef.current = null;
        isSeekingRef.current = false;
        onDragStart?.();
    }, [onDragStart]);

    const handleDragEnd = useCallback(() => {
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        if (pendingSeekRef.current !== null) {
            onSeek(pendingSeekRef.current);
            pendingSeekRef.current = null;
        }
        isSeekingRef.current = false;
        setIsDragging(false);
        onDragEnd?.();
    }, [onDragEnd, onSeek]);

    const handleTrimStartDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (contentWidth === 0 || scaledDuration === 0) return;
        const newX = Math.max(0, Math.min(
            trimEndX.get() - (MIN_TRIM_DURATION / scaledDuration) * contentWidth,
            trimStartX.get() + info.delta.x
        ));
        trimStartX.set(newX);
        const newStartTime = (newX / contentWidth) * scaledDuration;
        pendingTrimRef.current = { start: Math.max(0, newStartTime), end: trimRange.end };
    }, [contentWidth, scaledDuration, trimStartX, trimEndX, trimRange.end]);

    const handleTrimEndDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (contentWidth === 0 || scaledDuration === 0) return;
        const newX = Math.min(
            timelineWidth,
            Math.max(
                trimStartX.get() + (MIN_TRIM_DURATION / scaledDuration) * contentWidth,
                trimEndX.get() + info.delta.x
            )
        );
        trimEndX.set(newX);
        const newEndTime = (newX / contentWidth) * scaledDuration;
        pendingTrimRef.current = { start: trimRange.start, end: Math.min(validDuration, newEndTime) };
    }, [contentWidth, scaledDuration, timelineWidth, validDuration, trimStartX, trimEndX, trimRange.start]);

    const handleTrimDragStart = useCallback((handle: 'start' | 'end') => {
        setIsDraggingTrim(handle);
        pendingTrimRef.current = null;
    }, []);

    const handleTrimDragEnd = useCallback(() => {
        setIsDraggingTrim(null);
        if (pendingTrimRef.current) {
            onTrimChange(pendingTrimRef.current);
            if (currentTime < pendingTrimRef.current.start) {
                onSeek(pendingTrimRef.current.start);
            } else if (currentTime > pendingTrimRef.current.end) {
                onSeek(pendingTrimRef.current.end);
            }
            pendingTrimRef.current = null;
        }
    }, [onTrimChange, currentTime, onSeek]);

    useEffect(() => {
        const scrollEl = trackRef.current;
        if (!scrollEl) return;
        if (isDragging || isDraggingTrim || isDraggingPlayhead) return;
        const visibleWidth = scrollEl.clientWidth;
        const scrollLeft = scrollEl.scrollLeft;
        const margin = 120;
        if (playheadPosition < scrollLeft + margin) {
            scrollEl.scrollTo({ left: Math.max(0, playheadPosition - margin), behavior: isPlaying ? 'auto' : 'smooth' });
        } else if (playheadPosition > scrollLeft + visibleWidth - margin) {
            scrollEl.scrollTo({ left: playheadPosition - visibleWidth + margin, behavior: isPlaying ? 'auto' : 'smooth' });
        }
    }, [playheadPosition, isDragging, isDraggingTrim, isDraggingPlayhead, isPlaying]);

    useEffect(() => {
        const scrollEl = trackRef.current;
        const isEdgeDragActive = isDragging || isDraggingTrim !== null;
        if (!scrollEl || !isEdgeDragActive) return;
        const EDGE_ZONE = 60;
        const MAX_PAN_SPEED = 16;
        let rafId: number;
        const tick = () => {
            const activeX = isDraggingTrim === 'start' ? trimStartX.get() : isDraggingTrim === 'end' ? trimEndX.get() : playheadX.get();
            const visibleWidth = scrollEl.clientWidth;
            const scrollLeft = scrollEl.scrollLeft;
            if (activeX < scrollLeft + EDGE_ZONE) {
                const intensity = Math.min(1, (scrollLeft + EDGE_ZONE - activeX) / EDGE_ZONE);
                scrollEl.scrollLeft = Math.max(0, scrollLeft - MAX_PAN_SPEED * intensity);
            } else if (activeX > scrollLeft + visibleWidth - EDGE_ZONE) {
                const intensity = Math.min(1, (activeX - (scrollLeft + visibleWidth - EDGE_ZONE)) / EDGE_ZONE);
                scrollEl.scrollLeft = scrollLeft + MAX_PAN_SPEED * intensity;
            }
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [isDragging, isDraggingTrim, playheadX, trimStartX, trimEndX]);

    const calculateProgressWidth = useCallback(([px, start, end]: number[]) => {
        const width = end - start;
        if (width <= 0) return 0;
        const clampedX = Math.max(start, Math.min(px, end));
        return Math.max(0, clampedX - start);
    }, []);

    const progressWidth = useTransform(
        [playheadX, trimStartX, trimEndX] as const,
        calculateProgressWidth
    );

    const clipLeftMotion = useTransform(trimStartX, (x) => x);
    const clipWidthMotion = useTransform(
        [trimStartX, trimEndX] as const,
        ([start, end]: number[]) => Math.max(end - start, 20)
    );

    const trimOverlayLeftWidth = useTransform(trimStartX, (x) => x);
    const trimOverlayRightLeft = useTransform(trimEndX, (x) => x);
    const trimOverlayRightWidth = useTransform(
        [trimEndX, timelineWidthMotion] as const,
        ([end, tw]: number[]) => tw - end
    );

    useEffect(() => {
        return () => {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            if (ghostRafRef.current) cancelAnimationFrame(ghostRafRef.current);
        };
    }, []);

    const ghostState = useMemo(() => {
        if (!isHoveringZoomRow || isDraggingZoomFragment || isOverFragment) return null;
        if (contentWidth === 0 || scaledDuration === 0) return null;
        const hoverTime = (ghostX / contentWidth) * scaledDuration;
        const validPosition = findValidFragmentPosition(
            hoverTime,
            DEFAULT_ZOOM_FRAGMENT_DURATION,
            zoomFragments,
            validDuration
        );
        return { validPosition };
    }, [isHoveringZoomRow, isDraggingZoomFragment, isOverFragment, ghostX, contentWidth, scaledDuration, validDuration, zoomFragments]);

    useEffect(() => {
        lastValidPositionRef.current = ghostState?.validPosition ?? null;
    }, [ghostState]);

    return (
        <div ref={containerRef} className="flex flex-col w-full pr-2">
            <div className="h-38 shrink-0 bg-[#0D0D11] border-t border-white/10 flex flex-col font-mono text-[11px]">
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <LabelSidebar audioTracksCount={audioTracks.length} />

                    <div
                        ref={trackRef}
                        className={`flex-1 flex flex-col overflow-x-auto custom-scrollbar pl-14 pr-2 ${audioTracks.length > 0 ? "overflow-y-auto no-scrollbar" : "overflow-y-hidden"
                            }`}
                    >
                        <div
                            className="relative flex flex-col min-h-full h-max pb-1"
                            style={{ width: timelineWidth > 0 ? timelineWidth : '100%', minWidth: '100%' }}
                        >
                            <motion.div
                                className="absolute top-0 bottom-0 z-20 flex flex-col items-center cursor-ew-resize group select-none"
                                style={{ x: playheadX, translateX: "-50%" }}
                                role="slider"
                                aria-label={`Playhead at ${formatTime(currentTime)}`}
                                aria-valuemin={videoClips.length > 0 ? 0 : trimRange.start}
                                aria-valuemax={videoClips.length > 0 ? validDuration : trimRange.end}
                                aria-valuenow={currentTime}
                                tabIndex={0}
                                drag="x"
                                dragConstraints={{
                                    left: videoClips.length > 0 ? 0 : trimStartPosition,
                                    right: videoClips.length > 0 ? timelineWidth : trimEndPosition
                                }}
                                dragElastic={0}
                                dragMomentum={false}
                                onDrag={handleDrag}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            >
                                <div
                                    className={`w-3.5 h-3.5 mt-0.75 shrink-0 transition-all duration-150 origin-top ${isDragging
                                        ? 'bg-blue-200 scale-135 shadow-[0_0_15px_rgba(147,197,253,0.9)] ease-out'
                                        : 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.4)] group-hover:bg-blue-300 group-hover:scale-110 ease-in-out'
                                        }`}
                                    style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 60%, 50% 100%, 0% 60%)' }}
                                />
                                <div
                                    className={`w-px h-full transition-all duration-150 ${isDragging
                                        ? 'bg-blue-200 w-[2px] shadow-[0_0_8px_rgba(147,197,253,0.5)] ease-out'
                                        : 'bg-blue-400 group-hover:bg-blue-300'
                                        }`}
                                />
                            </motion.div>

                            <div
                                className="h-[22px] border-b border-white/10 relative shrink-0 cursor-pointer bg-zinc-900/40 select-none overflow-hidden"
                                onClick={handleTrackClick}
                            >
                                <div
                                    className="absolute inset-0 opacity-20 pointer-events-none"
                                    style={{
                                        backgroundImage: `linear-gradient(to right, #ccc 1px, transparent 1px)`,
                                        backgroundSize: `${10 * zoomLevel}px 6px`,
                                        backgroundPosition: `0px 6px`,
                                        backgroundRepeat: 'repeat-x'
                                    }}
                                />
                                <div className="absolute inset-0 pointer-events-none">
                                    {validDuration > 0 && timeMarkers.map((marker, i) => (
                                        <span
                                            key={i}
                                            className="absolute top-1 select-none text-[11px] leading-none text-zinc-500 font-mono"
                                            style={{
                                                left: marker.position,
                                                transform: i === 0 ? 'translateX(0)' : i === timeMarkers.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
                                                textShadow: '0 0 2px #0D0D11, 0 0 4px #0D0D11'
                                            }}
                                        >
                                            {formatTime(marker.time)}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col min-h-max" onClick={handleTrackClick}>

                                <div className="flex-1 min-h-[55px] shrink-0 flex items-center py-0.5 relative">
                                    <div className="h-full w-full rounded-md flex items-center relative bg-[#0a1510] border border-white/5">
                                        {videoClips.length > 0 ? (
                                            <>
                                                {videoClips.map((clip) => (
                                                    <VideoClipTrackItem
                                                        key={clip.id}
                                                        clip={clip}
                                                        isSelected={selectedVideoClipId === clip.id}
                                                        contentWidth={contentWidth}
                                                        totalDuration={scaledDuration}
                                                        speed={speed}
                                                        otherClips={videoClips.filter(c => c.id !== clip.id)}
                                                        currentTime={currentTime}
                                                        playheadX={playheadX}
                                                        onSelect={() => onSelectVideoClip?.(clip.id)}
                                                        onUpdate={(updates) => onUpdateVideoClip?.(clip.id, updates)}
                                                        onDelete={() => onDeleteVideoClip?.(clip.id)}
                                                        onDragStateChange={setIsDraggingVideoClip}
                                                        zoomLevel={zoomLevel}
                                                    />
                                                ))}
                                            </>
                                        ) : (
                                            <>
                                                {trimRange.start > 0 && (
                                                    <motion.div className="absolute left-0 top-0 bottom-0 bg-black/60 rounded-l-md z-10" style={{ width: trimOverlayLeftWidth }} />
                                                )}
                                                {trimRange.end < validDuration && (
                                                    <motion.div className="absolute right-0 top-0 bottom-0 bg-black/60 rounded-r-md z-10" style={{ left: trimOverlayRightLeft, width: trimOverlayRightWidth }} />
                                                )}
                                                <motion.div
                                                    className="absolute top-0 bottom-0 rounded-md border border-[#34A853]/40 bg-[#182e20] overflow-hidden"
                                                    style={{ left: clipLeftMotion, width: clipWidthMotion }}
                                                >
                                                    <div className="absolute inset-0 flex items-center overflow-hidden">
                                                        <div className="flex h-full w-full">
                                                            {videoUrl && Array.from({ length: Math.max(1, Math.ceil(getZoomMultiplier(zoomLevel) * 3)) }).map((_, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="h-full flex-1 border-r border-[#34A853]/10 last:border-r-0"
                                                                    style={{
                                                                        background: 'linear-gradient(to top, rgba(0, 0, 0, 0) 0%, rgba(20, 80, 40, 0.1) 50%, rgba(52, 168, 83, 0.1) 100%)',
                                                                        boxShadow: 'inset 0px 1px 0px rgba(255, 255, 255, 0.05)'
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <motion.div
                                                        className="absolute top-0 bottom-0 -left-px border-r-2 border-[#4ade80]"
                                                        style={{
                                                            width: progressWidth,
                                                            background: `linear-gradient(to bottom, rgba(52, 168, 83, 0.9) 0%, rgba(34, 139, 34, 1) 50%, rgba(20, 80, 40, 1) 100%)`,
                                                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)'
                                                        }}
                                                    />
                                                    <motion.span
                                                        className="flex items-center justify-center gap-2 text-emerald-400 text-[11px] font-medium ml-3 relative z-10 drop-shadow-sm h-full"
                                                    >
                                                        {trimmedDurationLabel}
                                                    </motion.span>
                                                </motion.div>
                                                <motion.div
                                                    className="absolute top-0 bottom-0 w-3 cursor-ew-resize z-20 group/trim flex items-center justify-center"
                                                    style={{ x: trimStartX, translateX: "-50%" }}
                                                    role="slider"
                                                    aria-label={`Trim start at ${formatTime(trimRange.start)}`}
                                                    aria-valuemin={0}
                                                    aria-valuemax={trimRange.end}
                                                    aria-valuenow={trimRange.start}
                                                    tabIndex={0}
                                                    drag="x"
                                                    dragConstraints={{ left: 0, right: timelineWidth }}
                                                    dragElastic={0}
                                                    dragMomentum={false}
                                                    onDrag={handleTrimStartDrag}
                                                    onDragStart={() => handleTrimDragStart('start')}
                                                    onDragEnd={handleTrimDragEnd}
                                                >
                                                    <div className={`w-1.5 h-8 rounded-full transition-all ${isDraggingTrim === 'start' ? 'bg-[#4ade80] scale-110' : 'bg-[#34A853] group-hover/trim:bg-[#4ade80]'}`} aria-hidden="true" />
                                                </motion.div>
                                                <motion.div
                                                    className="absolute top-0 bottom-0 w-3 cursor-ew-resize z-20 group/trim flex items-center justify-center"
                                                    style={{ x: trimEndX, translateX: "-50%" }}
                                                    role="slider"
                                                    aria-label={`Trim end at ${formatTime(trimRange.end)}`}
                                                    aria-valuemin={trimRange.start}
                                                    aria-valuemax={validDuration}
                                                    aria-valuenow={trimRange.end}
                                                    tabIndex={0}
                                                    drag="x"
                                                    dragConstraints={{ left: 0, right: timelineWidth }}
                                                    dragElastic={0}
                                                    dragMomentum={false}
                                                    onDrag={handleTrimEndDrag}
                                                    onDragStart={() => handleTrimDragStart('end')}
                                                    onDragEnd={handleTrimDragEnd}
                                                >
                                                    <div className={`w-1.5 h-8 rounded-full transition-all ${isDraggingTrim === 'end' ? 'bg-[#4ade80] scale-110' : 'bg-[#34A853] group-hover/trim:bg-[#4ade80]'}`} aria-hidden="true" />
                                                </motion.div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div
                                    className="h-[55px] shrink-0 w-full flex items-center relative"
                                    onMouseMove={(e) => {
                                        if (isDraggingZoomFragment) return;
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        pendingGhostXRef.current = e.clientX - rect.left;
                                        if (ghostRafRef.current === null) {
                                            ghostRafRef.current = requestAnimationFrame(() => {
                                                if (pendingGhostXRef.current !== null) setGhostX(pendingGhostXRef.current);
                                                ghostRafRef.current = null;
                                            });
                                        }
                                        setIsHoveringZoomRow(true);
                                    }}
                                    onMouseLeave={() => setIsHoveringZoomRow(false)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isOverFragment || isDraggingZoomFragment || !onAddZoomFragment) return;
                                        const validPosition = lastValidPositionRef.current;
                                        if (validPosition) {
                                            onAddZoomFragment(validPosition.startTime, validPosition.endTime);
                                        }
                                    }}
                                >
                                    <div className="h-full w-full flex items-center relative">
                                        {zoomFragments.map((fragment) => (
                                            <ZoomFragmentTrackItem
                                                key={fragment.id}
                                                fragment={fragment}
                                                isSelected={fragment.id === selectedZoomFragmentId}
                                                contentWidth={contentWidth}
                                                videoDuration={scaledDuration}
                                                contentDuration={validDuration}
                                                speed={speed}
                                                otherFragments={zoomFragments.filter(f => f.id !== fragment.id)}
                                                onSelect={() => {
                                                    onSelectZoomFragment?.(fragment.id);
                                                    onActivateZoomTool?.();
                                                }}
                                                onUpdate={(updates) => onUpdateZoomFragment?.(fragment.id, updates)}
                                                onDragStateChange={(dragging) => {
                                                    if (dragging) {
                                                        setDraggingFragmentId(fragment.id);
                                                        setHoveredFragmentId(fragment.id);
                                                        setIsHoveringZoomRow(false);
                                                    } else {
                                                        setDraggingFragmentId(prev => prev === fragment.id ? null : prev);
                                                    }
                                                }}
                                                onMouseEnter={() => setHoveredFragmentId(fragment.id)}
                                                onMouseLeave={() => setHoveredFragmentId(prev => prev === fragment.id ? null : prev)}
                                            />
                                        ))}
                                        {ghostState?.validPosition && (
                                            <motion.div
                                                className="absolute top-[10%] h-[80%] pointer-events-none"
                                                initial={false}
                                                animate={{
                                                    left: (ghostState.validPosition.startTime / scaledDuration) * contentWidth,
                                                    width: ((ghostState.validPosition.endTime - ghostState.validPosition.startTime) / scaledDuration) * contentWidth,
                                                }}
                                                transition={{ duration: 0 }}
                                            >
                                                <div className="w-full h-full rounded border border-dashed border-blue-400/50 bg-blue-500/10 flex flex-col items-center justify-center gap-0.5">
                                                    <Icon icon="qlementine-icons:zoom-12" width="12" height="12" className="text-blue-400" aria-hidden="true" />
                                                    <span className="text-[8px] font-mono text-blue-400/60">+ Zoom</span>
                                                </div>
                                            </motion.div>
                                        )}
                                        {isHoveringZoomRow && !isDraggingZoomFragment && !isOverFragment && ghostState && !ghostState.validPosition && (
                                            <div
                                                className="absolute top-[10%] h-[80%] w-32 pointer-events-none"
                                                style={{ left: ghostX - 64 }}
                                            >
                                                <div className="w-full h-full rounded border border-dashed border-red-400/50 bg-red-500/10 flex flex-col items-center justify-center gap-0.5">
                                                    <span className="text-[8px] font-mono text-red-400/60"> {t("noSpace")}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {audioTracks.length > 0 && (
                                    <div className="h-[55px] shrink-0 w-full flex items-center relative">
                                        <div className="h-full w-full flex items-center relative">
                                            {audioTracks.map((track) => {
                                                const audio = uploadedAudios?.find(a => a.id === track.audioId);
                                                return (
                                                    <AudioFragmentTrackItem
                                                        key={track.id}
                                                        track={track}
                                                        audio={audio}
                                                        isSelected={track.id === selectedAudioTrackId}
                                                        contentWidth={contentWidth}
                                                        videoDuration={scaledDuration}
                                                        contentDuration={validDuration}
                                                        speed={speed}
                                                        otherTracks={audioTracks.filter(t => t.id !== track.id)}
                                                        onSelect={() => onSelectAudioTrack?.(track.id)}
                                                        onUpdate={(updates) => onUpdateAudioTrack?.(track.id, updates)}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}