import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

interface CompareToggleProps {
  /** When true the processed result is shown; when false the original. */
  showingResult: boolean;
  onToggle: (showingResult: boolean) => void;
  /** Whether a processed result exists to compare against. */
  hasResult: boolean;
  className?: string;
}

/**
 * Before/after comparison toggle.
 *
 * A two-state segmented control that flips the preview stage between the
 * original frame and the processed result. It is disabled until a processed
 * result exists, and explains why rather than silently doing nothing.
 */
export function CompareToggle({
  showingResult,
  onToggle,
  hasResult,
  className,
}: CompareToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-secondary/60 p-0.5",
        className,
      )}
      data-ocid="workspace.compare_toggle"
    >
      <button
        type="button"
        onClick={() => onToggle(false)}
        aria-pressed={!showingResult}
        data-ocid="workspace.compare_before_button"
        className={cn(
          "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium outline-none transition-smooth focus-visible:ring-2 focus-visible:ring-ring",
          !showingResult
            ? "bg-card text-foreground shadow-subtle"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <EyeOff className="size-3.5" aria-hidden="true" />
        Before
      </button>
      <button
        type="button"
        onClick={() => onToggle(true)}
        disabled={!hasResult}
        aria-pressed={showingResult}
        title={hasResult ? undefined : "Process a frame to compare"}
        data-ocid="workspace.compare_after_button"
        className={cn(
          "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium outline-none transition-smooth focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          showingResult
            ? "bg-card text-foreground shadow-subtle"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Eye className="size-3.5" aria-hidden="true" />
        After
      </button>
    </div>
  );
}
