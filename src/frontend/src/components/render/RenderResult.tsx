import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Download,
  Film,
  Loader2,
  Save,
  Volume2,
  VolumeX,
} from "lucide-react";

export interface RenderResultProps {
  /** Object URL of the finished render, used for preview and download. */
  url: string;
  /** Container label, e.g. "MP4". */
  format: string;
  /** Resolution label, e.g. "1920 × 1080". */
  resolution: string;
  /** Human-readable summary of the applied cleanup settings. */
  settingsSummary: string;
  /** Size of the encoded output in bytes. */
  sizeBytes: number;
  /** Whether the original audio track is present in the export. */
  audioIncluded: boolean;
  /** Whether the signed-in user can persist this render to the project. */
  canSave: boolean;
  /** Whether a save is currently in flight. */
  isSaving: boolean;
  /** Whether the render has already been saved to the project. */
  isSaved: boolean;
  /** Persist the render to the project (signed-in users only). */
  onSave: () => void;
  /** Download the finished render directly. */
  onDownload: () => void;
  /** Discard the result and return to the render controls. */
  onReset: () => void;
  className?: string;
}

/**
 * Completed-render card: a preview of the encoded output, its format,
 * resolution, size, and audio status, plus a download action and — for
 * signed-in users — a save-to-project action. Signed-out visitors get a direct
 * download instead, since a temporary session has nowhere to persist to.
 */
export function RenderResult({
  url,
  format,
  resolution,
  settingsSummary,
  sizeBytes,
  audioIncluded,
  canSave,
  isSaving,
  isSaved,
  onSave,
  onDownload,
  onReset,
  className,
}: RenderResultProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-panel animate-fade-in",
        className,
      )}
      data-ocid="render.result_card"
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
        <h3 className="font-display text-sm font-semibold tracking-tight">
          Render complete
        </h3>
        <span className="ml-auto rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-mono-num text-[11px] uppercase tracking-wider text-accent">
          {format}
        </span>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-canvas">
        {/* biome-ignore lint/a11y/useMediaCaption: user-generated render preview */}
        <video
          src={url}
          controls
          playsInline
          className="aspect-video w-full bg-canvas"
          data-ocid="render.result_preview"
        />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div className="flex flex-col gap-0.5">
          <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Resolution
          </dt>
          <dd
            className="text-mono-num text-foreground"
            data-ocid="render.result_resolution"
          >
            {resolution}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Size
          </dt>
          <dd
            className="text-mono-num text-foreground"
            data-ocid="render.result_size"
          >
            {formatBytes(sizeBytes)}
          </dd>
        </div>
        <div className="col-span-2 flex flex-col gap-0.5">
          <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Applied
          </dt>
          <dd className="text-foreground" data-ocid="render.result_settings">
            {settingsSummary}
          </dd>
        </div>
        <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
          {audioIncluded ? (
            <Volume2 className="size-3.5" aria-hidden="true" />
          ) : (
            <VolumeX className="size-3.5" aria-hidden="true" />
          )}
          <span data-ocid="render.result_audio">
            {audioIncluded ? "Original audio track preserved" : "Silent export"}
          </span>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={onDownload}
          className="flex-1"
          data-ocid="render.download_button"
        >
          <Download className="size-4" aria-hidden="true" />
          Download
        </Button>
        {canSave ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onSave}
            disabled={isSaving || isSaved}
            className="flex-1"
            data-ocid="render.save_button"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {isSaved
              ? "Saved to project"
              : isSaving
                ? "Saving…"
                : "Save to project"}
          </Button>
        ) : (
          <span
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground"
            data-ocid="render.save_signed_out_hint"
          >
            <Film className="size-3.5" aria-hidden="true" />
            Sign in to save renders
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onReset}
        className="self-start rounded-sm text-xs text-muted-foreground underline-offset-4 outline-none transition-smooth hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        data-ocid="render.reset_button"
      >
        Render another version
      </button>
    </div>
  );
}
