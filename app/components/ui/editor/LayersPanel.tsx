"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import type { CanvasElement } from "@/types/canvas-elements.types";
import { LayersPanelProps, CtxMenuState, TYPE_ICON, PointerDragState } from "@/types/layers.types";
import { buildLayerNames, buildGroupNumbers } from "@/lib/layers.utils";
import ContextMenu from "./ContextMenu";
import { useTranslations } from "next-intl";
import { TooltipAction } from "@/components/ui/tooltip-action";
const VIDEO_SENTINEL = "__video__";

export function LayersPanel({
    elements,
    selectedId,
    selectedMultiIds,
    onSelect,
    onMultiSelect,
    onDelete,
    onReorder,
    onToggleVisible,
    onToggleLock,
    onBringToFront,
    onSendToBack,
    onGroup,
    onUngroup,
    onSetGroupId,
    toolbar,
    videoLayerVisible = false,
    onVideoLayerSelect,
    isVideoLayerSelected = false,
    mediaType = "video",
    hoveredElementId = null,
    onHoverElement,
}: LayersPanelProps) {
    const t = useTranslations("editor")
    const [isOpen, setIsOpen] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const selectedIdsRef = useRef<string[]>([]);
    selectedIdsRef.current = selectedIds;
    const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
    const [videoCtxMenu, setVideoCtxMenu] = useState<{ x: number; y: number } | null>(null);
    const tActions = useTranslations("elementsMenu");
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [groupCtxMenu, setGroupCtxMenu] = useState<{ x: number; y: number; groupId: string } | null>(null);

    const [pointerDrag, setPointerDrag] = useState<PointerDragState | null>(null);
    const pointerDragRef = useRef<PointerDragState | null>(null);
    pointerDragRef.current = pointerDrag;

    const listRef = useRef<HTMLDivElement>(null);
    const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const isDraggingRef = useRef(false);
    const ignoreSyncUntilRef = useRef<number>(0);

    const syncKey = elements.map((e) => e.id + ":" + e.zIndex + ":" + (e.groupId ?? "")).join(",");
    const insertVideoSentinel = useCallback((ids: string[]): string[] => {
        if (!videoLayerVisible) return ids;
        const zIndexOf = (id: string) => elements.find((e) => e.id === id)?.zIndex ?? 0;
        const idx = ids.findIndex((id) => zIndexOf(id) < 1000);
        return idx === -1
            ? [...ids, VIDEO_SENTINEL]
            : [...ids.slice(0, idx), VIDEO_SENTINEL, ...ids.slice(idx)];
    }, [elements, videoLayerVisible]);

    const [displayOrder, setDisplayOrder] = useState<string[]>(() =>
        insertVideoSentinel([...elements].sort((a, b) => b.zIndex - a.zIndex).map((e) => e.id))
    );

    useEffect(() => {
        if (isDraggingRef.current) return;
        if (Date.now() < ignoreSyncUntilRef.current) return;
        const sortedIncoming = [...elements].sort((a, b) => b.zIndex - a.zIndex).map((e) => e.id);
        setDisplayOrder(insertVideoSentinel(sortedIncoming));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncKey, videoLayerVisible]);

    useEffect(() => {
        if (selectedId) {
            setSelectedIds((prev) => (prev.includes(selectedId) ? prev : [selectedId]));
        } else {
            setSelectedIds([]);
        }
    }, [selectedId]);

    const multiIdsKey = selectedMultiIds ? selectedMultiIds.join(",") : "";
    useEffect(() => {
        if (selectedMultiIds && selectedMultiIds.length > 0) {
            setSelectedIds(selectedMultiIds);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [multiIdsKey]);

    useEffect(() => {
        if (!ctxMenu && !videoCtxMenu && !groupCtxMenu) return;
        const close = (e: PointerEvent) => {
            if ((e.target as HTMLElement).closest("[data-ctx-menu]")) return;
            setCtxMenu(null);
            setVideoCtxMenu(null);
            setGroupCtxMenu(null);
        };
        window.addEventListener("pointerdown", close);
        return () => window.removeEventListener("pointerdown", close);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!ctxMenu, !!videoCtxMenu, !!groupCtxMenu]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Delete" && e.key !== "Backspace") return;
            const tag = (e.target as HTMLElement).tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable)
                return;

            const ids = selectedIdsRef.current;
            if (ids.length > 0) {
                e.stopPropagation();
                e.preventDefault();
                onDelete(ids.length === 1 ? ids[0] : [...ids]);
                setSelectedIds([]);
                onSelect(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown, true);
        return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [onDelete, onSelect]);

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 639px)");

        const handler = (e: MediaQueryListEvent) => {
            setIsOpen(!e.matches);
        };

        setIsOpen(!mq.matches);

        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    const handleRowClick = useCallback(
        (e: React.MouseEvent, id: string) => {
            if (e.shiftKey) {
                const prev = selectedIdsRef.current;
                const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
                setSelectedIds(next);
                onMultiSelect?.(next);
            } else {
                setSelectedIds([id]);
                onSelect(id);
                onMultiSelect?.([id]);
            }
        },
        [onSelect, onMultiSelect]
    );

    const elementsById = useMemo(
        () => Object.fromEntries(elements.map((e) => [e.id, e])),
        [elements]
    );
    const layerNames = useMemo(() => buildLayerNames(elements), [elements]);
    const groupNumbers = useMemo(() => buildGroupNumbers(elements), [elements]);

    type VisualRow =
        | { kind: "element"; id: string }
        | { kind: "group"; groupId: string }
        | { kind: "video" };

    const visualRows = useMemo<VisualRow[]>(() => {
        const renderedGroupIds = new Set<string>();
        const rows: VisualRow[] = [];

        for (const id of displayOrder) {
            if (id === VIDEO_SENTINEL) {
                rows.push({ kind: "video" });
                continue;
            }
            const el = elementsById[id];
            if (!el) continue;

            if (el.groupId) {
                if (!renderedGroupIds.has(el.groupId)) {
                    renderedGroupIds.add(el.groupId);
                    rows.push({ kind: "group", groupId: el.groupId });
                    if (!collapsedGroups.has(el.groupId)) {
                        const members = displayOrder
                            .map((mid) => elementsById[mid])
                            .filter((m): m is CanvasElement => !!m && m.groupId === el.groupId);
                        members.forEach((m) => rows.push({ kind: "element", id: m.id }));
                    }
                }
            } else {
                rows.push({ kind: "element", id: el.id });
            }
        }
        return rows;
    }, [displayOrder, elementsById, collapsedGroups]);

    useEffect(() => {
        if (!pointerDrag) return;
        const MOVE_THRESHOLD = 5;

        const onMove = (e: MouseEvent) => {
            const drag = pointerDragRef.current;
            if (!drag) return;

            const moved = Math.abs(e.clientY - drag.startY) > MOVE_THRESHOLD;
            if (!moved && !drag.active) return;

            let dropIdx = drag.dropIndex;
            let bestDist = Infinity;
            let intoGroupId: string | null = null;
            const INTO_ZONE = 0.30;

            visualRows.forEach((row, i) => {
                const key = row.kind === "element" ? row.id : row.kind === "group" ? `group:${row.groupId}` : VIDEO_SENTINEL;
                if (key === drag.id) return;
                const el = rowRefs.current.get(key);
                if (!el) return;
                const rect = el.getBoundingClientRect();

                if (row.kind === "group" && !drag.isGroup && drag.id !== VIDEO_SENTINEL) {
                    const midTop = rect.top + rect.height * INTO_ZONE;
                    const midBot = rect.bottom - rect.height * INTO_ZONE;
                    if (e.clientY >= midTop && e.clientY <= midBot) {
                        const dist = Math.abs(e.clientY - (rect.top + rect.height / 2));
                        if (dist < bestDist) {
                            bestDist = dist;
                            intoGroupId = row.groupId;
                            dropIdx = i;
                        }
                        return;
                    }
                }

                const topDist = Math.abs(e.clientY - rect.top);
                if (topDist < bestDist) {
                    bestDist = topDist;
                    dropIdx = i;
                    intoGroupId = null;
                }
                if (i === visualRows.length - 1) {
                    const bottomDist = Math.abs(e.clientY - rect.bottom);
                    if (bottomDist < bestDist) {
                        bestDist = bottomDist;
                        dropIdx = i + 1;
                        intoGroupId = null;
                    }
                }
            });

            if (!drag.isGroup && !intoGroupId && drag.id !== VIDEO_SENTINEL && dropIdx > 0 && dropIdx < visualRows.length) {
                const prevRow = visualRows[dropIdx - 1];
                const nextRow = visualRows[dropIdx];

                if (prevRow.kind === "element" && nextRow.kind === "element") {
                    const prevEl = elementsById[prevRow.id];
                    const nextEl = elementsById[nextRow.id];

                    if (prevEl?.groupId && prevEl.groupId === nextEl?.groupId) {
                        intoGroupId = prevEl.groupId;
                    }
                }
            }

            const updated: PointerDragState = {
                ...drag,
                x: e.clientX,
                y: e.clientY,
                dropIndex: dropIdx,
                dropTargetGroupId: intoGroupId,
                active: true,
            };
            pointerDragRef.current = updated;
            setPointerDrag(updated);
        };

        const onUp = () => {
            const drag = pointerDragRef.current;
            if (drag?.active) {
                applyReorder(drag);
            }
            isDraggingRef.current = false;
            setPointerDrag(null);
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);

        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!pointerDrag, visualRows]);

    const applyReorder = useCallback(
        (drag: PointerDragState) => {
            const { id, isGroup, dropIndex, dropTargetGroupId } = drag;

            let movingIds: string[];
            if (isGroup) {
                const gid = id.replace("group:", "");
                movingIds = displayOrder.filter((did) => elementsById[did]?.groupId === gid);
            } else {
                movingIds = [id];
            }
            const movingSet = new Set(movingIds);

            if (dropTargetGroupId && !isGroup && id !== VIDEO_SENTINEL && onSetGroupId) {
                const dragged = elementsById[id];
                if (dragged && dragged.groupId !== dropTargetGroupId) {
                    ignoreSyncUntilRef.current = Date.now() + 1000;
                    onSetGroupId(id, dropTargetGroupId);
                }
                return;
            }

            let pendingGroupChange: { id: string; groupId: string | undefined } | null = null;
            if (!isGroup && id !== VIDEO_SENTINEL && onSetGroupId) {
                const dragged = elementsById[id];
                if (dragged?.groupId) {
                    const anchorVRow = visualRows[dropIndex];
                    let targetGid: string | undefined;
                    if (anchorVRow?.kind === "element") {
                        targetGid = elementsById[anchorVRow.id]?.groupId;
                    }
                    if (targetGid !== dragged.groupId) {
                        pendingGroupChange = { id, groupId: targetGid };
                    }
                }
            }

            const isRowDragged = (r: VisualRow) => {
                if (r.kind === "video") return movingSet.has(VIDEO_SENTINEL);

                if (r.kind === "element") return movingSet.has(r.id);
                if (r.kind === "group") {
                    const firstMember = displayOrder.find(
                        (did) => elementsById[did]?.groupId === r.groupId
                    );
                    return firstMember ? movingSet.has(firstMember) : false;
                }
                return false;
            };

            let nonDraggedCount = 0;
            for (let i = 0; i < dropIndex; i++) {
                if (!isRowDragged(visualRows[i])) nonDraggedCount++;
            }

            const without = displayOrder.filter((did) => !movingSet.has(did));
            const visualRowsWithout = visualRows.filter((r) => !isRowDragged(r));
            const anchorRow = visualRowsWithout[nonDraggedCount];
            let insertAt = without.length;

            if (anchorRow) {
                if (anchorRow.kind === "element") {
                    insertAt = without.indexOf(anchorRow.id);
                } else if (anchorRow.kind === "group") {
                    const firstMember = without.find(
                        (did) => elementsById[did]?.groupId === anchorRow.groupId
                    );
                    if (firstMember) insertAt = without.indexOf(firstMember);
                }
            }

            const next = [...without.slice(0, insertAt), ...movingIds, ...without.slice(insertAt)];
            const changed = next.some((val, i) => val !== displayOrder[i]);

            if (pendingGroupChange) {
                ignoreSyncUntilRef.current = Date.now() + 1500;
                onSetGroupId!(pendingGroupChange.id, pendingGroupChange.groupId);
            }
            if (changed) {
                ignoreSyncUntilRef.current = Math.max(ignoreSyncUntilRef.current, Date.now() + 1500);
                setDisplayOrder(next);
                const videoIdx = next.indexOf(VIDEO_SENTINEL);
                if (videoIdx === -1) {
                    onReorder(next, []);
                } else {
                    onReorder(
                        next.slice(0, videoIdx).filter((x) => x !== VIDEO_SENTINEL),
                        next.slice(videoIdx + 1).filter((x) => x !== VIDEO_SENTINEL)
                    );
                }
            }
        },
        [displayOrder, elementsById, visualRows, onReorder, onSetGroupId]
    );

    const startPointerDrag = useCallback(
        (e: React.MouseEvent, id: string, isGroup: boolean) => {
            if (e.button !== 0) return;
            const vIdx = visualRows.findIndex((r) => {
                if (r.kind === "video") return id === VIDEO_SENTINEL;
                if (r.kind === "element") return r.id === id;
                if (r.kind === "group") return `group:${r.groupId}` === id;
                return false;
            });
            isDraggingRef.current = true;
            const drag: PointerDragState = {
                id, isGroup,
                x: e.clientX, y: e.clientY, startY: e.clientY,
                dropIndex: vIdx >= 0 ? vIdx : 0,
                dropTargetGroupId: null,
                active: false,
            };
            pointerDragRef.current = drag;
            setPointerDrag(drag);
            e.preventDefault();
        },
        [visualRows]
    );

    const ctxId = ctxMenu?.id ?? null;
    const handleCtxBringToFront = useCallback(() => {
        if (ctxId) onBringToFront(ctxId);
        setCtxMenu(null);
    }, [ctxId, onBringToFront]);

    const handleCtxSendToBack = useCallback(() => {
        if (ctxId) onSendToBack(ctxId);
        setCtxMenu(null);
    }, [ctxId, onSendToBack]);

    const handleCtxDelete = useCallback(() => {
        if (ctxId) {
            onDelete(ctxId);
            setSelectedIds((p) => p.filter((x) => x !== ctxId));
        }
        setCtxMenu(null);
    }, [ctxId, onDelete]);

    const handleCtxDeleteSelected = useCallback(() => {
        onDelete([...selectedIds]);
        setSelectedIds([]);
        setCtxMenu(null);
    }, [selectedIds, onDelete]);

    const renderVideoRow = useCallback(
        (vIdx: number) => {
            const isDropTarget = pointerDrag?.active && pointerDrag.dropIndex === vIdx;
            const isSelected = isVideoLayerSelected;

            return (
                <div
                    key="video-layer"
                    ref={(node) => {
                        if (node) rowRefs.current.set("video-layer", node);
                        else rowRefs.current.delete("video-layer");
                    }}
                    onMouseDown={(e) => {
                        if ((e.target as HTMLElement).closest("button")) return;
                        startPointerDrag(e, VIDEO_SENTINEL, false);
                    }}
                    onClick={() => {
                        if (pointerDragRef.current?.active) return;
                        onVideoLayerSelect?.();
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        onVideoLayerSelect?.();
                        setVideoCtxMenu({ x: e.clientX, y: e.clientY });
                    }}
                    data-layer-row="video-layer"
                    className={[
                        "group relative flex items-center gap-1.5  h-7 px-2 rounded-md cursor-pointer select-none transition-all duration-100",
                        isSelected
                            ? "bg-[#00A3FF]/15 text-white"
                            : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200",
                    ].join(" ")}
                >
                    {isDropTarget && (
                        <div className="absolute -top-px left-0 right-0 h-0.5 rounded-full bg-blue-400 pointer-events-none z-10" />
                    )}
                    <div className="shrink-0 w-3 opacity-0" />
                    <Icon
                        icon={mediaType === "video" ? TYPE_ICON.video : TYPE_ICON.image}
                        className={`size-4.5 shrink-0 ${isSelected ? "text-[#00A3FF]" : "text-neutral-500"}`}
                        aria-hidden="true"
                    />
                    <span className="flex-1 text-[11px] truncate">
                        {mediaType === "video" ? t("layerPanel.videoLayer") : t("layerPanel.imageLayer")}
                    </span>
                </div>
            );
        },
        [pointerDrag, isVideoLayerSelected, onVideoLayerSelect, mediaType, t]
    );

    const renderLayerRow = useCallback(
        (el: CanvasElement, isGroupChild: boolean, vIdx: number) => {
            const id = el.id;
            const isSelected = selectedIds.includes(id);
            const isDraggingThis = pointerDrag?.active && pointerDrag.id === id;
            const isDropTarget = pointerDrag?.active && pointerDrag.dropIndex === vIdx;

            const isVisible = el.visible !== false;
            const isLocked = el.locked === true;

            return (
                <div
                    key={id}
                    ref={(node) => {
                        if (node) rowRefs.current.set(id, node);
                        else rowRefs.current.delete(id);
                    }}
                    onMouseDown={(e) => {
                        if (isLocked) return;
                        if ((e.target as HTMLElement).closest("button")) return;
                        startPointerDrag(e, id, false);
                    }}
                    onClick={(e) => {
                        if (pointerDragRef.current?.active) return;
                        handleRowClick(e, id);
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        if (!selectedIds.includes(id)) {
                            setSelectedIds([id]);
                            onSelect(id);
                        }
                        setCtxMenu({ x: e.clientX, y: e.clientY, id });
                    }}
                    onMouseEnter={() => {
                        if (!pointerDragRef.current?.active && onHoverElement) {
                            onHoverElement(id);
                        }
                    }}
                    onMouseLeave={() => {
                        if (onHoverElement && hoveredElementId === id) {
                            onHoverElement(null);
                        }
                    }}
                    data-layer-row={id}
                    className={[
                        "group relative flex items-center gap-1.5 h-7 rounded-md cursor-pointer select-none transition-all duration-100",
                        isGroupChild ? "pl-5 pr-2" : "px-2",
                        isDraggingThis ? "opacity-30 pointer-events-none" : "",
                        isSelected
                            ? "bg-[#00A3FF]/15 text-white"
                            : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200",
                    ].join(" ")}
                >
                    {isDropTarget && (
                        <div className="absolute -top-px left-0 right-0 h-0.5 rounded-full bg-blue-400 pointer-events-none z-10" />
                    )}
                    <div
                        className={`shrink-0 cursor-grab active:cursor-grabbing transition-opacity opacity-0 group-hover:opacity-100 ${isLocked ? "invisible" : ""
                            }`}
                    >
                        <Icon icon="icon-park-outline:drag" className="size-4 text-neutral-500" />
                    </div>
                    <Icon
                        icon={TYPE_ICON[el.type]}
                        className={`size-4.5 shrink-0 ${isSelected ? "text-[#00A3FF]" : "text-neutral-500"}`}
                    />
                    <span
                        className={`flex-1 text-[11px] truncate ${isVisible ? "" : "opacity-40 line-through"
                            }`}
                    >
                        {layerNames.get(id) ?? id}
                    </span>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <TooltipAction label={isVisible ? t("layerPanel.tooltips.hide") : t("layerPanel.tooltips.show")}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleVisible(id, !isVisible);
                                }}
                                className="flex items-center justify-center w-5 h-5 rounded hover:bg-white/10"
                                aria-label={isVisible ? t("layerPanel.tooltips.hide") : t("layerPanel.tooltips.show")}
                            >
                                <Icon
                                    icon={isVisible ? "solar:eye-bold" : "solar:eye-closed-bold"}
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </button>
                        </TooltipAction>

                        <TooltipAction label={isLocked ? t("layerPanel.tooltips.unlock") : t("layerPanel.tooltips.lock")}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleLock(id, !isLocked);
                                }}
                                className="flex items-center justify-center w-5 h-5 rounded hover:bg-white/10"
                                aria-label={isLocked ? t("layerPanel.tooltips.unlock") : t("layerPanel.tooltips.lock")}
                            >
                                <Icon
                                    icon={isLocked ? "gravity-ui:lock-fill" : "icon-park-solid:unlock"}
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </button>
                        </TooltipAction>

                        <TooltipAction label={t("layerPanel.tooltips.delete")}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(id);
                                    setSelectedIds((p) => p.filter((x) => x !== id));
                                }}
                                className="flex items-center justify-center w-5 h-5 rounded hover:bg-red-500/20"
                                aria-label={t("layerPanel.tooltips.delete")}
                            >
                                <Icon icon="ic:baseline-delete" className="size-4 hover:text-red-400" aria-hidden="true" />
                            </button>
                        </TooltipAction>
                    </div>
                    {!isVisible && (
                        <Icon
                            icon="solar:eye-closed-bold"
                            className="size-4 text-neutral-500 shrink-0 group-hover:hidden"
                            aria-hidden="true"
                        />
                    )}
                    {isLocked && (
                        <Icon
                            icon="solar:lock-bold"
                            className="size-4 text-neutral-500 shrink-0 group-hover:hidden"
                            aria-hidden="true"
                        />
                    )}
                </div>
            );
        },
        [
            selectedIds,
            pointerDrag,
            layerNames,
            startPointerDrag,
            handleRowClick,
            onSelect,
            onToggleVisible,
            onToggleLock,
            onDelete,
            onHoverElement,
            hoveredElementId,
            t
        ]
    );

    if (!isOpen) {
        return (
            <div className="flex flex-col items-center py-2 px-1 bg-[#111113] border-l border-white/6 gap-1">
                <TooltipAction label={t("layerPanel.tooltips.showLayers")}>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex items-center justify-center w-6 h-6 rounded hover:bg-white/10 transition-colors text-neutral-500 hover:text-neutral-200"
                    >
                        <Icon icon="solar:layers-minimalistic-bold" className="size-4.5" />
                    </button>
                </TooltipAction>
                <span className="text-[9px] text-neutral-500 [writing-mode:vertical-rl] rotate-180 mt-1 tracking-widest uppercase">
                    {t("layerPanel.layers")}
                </span>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col bg-[#111113] border-l border-white/6 select-none h-full"
            style={{ width: toolbar ? "auto" : "210px", minWidth: "210px" }}
        >
            {toolbar && <div className="shrink-0 border-b border-white/6">{toolbar}</div>}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/6 shrink-0">
                <span className="text-[11px] font-semibold text-neutral-300 tracking-wide uppercase">
                    {t("layerPanel.layers")}
                </span>
                <TooltipAction label={t("layerPanel.tooltips.hideLayers")}>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-center w-5 h-5 rounded hover:bg-white/10 transition-colors text-neutral-500 hover:text-neutral-200"
                    >
                        <Icon icon="solar:sidebar-minimalistic-bold" className="size-4.5" />
                    </button>
                </TooltipAction>
            </div>
            <div
                ref={listRef}
                className="flex-1 overflow-y-auto overflow-x-hidden py-1 px-1 relative"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        onSelect(null);
                        setSelectedIds([]);
                    }
                }}
            >
                {displayOrder.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-16 gap-2 text-neutral-500">
                        <Icon icon="solar:layers-minimalistic-bold" className="size-5" />
                        <span className="text-[10px]">{t("layerPanel.noLayers")}</span>
                    </div>
                ) : (
                    (() => {
                        const renderedGroupIds = new Set<string>();
                        const rows: React.ReactNode[] = [];
                        let groupCounter = 0;
                        let vIdx = 0;

                        for (const id of displayOrder) {
                            if (id === VIDEO_SENTINEL) {
                                rows.push(renderVideoRow(vIdx++));
                                continue;
                            }
                            const el = elementsById[id];
                            if (!el) continue;

                            if (el.groupId) {
                                if (renderedGroupIds.has(el.groupId)) {
                                    continue;
                                } else {
                                    renderedGroupIds.add(el.groupId);
                                    groupCounter++;
                                    const gid = el.groupId;
                                    const groupKey = `group:${gid}`;
                                    const groupMembers = displayOrder
                                        .map((mid) => elementsById[mid])
                                        .filter((e): e is CanvasElement => !!e && e.groupId === gid);
                                    const isCollapsed = collapsedGroups.has(gid);
                                    const thisGroupNum = groupNumbers.get(gid) ?? groupCounter;
                                    const isDraggingThisGroup = pointerDrag?.active && pointerDrag.id === groupKey;
                                    const currentGroupVIdx = vIdx++;
                                    const isGroupDropTarget =
                                        pointerDrag?.active && pointerDrag.dropIndex === currentGroupVIdx;

                                    rows.push(
                                        <div
                                            key={`group-${gid}`}
                                            ref={(node) => {
                                                if (node) rowRefs.current.set(groupKey, node);
                                                else rowRefs.current.delete(groupKey);
                                            }}
                                            onMouseDown={(e) => {
                                                if ((e.target as HTMLElement).closest("button")) return;
                                                startPointerDrag(e, groupKey, true);
                                            }}
                                            onClick={() => {
                                                if (pointerDragRef.current?.active) return;
                                                const memberIds = groupMembers.map((m) => m.id);
                                                setSelectedIds(memberIds);
                                                onMultiSelect?.(memberIds);
                                                if (memberIds.length > 0) onSelect(memberIds[0]);
                                            }}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const memberIds = groupMembers.map((m) => m.id);
                                                setSelectedIds(memberIds);
                                                onMultiSelect?.(memberIds);
                                                if (memberIds.length > 0) onSelect(memberIds[0]);
                                                setGroupCtxMenu({ x: e.clientX, y: e.clientY, groupId: gid });
                                            }}
                                            data-layer-row={groupKey}
                                            className={[
                                                "group relative flex items-center gap-1.5 h-7 px-2 rounded-md cursor-pointer select-none transition-all duration-100 text-neutral-400 hover:bg-white/5 hover:text-neutral-200",
                                                isDraggingThisGroup ? "opacity-30 pointer-events-none" : "",
                                                pointerDrag?.active && pointerDrag.dropTargetGroupId === gid
                                                    ? "ring-1 ring-blue-400 bg-blue-400/10"
                                                    : "",
                                            ].join(" ")}
                                        >
                                            {isGroupDropTarget && !pointerDrag?.dropTargetGroupId && (
                                                <div className="absolute -top-px left-0 right-0 h-0.5 rounded-full bg-blue-400 pointer-events-none z-10" />
                                            )}
                                            <div className="shrink-0 cursor-grab active:cursor-grabbing transition-opacity opacity-0 group-hover:opacity-100">
                                                <Icon icon="icon-park-outline:drag" className="size-4 text-neutral-500" />
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCollapsedGroups((prev) => {
                                                        const next = new Set(prev);
                                                        if (next.has(gid)) next.delete(gid);
                                                        else next.add(gid);
                                                        return next;
                                                    });
                                                }}
                                                className="flex items-center justify-center w-3.5 h-3.5 shrink-0"
                                            >
                                                <Icon
                                                    icon={isCollapsed ? "solar:alt-arrow-right-bold" : "solar:alt-arrow-down-bold"}
                                                    className="size-4 text-neutral-500"
                                                />
                                            </button>
                                            <Icon icon="solar:folder-bold" className="size-4.5 shrink-0 text-yellow-500/70" />
                                            <span className="flex-1 text-[11px] truncate">
                                                {t("layerPanel.group")} {thisGroupNum}
                                            </span>
                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <TooltipAction label={t("layerPanel.tooltips.deleteGroup")}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDelete(groupMembers.map((m) => m.id));
                                                            setSelectedIds((p) => p.filter((x) => !groupMembers.find((m) => m.id === x)));
                                                        }}
                                                        className="flex items-center justify-center w-5 h-5 rounded hover:bg-red-500/20"
                                                    >
                                                        <Icon icon="solar:trash-bin-trash-bold" className="size-4 hover:text-red-400" />
                                                    </button>
                                                </TooltipAction>
                                            </div>
                                            <span className="text-[9px] text-neutral-500 group-hover:hidden">
                                                {groupMembers.length}
                                            </span>
                                        </div>
                                    );
                                    if (!isCollapsed) {
                                        for (const member of groupMembers) {
                                            const childVIdx = vIdx++;
                                            rows.push(renderLayerRow(member, true, childVIdx));
                                        }
                                    }
                                }
                            } else {
                                const currentVIdx = vIdx++;
                                rows.push(renderLayerRow(el, false, currentVIdx));
                            }
                        }

                        if (pointerDrag?.active && pointerDrag.dropIndex === visualRows.length) {
                            rows.push(
                                <div key="drop-indicator-bottom" className="relative">
                                    <div className="absolute top-0 left-0 right-0 h-0.5 rounded-full bg-blue-400 pointer-events-none z-10" />
                                </div>
                            );
                        }
                        return rows;
                    })()
                )}
            </div>

            {selectedIds.length > 1 && (
                <div className="shrink-0 border-t border-white/6 px-2 py-1.5 flex items-center gap-1">
                    <span className="flex-1 text-[10px] text-neutral-500">
                        {selectedIds.length} {t("layerPanel.selected")}
                    </span>
                    {onGroup && (
                        <TooltipAction label={t("layerPanel.tooltips.groupSelected")}>
                            <button
                                onClick={() => onGroup(selectedIds)}
                                className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-neutral-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            >
                                <Icon icon="solar:layers-minimalistic-bold" className="size-4" /> {t("layerPanel.groupAction")}
                            </button>
                        </TooltipAction>
                    )}
                    {onUngroup && selectedIds.some((id) => elementsById[id]?.groupId) && (
                        <TooltipAction label={t("layerPanel.tooltips.ungroup")}>
                            <button
                                onClick={() => onUngroup(selectedIds)}
                                className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-neutral-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            >
                                <Icon icon="solar:layers-bold" className="size-4" /> {t("layerPanel.ungroupAction")}
                            </button>
                        </TooltipAction>
                    )}
                </div>
            )}

            {videoCtxMenu && (
                <div
                    data-ctx-menu
                    className="fixed z-[9999] bg-[#1c1c1f] border border-white/10 rounded-lg shadow-2xl py-1 min-w-40 overflow-hidden"
                    style={{ left: videoCtxMenu.x, top: videoCtxMenu.y }}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-neutral-300 hover:bg-white/6 text-left"
                        onClick={() => {
                            onReorder([], elements.map((e) => e.id));
                            setVideoCtxMenu(null);
                        }}
                    >
                        <Icon icon="qlementine-icons:bring-to-front-16" className="size-4.5 opacity-70" />
                        {tActions("actions.bringToFront")}
                    </button>
                    <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-neutral-300 hover:bg-white/6 text-left"
                        onClick={() => {
                            onReorder(elements.map((e) => e.id), []);
                            setVideoCtxMenu(null);
                        }}
                    >
                        <Icon icon="qlementine-icons:bring-to-back-16" className="size-4.5 opacity-70" />
                        {tActions("actions.sendToBack")}
                    </button>
                </div>
            )}

            {groupCtxMenu && (
                <div
                    data-ctx-menu
                    className="fixed z-[9999] bg-[#1c1c1f] border border-white/10 rounded-lg shadow-2xl py-1 min-w-40 overflow-hidden"
                    style={{ left: groupCtxMenu.x, top: groupCtxMenu.y }}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-neutral-300 hover:bg-white/6 text-left"
                        onClick={() => {
                            const memberIds = elements
                                .filter((e) => e.groupId === groupCtxMenu.groupId)
                                .map((e) => e.id);
                            onUngroup?.(memberIds);
                            setGroupCtxMenu(null);
                        }}
                    >
                        <Icon icon="solar:layers-bold" className="size-4 opacity-70" />
                        {t("layerPanel.ungroupAction")}
                    </button>
                    <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-500/10 text-left"
                        onClick={() => {
                            const memberIds = elements
                                .filter((e) => e.groupId === groupCtxMenu.groupId)
                                .map((e) => e.id);
                            onDelete(memberIds);
                            setSelectedIds((p) => p.filter((x) => !memberIds.includes(x)));
                            setGroupCtxMenu(null);
                        }}
                    >
                        <Icon icon="solar:trash-bin-trash-bold" className="size-4 opacity-70" />
                        {t("layerPanel.tooltips.deleteGroup")}
                    </button>
                </div>
            )}

            {ctxMenu &&
                (() => {
                    const allInSameGroup =
                        selectedIds.length > 1 &&
                        selectedIds.every((id) => {
                            const el = elementsById[id];
                            return el?.groupId && el.groupId === elementsById[selectedIds[0]]?.groupId;
                        });
                    const anyHasGroup = selectedIds.some((id) => elementsById[id]?.groupId);

                    return (
                        <ContextMenu
                            x={ctxMenu.x}
                            y={ctxMenu.y}
                            id={ctxMenu.id}
                            selectedIds={selectedIds}
                            canGroup={selectedIds.length > 1 && !allInSameGroup}
                            canUngroup={selectedIds.length > 1 && anyHasGroup}
                            onBringToFront={handleCtxBringToFront}
                            onSendToBack={handleCtxSendToBack}
                            onDelete={handleCtxDelete}
                            onDeleteSelected={handleCtxDeleteSelected}
                            onGroup={
                                onGroup
                                    ? () => {
                                        onGroup(selectedIds);
                                        setCtxMenu(null);
                                    }
                                    : undefined
                            }
                            onUngroup={
                                onUngroup
                                    ? () => {
                                        onUngroup(selectedIds);
                                        setCtxMenu(null);
                                    }
                                    : undefined
                            }
                            onClose={() => setCtxMenu(null)}
                        />
                    );
                })()}

            {pointerDrag?.active &&
                typeof document !== "undefined" &&
                (() => {
                    let ghostLabel = "";
                    let ghostIcon = "solar:layers-minimalistic-bold";
                    if (pointerDrag.isGroup) {
                        const gid = pointerDrag.id.replace("group:", "");
                        const gNum = groupNumbers.get(gid);
                        ghostLabel = `${t("layerPanel.group")} ${gNum ?? ""}`;
                        ghostIcon = "solar:folder-bold";
                    } else if (pointerDrag.id === VIDEO_SENTINEL) {
                        ghostLabel = mediaType === "video" ? t("layerPanel.videoLayer") : t("layerPanel.imageLayer");
                        ghostIcon = mediaType === "video" ? TYPE_ICON.video : TYPE_ICON.image;
                    } else {
                        const dragEl = elementsById[pointerDrag.id];
                        if (dragEl) {
                            ghostLabel = layerNames.get(pointerDrag.id) ?? pointerDrag.id;
                            ghostIcon = TYPE_ICON[dragEl.type];
                        }
                    }

                    return createPortal(
                        <div
                            className="fixed z-99999 pointer-events-none"
                            style={{
                                left: pointerDrag.x + 14,
                                top: pointerDrag.y - 14,
                            }}
                        >
                            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#1c1c1f]/90 border border-white/10 shadow-2xl backdrop-blur-sm">
                                <Icon icon={ghostIcon} className="size-4.5 text-[#00A3FF]" />
                                <span className="text-[11px] text-white font-medium max-w-30 truncate">
                                    {ghostLabel}
                                </span>
                            </div>
                        </div>,
                        document.body
                    );
                })()}
        </div>
    );
}