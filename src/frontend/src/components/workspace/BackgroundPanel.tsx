import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { BackgroundMode, MattingSettings } from "@/lib/processing/matting";
import { cn } from "@/lib/utils";
import { ScanFace } from "lucide-react";

interface BackgroundPanelProps {
  settings: MattingSettings;
  onChange: (settings: MattingSettings) => void;
}

const MODES: { id: BackgroundMode; label: string }[] = [
  { id: "transparent", label: "Transparent" },
  { id: "color", label: "Solid color" },
  { id: "blur", label: "Blurred original" },
];

/**
 * Background removal panel.
 *
 * The subject matting toggle isolates the foreground subject frame-by-frame in
 * the browser using an on-device saliency pass. The replacement is transparent,
 * a solid color, or a blurred copy of the original, and the edge softness
 * slider feathers the matte so the subject outline stays clean.
 */
export function BackgroundPanel({ settings, onChange }: BackgroundPanelProps) {
  return (
    <section
      className="px-4 py-4"
      aria-labelledby="background-heading"
      data-ocid="workspace.background_panel"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="background-heading"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Background removal
        </h2>
        <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-accent">
          <ScanFace className="size-3" aria-hidden="true" />
          On-device
        </span>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <label
          htmlFor="matting-toggle"
          className="text-xs font-medium text-foreground"
        >
          Subject matting
        </label>
        <Switch
          id="matting-toggle"
          checked={settings.enabled}
          onCheckedChange={(checked) =>
            onChange({ ...settings, enabled: checked })
          }
          data-ocid="workspace.matting_switch"
        />
      </div>

      <fieldset
        disabled={!settings.enabled}
        className={cn(
          "space-y-3 transition-smooth",
          !settings.enabled && "opacity-50",
        )}
      >
        <legend className="sr-only">Background replacement</legend>
        <div className="space-y-1.5">
          {MODES.map((mode) => (
            <label
              key={mode.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 text-xs text-foreground transition-smooth hover:bg-secondary/60"
            >
              <input
                type="radio"
                name="background-mode"
                value={mode.id}
                checked={settings.mode === mode.id}
                onChange={() => onChange({ ...settings, mode: mode.id })}
                data-ocid={`workspace.background_${mode.id}_radio`}
                className="size-3.5 accent-primary"
              />
              <span className="flex-1">{mode.label}</span>
              {mode.id === "color" ? (
                <input
                  type="color"
                  value={settings.color}
                  onChange={(event) =>
                    onChange({ ...settings, color: event.target.value })
                  }
                  aria-label="Replacement color"
                  data-ocid="workspace.background_color_input"
                  className="size-6 cursor-pointer rounded border border-border bg-transparent p-0"
                />
              ) : null}
            </label>
          ))}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="matting-feather"
              className="text-xs font-medium text-foreground"
            >
              Edge softness
            </label>
            <span className="text-mono-num text-xs text-muted-foreground">
              {settings.feather.toFixed(2)}
            </span>
          </div>
          <Slider
            id="matting-feather"
            min={0}
            max={1}
            step={0.01}
            value={[settings.feather]}
            onValueChange={([value]) =>
              onChange({ ...settings, feather: value })
            }
            data-ocid="workspace.feather_slider"
          />
        </div>
      </fieldset>
    </section>
  );
}
