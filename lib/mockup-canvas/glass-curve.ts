import { hexToRgba } from "@/lib/utils";
import type { MockupCanvasContext, MockupDrawResult } from "./types";
import { drawRoundedRectPath, drawMockupShadow } from "./shared";

export function drawGlassCurveMockup(context: MockupCanvasContext): MockupDrawResult {
  const { ctx, x, y, width, height, config, cornerRadius, shadowBlur } = context;

  const isDark = config.darkMode;
  const frameColor = isDark ? config.frameColor : "#ffffff";
  const headerOpacity = config.headerOpacity ?? 10;
  const headerScale = (config.headerScale || 100) / 100;

  const framePadding = 24 * headerScale;
  const reflectionWidth = 16 * headerScale;

  const notchTop = 28 * headerScale;
  const notchWidth = 120 * headerScale;
  const notchHeight = 12 * headerScale;
  const contentPaddingTop = 90 * headerScale;

  const screenBg = isDark ? "#0a0a0a" : "#ffffff";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.4)";
  const reflectionColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.2)";
  const notchBg = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.05)";

  const outerRadius = cornerRadius * 8;

  drawMockupShadow(ctx, x, y, width, height, outerRadius, shadowBlur);

  ctx.save();
  drawRoundedRectPath(ctx, x, y, width, height, outerRadius);
  ctx.fillStyle = hexToRgba(frameColor, headerOpacity);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.clip();
  const leftGradient = ctx.createLinearGradient(x, y, x + reflectionWidth, y);
  leftGradient.addColorStop(0, reflectionColor);
  leftGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = leftGradient;
  ctx.fillRect(x, y, reflectionWidth, height);

  const rightGradient = ctx.createLinearGradient(x + width, y, x + width - reflectionWidth, y);
  rightGradient.addColorStop(0, reflectionColor);
  rightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = rightGradient;
  ctx.fillRect(x + width - reflectionWidth, y, reflectionWidth, height);
  ctx.restore();

  const screenX = x + framePadding;
  const screenY = y + framePadding;
  const screenWidth = width - framePadding * 2;
  const screenHeight = height - framePadding * 2;
  const innerRadius = Math.max(0, outerRadius - framePadding);

  ctx.save();
  drawRoundedRectPath(ctx, screenX, screenY, screenWidth, screenHeight, innerRadius);
  ctx.fillStyle = screenBg;
  ctx.fill();
  ctx.restore();

  const notchX = screenX + (screenWidth - notchWidth) / 2;
  const notchY = screenY + notchTop;

  ctx.save();
  drawRoundedRectPath(ctx, notchX, notchY, notchWidth, notchHeight, notchHeight / 2);
  ctx.fillStyle = notchBg;
  ctx.fill();
  ctx.restore();

  return {
    contentX: screenX,
    contentY: screenY + contentPaddingTop,
    contentWidth: screenWidth,
    contentHeight: screenHeight - contentPaddingTop,
  };
}