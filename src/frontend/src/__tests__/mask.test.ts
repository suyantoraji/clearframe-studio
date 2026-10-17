import { describe, expect, it } from "vitest";

import {
  type MaskShape,
  clampPoint,
  detectWatermarkRegion,
  isUsableRect,
  maskCoverage,
  rasterizeMask,
  rectFromPoints,
} from "@/lib/processing/mask";

/** Build an ImageData-like object without depending on a real canvas. */
function imageData(
  width: number,
  height: number,
  paint: (x: number, y: number) => [number, number, number],
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const [r, g, b] = paint(x, y);
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = 255;
    }
  }
  return { width, height, data, colorSpace: "srgb" } as ImageData;
}

describe("mask geometry", () => {
  it("clamps points into the normalized 0..1 space", () => {
    expect(clampPoint({ x: -0.5, y: 1.5 })).toEqual({ x: 0, y: 1 });
    expect(clampPoint({ x: 0.25, y: 0.75 })).toEqual({ x: 0.25, y: 0.75 });
  });

  it("builds a rectangle from two corners in any drag direction", () => {
    const forward = rectFromPoints({ x: 0.1, y: 0.2 }, { x: 0.4, y: 0.6 });
    const backward = rectFromPoints({ x: 0.4, y: 0.6 }, { x: 0.1, y: 0.2 });
    expect(forward).toEqual(backward);
    expect(forward.kind).toBe("rect");
    expect(forward.x).toBeCloseTo(0.1, 6);
    expect(forward.y).toBeCloseTo(0.2, 6);
    expect(forward.width).toBeCloseTo(0.3, 6);
    expect(forward.height).toBeCloseTo(0.4, 6);
  });

  it("treats a tiny rectangle as unusable", () => {
    expect(
      isUsableRect({ kind: "rect", x: 0, y: 0, width: 0.001, height: 0.5 }),
    ).toBe(false);
    expect(
      isUsableRect({ kind: "rect", x: 0, y: 0, width: 0.2, height: 0.2 }),
    ).toBe(true);
  });
});

describe("rasterizeMask", () => {
  it("fills a rectangle's pixels and leaves the rest untouched", () => {
    const mask = rasterizeMask(
      [{ kind: "rect", x: 0.25, y: 0.25, width: 0.5, height: 0.5 }],
      8,
      8,
    );
    // Center pixel is inside the rectangle.
    expect(mask[4 * 8 + 4]).toBe(255);
    // Corner pixel is outside.
    expect(mask[0]).toBe(0);
  });

  it("covers a diagonal watermark drawn as a brush stroke", () => {
    // A diagonal stroke from top-left to bottom-right.
    const diagonal: MaskShape = {
      kind: "brush",
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.5, y: 0.5 },
        { x: 0.9, y: 0.9 },
      ],
      size: 0.1,
    };
    const mask = rasterizeMask([diagonal], 20, 20);
    // Pixels along the diagonal are covered.
    expect(mask[10 * 20 + 10]).toBe(255);
    expect(mask[2 * 20 + 2]).toBe(255);
    // A pixel far off the diagonal is not.
    expect(mask[2 * 20 + 17]).toBe(0);
  });

  it("reports coverage as the fraction of masked pixels", () => {
    const mask = rasterizeMask(
      [{ kind: "rect", x: 0, y: 0, width: 0.5, height: 1 }],
      10,
      10,
    );
    expect(maskCoverage(mask)).toBeCloseTo(0.5, 5);
    expect(maskCoverage(new Uint8ClampedArray(0))).toBe(0);
  });
});

describe("detectWatermarkRegion", () => {
  it("returns null when no quadrant stands out", () => {
    // Uniform mid-gray frame: no bright, low-saturation cluster.
    const frame = imageData(40, 40, () => [120, 120, 120]);
    expect(detectWatermarkRegion(frame)).toBeNull();
  });

  it("proposes a region in the quadrant holding a bright overlay", () => {
    // Top-right quadrant is a bright, near-neutral overlay.
    const frame = imageData(40, 40, (x, y) =>
      x >= 20 && y < 20 ? [250, 250, 250] : [40, 40, 40],
    );
    const proposal = detectWatermarkRegion(frame);
    expect(proposal).not.toBeNull();
    expect(proposal?.kind).toBe("rect");
    // The proposal sits inside the top-right quadrant.
    expect(proposal?.x).toBeGreaterThanOrEqual(0.5);
    expect(proposal?.y).toBeLessThan(0.5);
  });

  it("returns null for a frame too small to analyze", () => {
    const frame = imageData(4, 4, () => [255, 255, 255]);
    expect(detectWatermarkRegion(frame)).toBeNull();
  });
});
