"use client";

import type { MockupConfig } from "@/types/mockup.types";
import { NoneMockup } from "./NoneMockup";
import { MacosMockup } from "./MacosMockup";
import { IPhoneSlimMockup } from "./IPhoneSlimMockup";
import { VSCodeMockup } from "./VSCodeMockup";
import { MacosGlassMockup } from "./MacosGlassMockup";
import { MacosGhostMockup } from "./MacosGhostMockup";
import { GlassUIContainerMockup } from "./GlassUIContainerMockup";
import { MacosGhostGlassMockup } from "./MacosGhostGlassMockup";
import { MacosContainerGlassMockup } from "./MacosContainerGlassMockup";
import { BraveMockup } from "./BraveMockup";
import { BraveGlassMockup } from "./BraveGlassMockup";
import { BrowserTabGlassMockup } from "./BrowserTabGlassMockup";
import { ChromeMockup } from "./ChromeMockup";
import { ChromeGlassMockup } from "./ChromeGlassMockup";
import { MacosGhostIdeMockup } from "./MacosGhostIdeMockup";
import { MacosDarkIdeMockup } from "./MacosDarkIdeMockup";
import { GlassCurveMockup } from "./GlassCurveMockup";
import { GlassFullMockup } from "./GlassFullMockup";
import { HardShellMockup } from "./HardShellMockup";
import { S24UltraMockup } from "./S24UltraMockup";
import { OutlineMockup } from "./OutlineMockup";
import { memo } from "react";

interface MockupWrapperProps {
    mockupId: string;
    config: MockupConfig;
    children: React.ReactNode;
    roundedCorners?: number;
    shadows?: number;
    className?: string;
}

function MockupWrapperInner({
    mockupId,
    config,
    children,
    roundedCorners = 12,
    shadows = 20,
    className = "",
}: MockupWrapperProps) {
    switch (mockupId) {
        case "none":
            return (
                <NoneMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </NoneMockup>
            );

        case "macos":
            return (
                <MacosMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </MacosMockup>
            );

        case "macos-glass":
            return (
                <MacosGlassMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </MacosGlassMockup>
            );

        case "outline":
            return (
                <OutlineMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </OutlineMockup>
            );

        case "glass-ui-container":
            return (
                <GlassUIContainerMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </GlassUIContainerMockup>
            );

        case "macos-ghost":
            return (
                <MacosGhostMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </MacosGhostMockup>
            );
        case "macos-ghost-glass":
            return (
                <MacosGhostGlassMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </MacosGhostGlassMockup>
            );

        case "macos-container-glass":
            return (
                <MacosContainerGlassMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </MacosContainerGlassMockup>
            );
        case "brave":
            return (
                <BraveMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </BraveMockup>
            );
        case "brave-glass":
            return (
                <BraveGlassMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </BraveGlassMockup>
            );
        case "browser-tab-glass":
            return (
                <BrowserTabGlassMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </BrowserTabGlassMockup>
            );
        case "chrome":
            return (
                <ChromeMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </ChromeMockup>
            );

        case "chrome-glass":
            return (
                <ChromeGlassMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </ChromeGlassMockup>
            );

        case "iphone-slim":
            return (
                <IPhoneSlimMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </IPhoneSlimMockup>
            );

        case "glass-curve":
            return (
                <GlassCurveMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </GlassCurveMockup>
            );

        case "glass-full":
            return (
                <GlassFullMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </GlassFullMockup>
            );

        case "hard-shell":
            return (
                <HardShellMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </HardShellMockup>
            );

        case "s24-ultra":
            return (
                <S24UltraMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </S24UltraMockup>
            );

        case "vscode":
            return (
                <VSCodeMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </VSCodeMockup>
            );
        case "macos-dark-ide":
            return (
                <MacosDarkIdeMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </MacosDarkIdeMockup>
            );
        case "macos-ghost-ide":
            return (
                <MacosGhostIdeMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </MacosGhostIdeMockup>
            );

        default:
            return (
                <NoneMockup
                    config={config}
                    roundedCorners={roundedCorners}
                    shadows={shadows}
                    className={className}
                >
                    {children}
                </NoneMockup>
            );
    }
}

export const MockupWrapper = memo(MockupWrapperInner);