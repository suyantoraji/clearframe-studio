import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2, UploadCloud } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";

const ACCEPTED_EXTENSIONS = [".mp4", ".webm", ".mov"] as const;
const ACCEPT_ATTRIBUTE = "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";

export interface UploadDropzoneProps {
  /** Called with the chosen video file. The parent owns the upload flow. */
  onSelectFile: (file: File) => void;
  /** Disables the dropzone while an upload is in flight. */
  disabled?: boolean;
  /** 0–100 while a file is being stored, or null when idle. */
  progress: number | null;
  /** Human-readable name of the file currently being stored. */
  uploadingName?: string | null;
  /** Error message from the last failed upload attempt. */
  error?: string | null;
}

function hasAcceptedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/**
 * Drag-and-drop + file-picker surface for adding a source video.
 *
 * The component is presentation only: it validates the container extension,
 * then hands the raw `File` to the parent, which owns object-storage upload and
 * project creation. Progress and error state are driven by props so the
 * dashboard remains the single source of truth.
 */
export function UploadDropzone({
  onSelectFile,
  disabled = false,
  progress,
  uploadingName,
  error,
}: UploadDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isUploading = progress !== null;
  const isBusy = disabled || isUploading;

  const acceptFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!hasAcceptedExtension(file.name)) {
        setLocalError(
          "That file type is not supported. Add an MP4, WebM, or MOV video.",
        );
        return;
      }
      setLocalError(null);
      onSelectFile(file);
    },
    [onSelectFile],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (isBusy) return;
      acceptFile(event.dataTransfer.files?.[0]);
    },
    [acceptFile, isBusy],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (isBusy) return;
      setIsDragging(true);
    },
    [isBusy],
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
    },
    [],
  );

  const openPicker = useCallback(() => {
    if (isBusy) return;
    inputRef.current?.click();
  }, [isBusy]);

  const message = localError ?? error ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-ocid="dashboard.dropzone"
        data-state={
          isDragging ? "dragging" : isUploading ? "uploading" : "idle"
        }
        className={cn(
          "relative flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-6 py-10 text-center transition-smooth",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card/60 hover:border-primary/60",
          isBusy && "opacity-90",
        )}
      >
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-lg border transition-smooth",
            isDragging
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-secondary text-muted-foreground",
          )}
          aria-hidden="true"
        >
          {isUploading ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <UploadCloud className="size-6" />
          )}
        </span>

        {isUploading ? (
          <div className="w-full max-w-sm">
            <p className="font-display text-sm font-semibold tracking-tight">
              Storing source footage
            </p>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
              {uploadingName ?? "video file"}
            </p>
            <div
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[oklch(var(--progress-track))]"
              role="progressbar"
              tabIndex={0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress ?? 0)}
              aria-label="Upload progress"
              data-ocid="dashboard.upload_progress"
            >
              <div
                className="h-full rounded-full bg-[oklch(var(--progress-fill))] transition-smooth"
                style={{
                  width: `${Math.min(100, Math.max(0, progress ?? 0))}%`,
                }}
              />
            </div>
            <p className="mt-2 text-mono-num text-xs text-muted-foreground">
              {Math.round(progress ?? 0)}%
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <p className="font-display text-base font-semibold tracking-tight">
                Drop a video to start a project
              </p>
              <p className="text-sm text-muted-foreground">
                MP4, WebM, or MOV — up to a few minutes of footage works best.
              </p>
            </div>
            <Button
              type="button"
              onClick={openPicker}
              disabled={isBusy}
              data-ocid="dashboard.upload_button"
            >
              <UploadCloud className="size-4" aria-hidden="true" />
              Choose video
            </Button>
          </>
        )}

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          onChange={(event) => {
            acceptFile(event.target.files?.[0]);
            event.target.value = "";
          }}
          disabled={isBusy}
          data-ocid="dashboard.file_input"
        />
      </div>

      {message ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          data-ocid="dashboard.upload_error"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          {message}
        </p>
      ) : null}
    </div>
  );
}
