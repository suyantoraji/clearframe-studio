import { describe, expect, it } from "vitest";

import {
  applyPatch,
  extractPatch,
  inpaintFrame,
} from "@/lib/processing/inpaint";

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

/** A solid-color frame with a masked rectangle in the middle. */
function frameWithMask(
  width: number,
  height: number,
  color: [number, number, number],
  maskRect: { x0: number; y0: number; x1: number; y1: number },
): { frame: ImageData; mask: Uint8ClampedArray } {
  const frame = imageData(width, height, () => color);
  const mask = new Uint8ClampedArray(width * height);
  for (let y = maskRect.y0; y <= maskRect.y1; y += 1) {
    for (let x = maskRect.x0; x <= maskRect.x1; x += 1) {
      mask[y * width + x] = 255;
    }
  }
  return { frame, mask };
}

describe("inpaintFrame", () => {
  it("returns the frame unchanged when nothing is masked", () => {
    const frame = imageData(8, 8, () => [10, 20, 30]);
    const mask = new Uint8ClampedArray(8 * 8);
    const result = inpaintFrame(frame, mask);
    expect(result).toBe(frame);
    expect(frame.data[0]).toBe(10);
  });

  it("diffuses the surrounding color into the masked region", () => {
    // A red frame with a masked block; the block should be filled with red.
    const { frame, mask } = frameWithMask(12, 12, [200, 0, 0], {
      x0: 4,
      y0: 4,
      x1: 7,
      y1: 7,
    });
    inpaintFrame(frame, mask, 24);
    const index = (5 * 12 + 5) * 4;
    expect(frame.data[index]).toBeGreaterThan(150);
    expect(frame.data[index + 1]).toBeLessThan(60);
    expect(frame.data[index + 3]).toBe(255);
  });
});

describe("extractPatch / applyPatch", () => {
  it("captures the reconstructed region and blits it onto another frame", () => {
    const { frame, mask } = frameWithMask(12, 12, [0, 180, 0], {
      x0: 3,
      y0: 3,
      x1: 6,
      y1: 6,
    });
    const patch = extractPatch(frame, mask, 24);
    expect(patch).not.toBeNull();
    if (!patch) return;
    expect(patch.width).toBe(4);
    expect(patch.height).toBe(4);

    // A fresh frame with a different color; applying the patch overwrites the
    // masked region with the captured reconstruction.
    const target = imageData(12, 12, () => [0, 0, 0]);
    applyPatch(target, patch);
    const index = (4 * 12 + 4) * 4;
    // The source frame was green, so the reconstructed pixel is green.
    expect(target.data[index + 1]).toBeGreaterThan(100);
    expect(target.data[index]).toBeLessThan(60);
  });

  it("returns null when the mask is empty", () => {
    const frame = imageData(8, 8, () => [0, 0, 0]);
    expect(extractPatch(frame, new Uint8ClampedArray(8 * 8))).toBeNull();
  });
});
