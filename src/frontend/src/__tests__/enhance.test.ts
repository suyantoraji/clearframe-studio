import { describe, expect, it } from "vitest";

import {
  DEFAULT_ENHANCE,
  ENHANCE_PRESETS,
  describeEnhance,
  enhanceFilter,
  isEnhanceModified,
} from "@/lib/processing/enhance";

describe("enhanceFilter", () => {
  it("produces a neutral filter for the default settings", () => {
    expect(enhanceFilter(DEFAULT_ENHANCE)).toBe(
      "brightness(1.000) contrast(1.000) saturate(1.000)",
    );
  });

  it("reflects brightness, contrast, and saturation changes", () => {
    const filter = enhanceFilter({
      brightness: 0.5,
      contrast: -0.25,
      saturation: 0.2,
      sharpness: 0,
      denoise: 0,
    });
    expect(filter).toContain("brightness(1.500)");
    expect(filter).toContain("contrast(0.750)");
    expect(filter).toContain("saturate(1.200)");
  });

  it("folds sharpness into contrast and denoise into a blur", () => {
    const filter = enhanceFilter({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      sharpness: 1,
      denoise: 1,
    });
    // Sharpness raises contrast by 0.12.
    expect(filter).toContain("contrast(1.120)");
    expect(filter).toContain("blur(0.60px)");
  });
});

describe("isEnhanceModified", () => {
  it("is false for the untouched original", () => {
    expect(isEnhanceModified(DEFAULT_ENHANCE)).toBe(false);
  });

  it("is true once any control moves", () => {
    expect(isEnhanceModified({ ...DEFAULT_ENHANCE, denoise: 0.1 })).toBe(true);
  });
});

describe("describeEnhance", () => {
  it("labels the untouched original", () => {
    expect(describeEnhance(DEFAULT_ENHANCE)).toBe("Original");
  });

  it("summarizes the active controls", () => {
    const summary = describeEnhance({
      brightness: 0.1,
      contrast: -0.2,
      saturation: 0,
      sharpness: 0.5,
      denoise: 0,
    });
    expect(summary).toContain("brightness +0.10");
    expect(summary).toContain("contrast -0.20");
    expect(summary).toContain("sharpness 0.50");
  });
});

describe("ENHANCE_PRESETS", () => {
  it("exposes the four one-click presets", () => {
    expect(ENHANCE_PRESETS.map((preset) => preset.id)).toEqual([
      "auto",
      "vivid",
      "soft",
      "crisp",
    ]);
  });

  it("gives every preset a full set of settings", () => {
    for (const preset of ENHANCE_PRESETS) {
      expect(isEnhanceModified(preset.settings)).toBe(true);
      expect(preset.label.length).toBeGreaterThan(0);
    }
  });
});
