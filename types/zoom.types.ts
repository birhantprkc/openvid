import { VideoThumbnail } from "./editor.types";

export interface ZoomFragment {
    id: string;
    startTime: number;
    endTime: number;
    zoomLevel: number;
    speed: number;
    focusX: number;
    focusY: number;
    movementEnabled?: boolean;
    movementEndX?: number;
    movementEndY?: number;
    movementStartOffset?: number;
    movementEndOffset?: number;
    enable3D?: boolean;
    perspective3DIntensity?: number;
    perspective3DAngleX?: number;
    perspective3DAngleY?: number;
}

export interface ZoomState {
    fragments: ZoomFragment[];
    selectedFragmentId: string | null;
}

export interface ZoomFragmentEditorProps {
    fragment: ZoomFragment;
    videoUrl: string | null;
    videoThumbnail?: string | null;
    currentTime?: number;
    getThumbnailForTime?: (time: number) => VideoThumbnail | null;
    videoDimensions?: { width: number; height: number } | null;
    onBack: () => void;
    onDelete: () => void;
    onUpdate: (updates: Partial<ZoomFragment>) => void;
}

// Smoother easing for professional zoom feel (quart curves)
export function easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
}

export function easeInOutQuart(t: number): number {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

// Calculate 3-phase zoom state based on current time within fragment
export interface ZoomPhaseState {
    phase: 'entry' | 'hold' | 'exit';
    scale: number;
    focusX: number;
    focusY: number;
    progress: number;
    rotateX: number;
    rotateY: number;
    perspective: number;
}

export function calculateZoomPhaseState(
    fragment: ZoomFragment,
    currentTime: number,
    forExport: boolean = false
): ZoomPhaseState {
    const totalDuration = fragment.endTime - fragment.startTime;
    const elapsed = currentTime - fragment.startTime;
    const normalizedTime = Math.max(0, Math.min(1, elapsed / totalDuration));

    const targetScale = zoomLevelToFactor(fragment.zoomLevel);
    const enable3D = fragment.enable3D ?? false;

    const transitionSeconds = speedToTransitionMs(fragment.speed) / 1000;
    const entryEndTime = fragment.startTime + transitionSeconds;
    const exitStartTime = fragment.endTime;
    const holdDuration = Math.max(0, exitStartTime - entryEndTime);

    let rotateX = 0;
    let rotateY = 0;
    let perspective = 0;
    let scale = forExport ? 1 : targetScale;
    let focusX = fragment.focusX;
    let focusY = fragment.focusY;
    let phase: 'entry' | 'hold' | 'exit' = 'hold';
    let progress = normalizedTime;

    const movementEndX = fragment.movementEndX ?? fragment.focusX;
    const movementEndY = fragment.movementEndY ?? fragment.focusY;

    // Determine phase and calculate ZOOM values (independent of 3D)
    if (currentTime < entryEndTime && transitionSeconds > 0) {
        // ENTRY PHASE: Zoom in
        phase = 'entry';
        const entryProgress = (currentTime - fragment.startTime) / transitionSeconds;
        progress = Math.max(0, Math.min(1, entryProgress));
        const easedProgress = easeOutQuart(progress);

        if (forExport) {
            scale = 1 + (targetScale - 1) * easedProgress;
        }

    } else if (currentTime >= exitStartTime && transitionSeconds > 0) {
        // EXIT PHASE: Zoom out
        phase = 'exit';
        const exitProgress = (currentTime - exitStartTime) / transitionSeconds;
        progress = Math.max(0, Math.min(1, exitProgress));
        const easedProgress = easeOutQuart(progress);

        if (forExport) {
            scale = targetScale - (targetScale - 1) * easedProgress;
        }

        if (fragment.movementEnabled) {
            focusX = movementEndX;
            focusY = movementEndY;
        }

    } else {
        phase = 'hold';

        if (forExport) {
            scale = targetScale;
        }

        if (fragment.movementEnabled && holdDuration > 0) {
            const movementStartOffset = fragment.movementStartOffset ?? 0;
            const movementEndOffset = fragment.movementEndOffset ?? holdDuration;

            const movementStartTime = entryEndTime + Math.max(0, Math.min(movementStartOffset, holdDuration));
            const movementEndTime = entryEndTime + Math.max(movementStartOffset, Math.min(movementEndOffset, holdDuration));
            const movementDuration = movementEndTime - movementStartTime;

            if (currentTime >= movementStartTime && currentTime <= movementEndTime && movementDuration > 0) {
                const movementProgress = (currentTime - movementStartTime) / movementDuration;
                const easedProgress = easeInOutQuart(Math.min(1, movementProgress));
                focusX = fragment.focusX + (movementEndX - fragment.focusX) * easedProgress;
                focusY = fragment.focusY + (movementEndY - fragment.focusY) * easedProgress;
                progress = movementProgress;
            } else if (currentTime > movementEndTime) {
                focusX = movementEndX;
                focusY = movementEndY;
                progress = 1;
            }
        }
    }

    // 3D EFFECT: Completely separate from zoom animation
    if (enable3D) {
        const intensity = (fragment.perspective3DIntensity ?? 50) / 100; 

        const baseAngleX = fragment.perspective3DAngleX ?? 0;
        const baseAngleY = fragment.perspective3DAngleY ?? 0;

        let effect3DOpacity = 0;

        if (phase === 'entry') {
            const entryProgress = (currentTime - fragment.startTime) / transitionSeconds;
            effect3DOpacity = Math.min(1, entryProgress * 1.2);
    } else if (phase === 'exit') {
  const exitProgress = (currentTime - exitStartTime) / transitionSeconds;
  effect3DOpacity = Math.max(0, 1 - exitProgress); // Reducción 1 a 1 perfecta
}else {
            effect3DOpacity = 1;
        }

        // Apply 3D with smooth easing
        const smoothOpacity = easeInOutQuart(effect3DOpacity);
        perspective = 500;

        const maxRotation = 32 * intensity;
        rotateX = (baseAngleX / 45) * maxRotation * smoothOpacity;
        rotateY = (baseAngleY / 45) * maxRotation * smoothOpacity;
    }

    return {
        phase,
        scale,
        focusX,
        focusY,
        progress,
        rotateX,
        rotateY,
        perspective,
    };
}

// Calculate available hold time for camera movement
export function calculateHoldDuration(fragment: ZoomFragment): number {
    const totalDuration = fragment.endTime - fragment.startTime;
    const transitionSeconds = speedToTransitionMs(fragment.speed) / 1000;
    return Math.max(0, totalDuration - 2 * transitionSeconds);
}

export interface ZoomStateCanvas {
    scale: number;
    focusX: number;
    focusY: number;
}

export interface ZoomState {
    scale: number;
    focusX: number;
    focusY: number;
}

const DEFAULT_ZOOM_LEVEL = 1.5;
const DEFAULT_ZOOM_SPEED = 5;

// Helper to create a new fragment with default values
export function createZoomFragment(
    startTime: number,
    endTime: number
): ZoomFragment {
    return {
        id: `zoom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        startTime,
        endTime,
        zoomLevel: DEFAULT_ZOOM_LEVEL,
        speed: DEFAULT_ZOOM_SPEED,
        focusX: 50,
        focusY: 50,
        movementEnabled: false,
    };
}

// Helper to generate default fragments when a video loads
export function generateDefaultZoomFragments(
    videoDuration: number
): ZoomFragment[] {
    if (videoDuration <= 0) return [];

    const fragmentDuration = 2;
    const spacing = videoDuration / 3;

    const fragments: ZoomFragment[] = [];

    const start1 = Math.max(0, spacing * 0.5);
    fragments.push(createZoomFragment(
        start1,
        Math.min(start1 + fragmentDuration, videoDuration)
    ));

    const start2 = Math.max(0, spacing * 2);
    fragments.push(createZoomFragment(
        start2,
        Math.min(start2 + fragmentDuration, videoDuration)
    ));

    return fragments;
}

// Convert zoomLevel (1-10) to actual zoom factor
export function zoomLevelToFactor(level: number): number {
    const minZoom = 1.2;
    const maxZoom = 4.0;
    const normalized = (level - 1) / 9;
    return minZoom + (maxZoom - minZoom) * normalized;
}

// Convert speed (1-10) to transition duration in milliseconds
export function speedToTransitionMs(speed: number): number {
    const minMs = 150;
    const maxMs = 2000;
    const normalized = (speed - 1) / 9;
    return Math.round(maxMs - (maxMs - minMs) * normalized);
}

export const ZOOM_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

export function formatZoomTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
