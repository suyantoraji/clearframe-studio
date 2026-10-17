import { describe, expect, it } from "vitest";

import { DEFAULT_ENHANCE } from "@/lib/processing/enhance";
import { DEFAULT_MATTING } from "@/lib/processing/matting";
import {
  type PipelineSettings,
  describePipeline,
} from "@/lib/processing/pipeline";

function settings(overrides: Partial<PipelineSettings> = {}): PipelineSettings {
  return {
    maskShapes: [],
    staticMask: true,
    enhance: DEFAULT_ENHANCE,
    matting: DEFAULT_MATTING,
    upscale: 1,
    ...overrides,
  };
}

describe("describePipeline", () => {
  it("reports no watermark mask when none is drawn", () => {
    expect(describePipeline(settings())).toBe("No watermark mask");
  });

  it("summarizes a static mask with its shape count", () => {
    const summary = describePipeline(
      settings({
        maskShapes: [
          { kind: "rect", x: 0, y: 0, width: 0.2, height: 0.2 },
          { kind: "rect", x: 0.5, y: 0.5, width: 0.2, height: 0.2 },
        ],
        staticMask: true,
      }),
    );
    expect(summary).toContain("Watermark mask (2 shapes, static)");
  });

  it("distinguishes a per-frame mask from a static one", () => {
    const summary = describePipeline(
      settings({
        maskShapes: [{ kind: "rect", x: 0, y: 0, width: 0.2, height: 0.2 }],
        staticMask: false,
      }),
    );
    expect(summary).toContain("Watermark mask (1 shape, per-frame)");
  });

  it("names each background replacement mode", () => {
    expect(
      describePipeline(
        settings({
          matting: { ...DEFAULT_MATTING, enabled: true, mode: "transparent" },
        }),
      ),
    ).toContain("Background removed");
    expect(
      describePipeline(
        settings({
          matting: {
            ...DEFAULT_MATTING,
            enabled: true,
            mode: "color",
            color: "#101418",
          },
        }),
      ),
    ).toContain("Background replaced (#101418)");
    expect(
      describePipeline(
        settings({
          matting: { ...DEFAULT_MATTING, enabled: true, mode: "blur" },
        }),
      ),
    ).toContain("Background blurred");
  });

  it("omits enhancement when the sliders are untouched and includes it when moved", () => {
    expect(describePipeline(settings())).not.toContain("Enhancement");
    const summary = describePipeline(
      settings({ enhance: { ...DEFAULT_ENHANCE, brightness: 0.2 } }),
    );
    expect(summary).toContain("Enhancement (");
    expect(summary).toContain("brightness +0.20");
  });

  it("reports a non-default upscale factor", () => {
    expect(describePipeline(settings({ upscale: 1 }))).not.toContain("Upscale");
    expect(describePipeline(settings({ upscale: 2 }))).toContain("Upscale 2x");
  });

  it("joins every active stage into one summary", () => {
    const summary = describePipeline(
      settings({
        maskShapes: [{ kind: "rect", x: 0, y: 0, width: 0.2, height: 0.2 }],
        matting: { ...DEFAULT_MATTING, enabled: true, mode: "blur" },
        enhance: { ...DEFAULT_ENHANCE, contrast: 0.3 },
        upscale: 1.5,
      }),
    );
    expect(summary).toContain("Watermark mask");
    expect(summary).toContain("Background blurred");
    expect(summary).toContain("Enhancement (");
    expect(summary).toContain("Upscale 1.5x");
  });
});
