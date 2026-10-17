import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Loader2, X } from "lucide-react";

export interface RenderProgressProps {
  /** Completion in the range 0–1. */
  progress: number;
  /** Estimated seconds remaining, or null while the estimate is unknown. */
  remainingSeconds: number | null;
  /** Frames already encoded. */
  framesDone: number;
  /** Total frames in the render. */
  frameCount: number;
  /** Called when the user cancels the in-flight render. */
  onCancel: () => void;
  className?: string;
}

function formatRemaining(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "estimating…";
  if (seconds < 1) return "almost done";
  if (seconds < 60) return `${Math.ceil(seconds)}s remaining`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}m ${rest.toString().padStart(2, "0")}s remaining`;
}

/**
 * Live render progress: a percentage readout, an estimated remaining time, the
 * encoded-frame counter, and a cancel action. The bar carries the amber signal
 * accent and a scan sweep while work is in flight.
 */
export function RenderProgress({
  progress,
  remainingSeconds,
  framesDone,
  frameCount,
  onCancel,
  className,
}: RenderProgressProps) {
  const percentage = Math.round(Math.min(Math.max(progress, 0), 1) * 100);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-panel",
        className,
      )}
      data-ocid="render.progress_panel"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Loader2
            className="size-3.5 animate-spin text-primary"
            aria-hidden="true"
          />
          Rendering
        </span>
        <span
          className="text-mono-num text-lg font-semibold text-primary"
          data-ocid="render.progress_percentage"
        >
          {percentage}%
        </span>
      </div>

      <div className="relative">
        <Progress
          value={percentage}
          className="h-2 bg-secondary"
          data-ocid="render.progress_bar"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-scan-sweep bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-mono-num text-xs text-muted-foreground">
          <span data-ocid="render.progress_frames">
            {framesDone.toLocaleString()} / {frameCount.toLocaleString()} frames
          </span>
          <span className="mx-2 text-border">·</span>
          <span data-ocid="render.progress_remaining">
            {formatRemaining(remainingSeconds)}
          </span>
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground outline-none transition-smooth hover:border-destructive/60 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
          data-ocid="render.cancel_button"
        >
          <X className="size-3.5" aria-hidden="true" />
          Cancel
        </button>
      </div>
    </div>
  );
}
