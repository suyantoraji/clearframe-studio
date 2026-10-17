import { describe, expect, it } from "vitest";

import {
  DEFAULT_MATTING,
  applyMatting,
  computeMatte,
  describeMatting,
} from "@/lib/processing/matting";

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

/** A frame with a dark border and a bright subject in the center. */
function subjectFrame(): ImageData {
  return imageData(20, 20, (x, y) => {
    const inCenter = x >= 6 && x < 14 && y >= 6 && y < 14;
    return inCenter ? [240, 240, 240] : [20, 20, 20];
  });
}

describe("computeMatte", () => {
  it("keeps the center subject and drops the background", () => {
    const alpha = computeMatte(subjectFrame(), 0.35);
    const center = alpha[10 * 20 + 10];
    const corner = alpha[0];
    expect(center).toBeGreaterThan(corner);
    expect(center).toBeGreaterThan(0);
  });
});

describe("applyMatting", () => {
  it("drives alpha to zero for transparent mode", () => {
    const frame = subjectFrame();
    applyMatting(frame, {
      ...DEFAULT_MATTING,
      enabled: true,
      mode: "transparent",
    });
    // A background pixel becomes transparent.
    expect(frame.data[3]).toBeLessThan(255);
  });

  it("fills the background with the chosen solid color", () => {
    const frame = subjectFrame();
    applyMatting(frame, {
      enabled: true,
      mode: "color",
      color: "#ff0000",
      feather: 0.35,
    });
    // The corner is background, so it takes the replacement color and full alpha.
    expect(frame.data[0]).toBeGreaterThan(200);
    expect(frame.data[1]).toBeLessThan(60);
    expect(frame.data[3]).toBe(255);
  });

  it("uses the blurred source as the backdrop in blur mode", () => {
    const frame = subjectFrame();
    const blurred = imageData(20, 20, () => [0, 0, 255]);
    applyMatting(
      frame,
      { ...DEFAULT_MATTING, enabled: true, mode: "blur" },
      blurred,
    );
    // The background corner takes the blurred backdrop's blue.
    expect(frame.data[2]).toBeGreaterThan(200);
    expect(frame.data[3]).toBe(255);
  });
});

describe("describeMatting", () => {
  it("labels the kept background when disabled", () => {
    expect(describeMatting(DEFAULT_MATTING)).toBe("Background kept");
  });

  it("names the replacement mode when enabled", () => {
    expect(
      describeMatting({
        enabled: true,
        mode: "color",
        color: "#101418",
        feather: 0.5,
      }),
    ).toContain("solid #101418");
    expect(
      describeMatting({
        enabled: true,
        mode: "blur",
        color: "#101418",
        feather: 0.5,
      }),
    ).toContain("blurred original");
  });
});
