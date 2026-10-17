/**
 * Enhancement filter chain.
 *
 * Brightness, contrast, saturation, sharpness, and denoise are applied to a
 * frame in one pass. The chain is expressed as a CSS `filter` string so the
 * live preview can reuse the exact same math the render path applies — the
 * preview and the output never drift apart.
 */

export interface EnhanceSettings {
  /** -1..1, 0 is unchanged. */
  brightness: number;
  /** -1..1, 0 is unchanged. */
  contrast: number;
  /** -1..1, 0 is unchanged. */
  saturation: number;
  /** 0..1, 0 is off. */
  sharpness: number;
  /** 0..1, 0 is off. */
  denoise: number;
}

export const DEFAULT_ENHANCE: EnhanceSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  denoise: 0,
};

export interface EnhancePreset {
  id: string;
  label: string;
  description: string;
  settings: EnhanceSettings;
}

/** One-click presets that set every slider to a sensible starting point. */
export const ENHANCE_PRESETS: EnhancePreset[] = [
  {
    id: "auto",
    label: "Auto",
    description: "Balanced correction for typical footage",
    settings: {
      brightness: 0.08,
      contrast: 0.12,
      saturation: 0.06,
      sharpness: 0.25,
      denoise: 0.2,
    },
  },
  {
    id: "vivid",
    label: "Vivid",
    description: "Punchy color and contrast",
    settings: {
      brightness: 0.05,
      contrast: 0.28,
      saturation: 0.4,
      sharpness: 0.45,
      denoise: 0.1,
    },
  },
  {
    id: "soft",
    label: "Soft",
    description: "Gentle, low-contrast look",
    settings: {
      brightness: 0.12,
      contrast: -0.15,
      saturation: -0.05,
      sharpness: 0,
      denoise: 0.45,
    },
  },
  {
    id: "crisp",
    label: "Crisp",
    description: "Maximum detail recovery",
    settings: {
      brightness: 0.02,
      contrast: 0.18,
      saturation: 0.1,
      sharpness: 0.8,
      denoise: 0.35,
    },
  },
];

/** Whether the settings differ from the untouched original. */
export function isEnhanceModified(settings: EnhanceSettings): boolean {
  return (
    settings.brightness !== 0 ||
    settings.contrast !== 0 ||
    settings.saturation !== 0 ||
    settings.sharpness !== 0 ||
    settings.denoise !== 0
  );
}

/**
 * Build the CSS filter string for a settings object.
 *
 * Sharpness and denoise have no direct CSS equivalent, so they are folded into
 * the closest perceptual approximations: sharpness raises local contrast via a
 * slight contrast bump, and denoise trades a touch of contrast for a blur.
 */
export function enhanceFilter(settings: EnhanceSettings): string {
  const brightness = 1 + settings.brightness;
  const contrast = 1 + settings.contrast + settings.sharpness * 0.12;
  const saturation = 1 + settings.saturation;
  const blur = settings.denoise * 0.6;
  const parts = [
    `brightness(${brightness.toFixed(3)})`,
    `contrast(${contrast.toFixed(3)})`,
    `saturate(${saturation.toFixed(3)})`,
  ];
  if (blur > 0.01) parts.push(`blur(${blur.toFixed(2)}px)`);
  return parts.join(" ");
}

/** Apply the enhancement chain to a canvas context in place. */
export function applyEnhance(
  context: CanvasRenderingContext2D,
  settings: EnhanceSettings,
): void {
  context.filter = enhanceFilter(settings);
}

/** Human-readable summary of the active enhancement, for render records. */
export function describeEnhance(settings: EnhanceSettings): string {
  if (!isEnhanceModified(settings)) return "Original";
  const parts: string[] = [];
  if (settings.brightness !== 0)
    parts.push(
      `brightness ${settings.brightness > 0 ? "+" : ""}${settings.brightness.toFixed(2)}`,
    );
  if (settings.contrast !== 0)
    parts.push(
      `contrast ${settings.contrast > 0 ? "+" : ""}${settings.contrast.toFixed(2)}`,
    );
  if (settings.saturation !== 0)
    parts.push(
      `saturation ${settings.saturation > 0 ? "+" : ""}${settings.saturation.toFixed(2)}`,
    );
  if (settings.sharpness > 0)
    parts.push(`sharpness ${settings.sharpness.toFixed(2)}`);
  if (settings.denoise > 0)
    parts.push(`denoise ${settings.denoise.toFixed(2)}`);
  return parts.join(", ");
}
