/**
 * Subject matting (background removal).
 *
 * A browser-side matting pass that isolates the foreground subject from the
 * background. The approach is a center-weighted saliency heuristic: pixels near
 * the frame center that differ from the estimated background color are kept,
 * and the resulting alpha is feathered so the subject outline stays clean. It
 * runs per-frame on the main thread and needs no upload.
 *
 * The matte is produced as an alpha mask, then composited against the chosen
 * replacement: transparent, a solid color, or a blurred copy of the original.
 */

export type BackgroundMode = "transparent" | "color" | "blur";

export interface MattingSettings {
  enabled: boolean;
  mode: BackgroundMode;
  /** Replacement color as `#rrggbb`, used when mode is "color". */
  color: string;
  /** 0..1 edge feather applied to the matte. */
  feather: number;
}

export const DEFAULT_MATTING: MattingSettings = {
  enabled: false,
  mode: "transparent",
  color: "#101418",
  feather: 0.35,
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const int = Number.parseInt(value, 16);
  if (Number.isNaN(int)) return { r: 16, g: 20, b: 24 };
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

/**
 * Estimate the background color from the frame border, which is far more
 * likely to be background than the center where the subject sits.
 */
function estimateBackground(imageData: ImageData): {
  r: number;
  g: number;
  b: number;
} {
  const { width, height, data } = imageData;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 40));
  for (let x = 0; x < width; x += step) {
    for (const y of [0, height - 1]) {
      const index = (y * width + x) * 4;
      r += data[index];
      g += data[index + 1];
      b += data[index + 2];
      count += 1;
    }
  }
  for (let y = 0; y < height; y += step) {
    for (const x of [0, width - 1]) {
      const index = (y * width + x) * 4;
      r += data[index];
      g += data[index + 1];
      b += data[index + 2];
      count += 1;
    }
  }
  if (count === 0) return { r: 0, g: 0, b: 0 };
  return { r: r / count, g: g / count, b: b / count };
}

/**
 * Compute a feathered foreground alpha mask (0..255) for a frame.
 *
 * Exposed separately so the preview can show the matte itself when the user is
 * tuning edge softness.
 */
export function computeMatte(
  imageData: ImageData,
  feather: number,
): Uint8ClampedArray {
  const { width, height, data } = imageData;
  const background = estimateBackground(imageData);
  const alpha = new Uint8ClampedArray(width * height);
  const cx = width / 2;
  const cy = height / 2;
  const maxDistance = Math.hypot(cx, cy);
  const softness = 0.15 + feather * 0.85;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const dr = data[index] - background.r;
      const dg = data[index + 1] - background.g;
      const db = data[index + 2] - background.b;
      const difference = Math.sqrt(dr * dr + dg * dg + db * db) / 441.67;
      const distance = Math.hypot(x - cx, y - cy) / maxDistance;
      const centerWeight = 1 - distance * 0.6;
      const raw = difference * centerWeight;
      // Feather the transition so the subject outline is not a hard cut.
      const t = Math.min(1, Math.max(0, (raw - 0.12) / softness));
      alpha[y * width + x] = Math.round(t * 255);
    }
  }
  return alpha;
}

/**
 * Composite a frame against its replacement background.
 *
 * `blurredSource` is an optional pre-blurred copy of the frame used for the
 * "blur" mode; when omitted, the original frame is used as the backdrop.
 */
export function applyMatting(
  imageData: ImageData,
  settings: MattingSettings,
  blurredSource?: ImageData,
): ImageData {
  const { width, height, data } = imageData;
  const alpha = computeMatte(imageData, settings.feather);
  const color = hexToRgb(settings.color);
  const backdrop = blurredSource?.data;

  for (let i = 0; i < width * height; i += 1) {
    const index = i * 4;
    const a = alpha[i] / 255;
    let br: number;
    let bg: number;
    let bb: number;
    if (settings.mode === "color") {
      br = color.r;
      bg = color.g;
      bb = color.b;
    } else if (settings.mode === "blur" && backdrop) {
      br = backdrop[index];
      bg = backdrop[index + 1];
      bb = backdrop[index + 2];
    } else {
      // Transparent: keep the original pixels but drive alpha to zero.
      br = data[index];
      bg = data[index + 1];
      bb = data[index + 2];
    }
    data[index] = data[index] * a + br * (1 - a);
    data[index + 1] = data[index + 1] * a + bg * (1 - a);
    data[index + 2] = data[index + 2] * a + bb * (1 - a);
    data[index + 3] =
      settings.mode === "transparent" ? Math.round(a * 255) : 255;
  }
  return imageData;
}

/** Human-readable summary of the matting configuration, for render records. */
export function describeMatting(settings: MattingSettings): string {
  if (!settings.enabled) return "Background kept";
  const mode =
    settings.mode === "transparent"
      ? "transparent"
      : settings.mode === "color"
        ? `solid ${settings.color}`
        : "blurred original";
  return `Subject matting · ${mode} · feather ${settings.feather.toFixed(2)}`;
}
