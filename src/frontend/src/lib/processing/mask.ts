/**
 * Mask rasterization.
 *
 * A removal mask is a set of user-drawn shapes in normalized video coordinates
 * (0..1 on both axes), so the same geometry maps onto any frame size. Shapes
 * are rasterized into a single-channel `Uint8ClampedArray` where 255 means
 * "remove this pixel". Because the geometry is entirely user-defined, a
 * horizontal, vertical, or diagonal watermark is covered simply by drawing over
 * it — nothing in this module assumes an orientation.
 *
 * Shapes carry a `subtract` flag: a normal shape adds coverage (255), while an
 * eraser shape subtracts it (0). Shapes are applied in order, so an eraser
 * drawn after a brush punches the mask back out.
 */

export type MaskTool = "rectangle" | "brush" | "eraser";

export interface Point {
  x: number;
  y: number;
}

export interface RectShape {
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  /** When true the shape subtracts coverage instead of adding it (eraser). */
  subtract?: boolean;
}

export interface BrushShape {
  kind: "brush";
  points: Point[];
  size: number;
  /** When true the stroke subtracts coverage instead of adding it (eraser). */
  subtract?: boolean;
}

export type MaskShape = RectShape | BrushShape;

/** Normalize a point into the 0..1 video space. */
export function clampPoint(point: Point): Point {
  return {
    x: Math.min(1, Math.max(0, point.x)),
    y: Math.min(1, Math.max(0, point.y)),
  };
}

/** Build a rectangle shape from two opposite corners, in any drag direction. */
export function rectFromPoints(a: Point, b: Point): RectShape {
  const start = clampPoint(a);
  const end = clampPoint(b);
  return {
    kind: "rect",
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

/** A rectangle is only meaningful once it covers a little area. */
export function isUsableRect(rect: RectShape): boolean {
  return rect.width > 0.004 && rect.height > 0.004;
}

function fillRect(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  rect: RectShape,
  value: number,
): void {
  const x0 = Math.max(0, Math.floor(rect.x * width));
  const y0 = Math.max(0, Math.floor(rect.y * height));
  const x1 = Math.min(width, Math.ceil((rect.x + rect.width) * width));
  const y1 = Math.min(height, Math.ceil((rect.y + rect.height) * height));
  for (let y = y0; y < y1; y += 1) {
    const row = y * width;
    for (let x = x0; x < x1; x += 1) {
      data[row + x] = value;
    }
  }
}

function strokeBrush(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  shape: BrushShape,
  value: number,
): void {
  const radius = Math.max(1, (shape.size / 2) * width);
  const radiusSq = radius * radius;
  for (let i = 0; i < shape.points.length; i += 1) {
    const point = shape.points[i];
    const cx = point.x * width;
    const cy = point.y * height;
    const x0 = Math.max(0, Math.floor(cx - radius));
    const y0 = Math.max(0, Math.floor(cy - radius));
    const x1 = Math.min(width, Math.ceil(cx + radius));
    const y1 = Math.min(height, Math.ceil(cy + radius));
    for (let y = y0; y < y1; y += 1) {
      const row = y * width;
      const dy = y + 0.5 - cy;
      for (let x = x0; x < x1; x += 1) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy <= radiusSq) {
          data[row + x] = value;
        }
      }
    }
  }
}

/**
 * Rasterize shapes into a coverage mask. Eraser shapes punch holes back to 0,
 * so the caller can pass the full ordered shape list and get the final result.
 */
export function rasterizeMask(
  shapes: MaskShape[],
  width: number,
  height: number,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height);
  for (const shape of shapes) {
    const value = shape.subtract ? 0 : 255;
    if (shape.kind === "rect") {
      fillRect(data, width, height, shape, value);
    } else {
      strokeBrush(data, width, height, shape, value);
    }
  }
  return data;
}

/** Fraction of the frame covered by the mask, used for status readouts. */
export function maskCoverage(mask: Uint8ClampedArray): number {
  if (mask.length === 0) return 0;
  let covered = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] > 0) covered += 1;
  }
  return covered / mask.length;
}

/**
 * Auto-detect assist: propose a candidate watermark region.
 *
 * Real watermark detection is a model problem; this heuristic looks for the
 * densest cluster of high-contrast, low-saturation pixels in the four corner
 * quadrants — where broadcast logos and bug overlays usually sit — and returns
 * the best-scoring quadrant as a rectangle the user can accept, adjust, or
 * discard. It is deliberately conservative: it returns null when no quadrant
 * stands out, rather than inventing a region.
 */
export function detectWatermarkRegion(imageData: ImageData): RectShape | null {
  const { width, height, data } = imageData;
  if (width < 8 || height < 8) return null;

  const quadrants: RectShape[] = [
    { kind: "rect", x: 0, y: 0, width: 0.5, height: 0.5 },
    { kind: "rect", x: 0.5, y: 0, width: 0.5, height: 0.5 },
    { kind: "rect", x: 0, y: 0.5, width: 0.5, height: 0.5 },
    { kind: "rect", x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
  ];

  let bestScore = 0;
  let best: RectShape | null = null;

  for (const quadrant of quadrants) {
    const x0 = Math.floor(quadrant.x * width);
    const y0 = Math.floor(quadrant.y * height);
    const x1 = Math.floor((quadrant.x + quadrant.width) * width);
    const y1 = Math.floor((quadrant.y + quadrant.height) * height);
    let score = 0;
    let samples = 0;
    for (let y = y0; y < y1; y += 2) {
      for (let x = x0; x < x1; x += 2) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        const luminance = (r + g + b) / 3;
        // Bright, near-neutral pixels read as overlay graphics, not footage.
        if (luminance > 150 && saturation < 0.25) score += 1;
        samples += 1;
      }
    }
    const density = samples === 0 ? 0 : score / samples;
    if (density > bestScore) {
      bestScore = density;
      best = quadrant;
    }
  }

  if (!best || bestScore < 0.02) return null;

  // Tighten the proposal to the inner 60% of the winning quadrant so the
  // candidate reads as a logo-sized region rather than a whole corner.
  const inset = 0.2;
  return {
    kind: "rect",
    x: best.x + best.width * inset,
    y: best.y + best.height * inset,
    width: best.width * (1 - inset * 2),
    height: best.height * (1 - inset * 2),
  };
}
