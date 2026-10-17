/**
 * Frame inpainting.
 *
 * Fills masked pixels by diffusing color inward from the mask boundary — a
 * fast, deterministic approximation of a browser-side inpainting model that
 * runs comfortably per-frame on the main thread. The result is a plausible
 * reconstruction of the background behind a watermark, which is exactly what
 * watermark removal needs.
 *
 * Two modes are supported:
 *  - `inpaintFrame` runs the full diffusion for a single frame.
 *  - `extractPatch` / `applyPatch` implement the static-mask fast path: one
 *    inpaint pass produces a patch that is reused across frames, which is the
 *    right trade-off for a fixed-position watermark.
 */

export interface InpaintPatch {
  x: number;
  y: number;
  width: number;
  height: number;
  /** RGBA bytes for the patch region, ready to blit back onto a frame. */
  data: Uint8ClampedArray;
}

function maskBounds(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      if (mask[row + x] > 0) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0 || y1 < 0) return null;
  return { x0, y0, x1, y1 };
}

/**
 * Diffuse color into masked pixels from their unmasked neighbours.
 *
 * Each masked pixel takes the average of the pixels around it that already
 * hold a known color; iterating outward from the boundary fills the region
 * smoothly. `iterations` trades quality for speed.
 */
export function inpaintFrame(
  imageData: ImageData,
  mask: Uint8ClampedArray,
  iterations = 24,
): ImageData {
  const { width, height, data } = imageData;
  const bounds = maskBounds(mask, width, height);
  if (!bounds) return imageData;

  const { x0, y0, x1, y1 } = bounds;
  const regionWidth = x1 - x0 + 1;
  const regionHeight = y1 - y0 + 1;

  // Work on a copy of the region so each iteration reads a stable snapshot.
  const source = new Uint8ClampedArray(data);
  const known = new Uint8Array(regionWidth * regionHeight);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const local = (y - y0) * regionWidth + (x - x0);
      known[local] = mask[y * width + x] > 0 ? 0 : 1;
    }
  }

  const neighbours = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const;

  for (let pass = 0; pass < iterations; pass += 1) {
    let filledAny = false;
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const local = (y - y0) * regionWidth + (x - x0);
        if (known[local] === 1) continue;

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (const [dx, dy] of neighbours) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
          const nLocal = (ny - y0) * regionWidth + (nx - x0);
          if (known[nLocal] !== 1) continue;
          const nIndex = (ny * width + nx) * 4;
          r += source[nIndex];
          g += source[nIndex + 1];
          b += source[nIndex + 2];
          count += 1;
        }
        if (count === 0) continue;

        const index = (y * width + x) * 4;
        source[index] = r / count;
        source[index + 1] = g / count;
        source[index + 2] = b / count;
        source[index + 3] = 255;
        known[local] = 1;
        filledAny = true;
      }
    }
    if (!filledAny) break;
  }

  // Copy the reconstructed region back into the working image.
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const index = (y * width + x) * 4;
      data[index] = source[index];
      data[index + 1] = source[index + 1];
      data[index + 2] = source[index + 2];
      data[index + 3] = source[index + 3];
    }
  }
  return imageData;
}

/** Run one inpaint pass and capture the reconstructed region as a reusable patch. */
export function extractPatch(
  imageData: ImageData,
  mask: Uint8ClampedArray,
  iterations = 24,
): InpaintPatch | null {
  const { width, height } = imageData;
  const bounds = maskBounds(mask, width, height);
  if (!bounds) return null;

  inpaintFrame(imageData, mask, iterations);

  const { x0, y0, x1, y1 } = bounds;
  const patchWidth = x1 - x0 + 1;
  const patchHeight = y1 - y0 + 1;
  const patch = new Uint8ClampedArray(patchWidth * patchHeight * 4);
  for (let y = 0; y < patchHeight; y += 1) {
    for (let x = 0; x < patchWidth; x += 1) {
      const sourceIndex = ((y + y0) * width + (x + x0)) * 4;
      const targetIndex = (y * patchWidth + x) * 4;
      patch[targetIndex] = imageData.data[sourceIndex];
      patch[targetIndex + 1] = imageData.data[sourceIndex + 1];
      patch[targetIndex + 2] = imageData.data[sourceIndex + 2];
      patch[targetIndex + 3] = imageData.data[sourceIndex + 3];
    }
  }
  return { x: x0, y: y0, width: patchWidth, height: patchHeight, data: patch };
}

/** Blit a previously extracted patch onto a frame — the static-mask fast path. */
export function applyPatch(
  imageData: ImageData,
  patch: InpaintPatch,
): ImageData {
  const { width, data } = imageData;
  for (let y = 0; y < patch.height; y += 1) {
    for (let x = 0; x < patch.width; x += 1) {
      const targetIndex = ((y + patch.y) * width + (x + patch.x)) * 4;
      const sourceIndex = (y * patch.width + x) * 4;
      data[targetIndex] = patch.data[sourceIndex];
      data[targetIndex + 1] = patch.data[sourceIndex + 1];
      data[targetIndex + 2] = patch.data[sourceIndex + 2];
      data[targetIndex + 3] = patch.data[sourceIndex + 3];
    }
  }
  return imageData;
}
