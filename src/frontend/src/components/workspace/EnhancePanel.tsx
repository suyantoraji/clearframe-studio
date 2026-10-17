import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ENHANCE_PRESETS,
  type EnhanceSettings,
  isEnhanceModified,
} from "@/lib/processing/enhance";
import { cn } from "@/lib/utils";
import { RotateCcw, Sparkles } from "lucide-react";

interface EnhancePanelProps {
  settings: EnhanceSettings;
  onChange: (settings: EnhanceSettings) => void;
  upscale: number;
  onUpscaleChange: (upscale: number) => void;
}

interface ControlSpec {
  key: keyof EnhanceSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}

const CONTROLS: ControlSpec[] = [
  {
    key: "brightness",
    label: "Brightness",
    min: -1,
    max: 1,
    step: 0.01,
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`,
  },
  {
    key: "contrast",
    label: "Contrast",
    min: -1,
    max: 1,
    step: 0.01,
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`,
  },
  {
    key: "saturation",
    label: "Saturation",
    min: -1,
    max: 1,
    step: 0.01,
    format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`,
  },
  {
    key: "sharpness",
    label: "Sharpness",
    min: 0,
    max: 1,
    step: 0.01,
    format: (v) => v.toFixed(2),
  },
  {
    key: "denoise",
    label: "Denoise",
    min: 0,
    max: 1,
    step: 0.01,
    format: (v) => v.toFixed(2),
  },
];

const UPSCALE_OPTIONS = [1, 1.5, 2] as const;

/**
 * Enhancement control panel.
 *
 * Brightness, contrast, saturation, sharpness, and denoise each drive a live
 * preview on the current frame. Presets set every slider at once, the upscale
 * factor is applied during render, and reset returns the frame to its original
 * grade.
 */
export function EnhancePanel({
  settings,
  onChange,
  upscale,
  onUpscaleChange,
}: EnhancePanelProps) {
  const modified = isEnhanceModified(settings);

  return (
    <section
      className="border-b border-border px-4 py-4"
      aria-labelledby="enhance-heading"
      data-ocid="workspace.enhance_panel"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="enhance-heading"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Enhancement
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({
              ...settings,
              brightness: 0,
              contrast: 0,
              saturation: 0,
              sharpness: 0,
              denoise: 0,
            })
          }
          disabled={!modified}
          data-ocid="workspace.enhance_reset_button"
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {ENHANCE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.settings)}
            title={preset.description}
            data-ocid={`workspace.preset_${preset.id}_button`}
            className="flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs font-medium text-muted-foreground outline-none transition-smooth hover:border-primary/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Sparkles className="size-3" aria-hidden="true" />
            {preset.label}
          </button>
        ))}
      </div>

      <div className="space-y-3.5">
        {CONTROLS.map((control) => (
          <div key={control.key}>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor={`enhance-${control.key}`}
                className="text-xs font-medium text-foreground"
              >
                {control.label}
              </label>
              <span className="text-mono-num text-xs text-muted-foreground">
                {control.format(settings[control.key])}
              </span>
            </div>
            <Slider
              id={`enhance-${control.key}`}
              min={control.min}
              max={control.max}
              step={control.step}
              value={[settings[control.key]]}
              onValueChange={([value]) =>
                onChange({ ...settings, [control.key]: value })
              }
              data-ocid={`workspace.${control.key}_slider`}
            />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <span className="mb-1.5 block text-xs font-medium text-foreground">
          Upscale
        </span>
        <div
          className="inline-flex w-full items-center rounded-md border border-border bg-secondary/60 p-0.5"
          data-ocid="workspace.upscale_group"
        >
          {UPSCALE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onUpscaleChange(option)}
              aria-pressed={upscale === option}
              data-ocid={`workspace.upscale_${option}x_button`}
              className={cn(
                "flex-1 rounded px-2 py-1 text-xs font-medium outline-none transition-smooth focus-visible:ring-2 focus-visible:ring-ring",
                upscale === option
                  ? "bg-card text-foreground shadow-subtle"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option}x
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
