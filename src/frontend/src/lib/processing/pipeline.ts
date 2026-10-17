/**
 * Browser-side processing pipeline.
 *
 * The single entry point the workspace preview and the render page both use.
 * Every stage runs on the user's own device against a canvas — footage is never
 * uploaded for processing. The order is deliberate: inpaint the watermark
 * first, then matte the background, then apply the enhancement chain, so the
 * enhancement grades the final composited frame rather than the raw one.
 */

import {
  type EnhanceSettings,
  applyEnhance,
  describeEnhance,
  enhanceFilter,
  isEnhanceModified,
} from "@/lib/processing/enhance";
import {
  type InpaintPatch,
  applyPatch,
  extractPatch,
  inpaintFrame,
} from "@/lib/processing/inpaint";
import { type MaskShape, rasterizeMask } from "@/lib/processing/mask";
import { type MattingSettings, applyMatting } from "@/lib/processing/matting";

export interface PipelineSettings {
  maskShapes: MaskShape[];
  /** Reuse one inpaint patch across frames instead of re-inpainting each one. */
  staticMask: boolean;
  enhance: EnhanceSettings;
  matting: MattingSettings;
  /** 1, 1.5, or 2. */
  upscale: number;
}

export interface PipelineResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

/** Draw a source frame into a fresh canvas at the requested output size. */
function drawSource(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  upscale: number,
): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * upscale));
  canvas.height = Math.max(1, Math.round(sourceHeight * upscale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D context is unavailable");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { canvas, context };
}

/** A blurred copy of the frame, used as the "blurred original" backdrop. */
function blurCopy(canvas: HTMLCanvasElement, amount: number): ImageData {
  const blurred = document.createElement("canvas");
  blurred.width = canvas.width;
  blurred.height = canvas.height;
  const blurredContext = blurred.getContext("2d", { willReadFrequently: true });
  if (!blurredContext) throw new Error("Canvas 2D context is unavailable");
  blurredContext.filter = `blur(${Math.max(4, amount).toFixed(1)}px)`;
  blurredContext.drawImage(canvas, 0, 0);
  return blurredContext.getImageData(0, 0, blurred.width, blurred.height);
}

/**
 * Process one frame through the full chain.
 *
 * `patch` is the static-mask fast path: when supplied, the inpaint stage blits
 * the cached patch instead of running diffusion again.
 */
export function processFrame(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  settings: PipelineSettings,
  patch: InpaintPatch | null = null,
): PipelineResult {
  const { canvas, context } = drawSource(
    source,
    sourceWidth,
    sourceHeight,
    settings.upscale,
  );

  const hasMask = settings.maskShapes.length > 0;
  if (hasMask) {
    const mask = rasterizeMask(
      settings.maskShapes,
      canvas.width,
      canvas.height,
    );
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    if (patch) {
      applyPatch(frame, patch);
    } else {
      inpaintFrame(frame, mask);
    }
    context.putImageData(frame, 0, 0);
  }

  if (settings.matting.enabled) {
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    const blurred =
      settings.matting.mode === "blur"
        ? blurCopy(canvas, canvas.width * 0.02)
        : undefined;
    applyMatting(frame, settings.matting, blurred);
    context.putImageData(frame, 0, 0);
  }

  // Enhancement is applied last so it grades the composited result.
  const filter = enhanceFilter(settings.enhance);
  if (filter !== "brightness(1.000) contrast(1.000) saturate(1.000)") {
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    const graded = document.createElement("canvas");
    graded.width = canvas.width;
    graded.height = canvas.height;
    const gradedContext = graded.getContext("2d", { willReadFrequently: true });
    if (!gradedContext) throw new Error("Canvas 2D context is unavailable");
    gradedContext.putImageData(frame, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    applyEnhance(context, settings.enhance);
    context.drawImage(graded, 0, 0);
    context.filter = "none";
  }

  return { canvas, width: canvas.width, height: canvas.height };
}

/**
 * Build the reusable inpaint patch for static-mask mode.
 *
 * Runs one full inpaint pass on the supplied frame and captures the
 * reconstructed region so every subsequent frame can skip the diffusion.
 */
export function buildStaticPatch(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  settings: PipelineSettings,
): InpaintPatch | null {
  if (settings.maskShapes.length === 0) return null;
  // Build the patch at the same output scale `processFrame` renders at, so the
  // cached region blits back at the correct size and position when an upscale
  // factor is applied.
  const { canvas, context } = drawSource(
    source,
    sourceWidth,
    sourceHeight,
    settings.upscale,
  );
  const mask = rasterizeMask(settings.maskShapes, canvas.width, canvas.height);
  const frame = context.getImageData(0, 0, canvas.width, canvas.height);
  return extractPatch(frame, mask);
}

/** Human-readable summary of the whole pipeline, for render records. */
export function describePipeline(settings: PipelineSettings): string {
  const parts: string[] = [];
  parts.push(
    settings.maskShapes.length > 0
      ? `Watermark mask (${settings.maskShapes.length} shape${settings.maskShapes.length === 1 ? "" : "s"}${settings.staticMask ? ", static" : ", per-frame"})`
      : "No watermark mask",
  );
  if (settings.matting.enabled) {
    parts.push(
      settings.matting.mode === "transparent"
        ? "Background removed"
        : settings.matting.mode === "color"
          ? `Background replaced (${settings.matting.color})`
          : "Background blurred",
    );
  }
  if (isEnhanceModified(settings.enhance)) {
    parts.push(`Enhancement (${describeEnhance(settings.enhance)})`);
  }
  if (settings.upscale !== 1) parts.push(`Upscale ${settings.upscale}x`);
  return parts.join(" · ");
}
