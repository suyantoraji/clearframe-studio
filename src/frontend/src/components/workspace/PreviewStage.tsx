import { Button } from "@/components/ui/button";
import { CompareToggle } from "@/components/workspace/CompareToggle";
import { MaskCanvas } from "@/components/workspace/MaskCanvas";
import { formatTimecode } from "@/lib/format";
import type { MaskShape, MaskTool } from "@/lib/processing/mask";
import { cn } from "@/lib/utils";
import {
  ChevronFirst,
  ChevronLast,
  Maximize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface PreviewStageProps {
  videoUrl: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** The processed frame canvas, or null while showing the original. */
  resultCanvas: HTMLCanvasElement | null;
  showingResult: boolean;
  onToggleResult: (showingResult: boolean) => void;
  hasResult: boolean;
  maskShapes: MaskShape[];
  activeTool: MaskTool;
  brushSize: number;
  proposal: MaskShape | null;
  onCommitShape: (shape: MaskShape) => void;
  onAcceptProposal: () => void;
  onDiscardProposal: () => void;
  onFrameReady: (canvas: HTMLCanvasElement) => void;
  onTimeUpdate: (currentMs: number, durationMs: number) => void;
  onProcessFrame: () => void;
  processing: boolean;
}

const FRAME_STEP_MS = 1000 / 30;

/**
 * Central preview stage.
 *
 * Owns the video element, the transport controls (scrubber, play/pause, and
 * frame stepping), the mask overlay, and the before/after comparison. The
 * original frame is captured into a canvas so the mask overlay and the
 * processed result share one coordinate space.
 */
export function PreviewStage({
  videoUrl,
  videoRef,
  resultCanvas,
  showingResult,
  onToggleResult,
  hasResult,
  maskShapes,
  activeTool,
  brushSize,
  proposal,
  onCommitShape,
  onAcceptProposal,
  onDiscardProposal,
  onFrameReady,
  onTimeUpdate,
  onProcessFrame,
  processing,
}: PreviewStageProps) {
  const frameRef = useRef<HTMLCanvasElement | null>(null);
  const [frameCanvas, setFrameCanvas] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = frameRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setFrameCanvas(canvas);
    onFrameReady(canvas);
  }, [onFrameReady, videoRef]);

  // Capture the first frame once metadata is available.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleLoaded = () => {
      setDurationMs(video.duration * 1000);
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setAspectRatio(video.videoWidth / video.videoHeight);
      }
      captureFrame();
    };
    video.addEventListener("loadeddata", handleLoaded);
    return () => video.removeEventListener("loadeddata", handleLoaded);
  }, [captureFrame, videoRef]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const ms = video.currentTime * 1000;
    setCurrentMs(ms);
    onTimeUpdate(ms, video.duration * 1000);
  }, [onTimeUpdate, videoRef]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }, [videoRef]);

  const seekTo = useCallback(
    (ms: number) => {
      const video = videoRef.current;
      if (!video) return;
      const clamped = Math.min(Math.max(0, ms), video.duration * 1000);
      video.currentTime = clamped / 1000;
      setCurrentMs(clamped);
      captureFrame();
    },
    [captureFrame, videoRef],
  );

  const stepFrame = useCallback(
    (direction: 1 | -1) => {
      const video = videoRef.current;
      if (!video) return;
      video.pause();
      setPlaying(false);
      seekTo(video.currentTime * 1000 + direction * FRAME_STEP_MS);
    },
    [seekTo, videoRef],
  );

  const handleScrub = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const video = videoRef.current;
      if (!video) return;
      video.pause();
      setPlaying(false);
      seekTo(Number(event.target.value));
    },
    [seekTo, videoRef],
  );

  const requestFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    void video.requestFullscreen?.();
  }, [videoRef]);

  return (
    <section
      className="flex min-w-0 flex-1 flex-col bg-background"
      aria-label="Preview stage"
      data-ocid="workspace.preview_stage"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Masking
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-mono-num text-xs text-muted-foreground"
            data-ocid="workspace.timecode"
          >
            {formatTimecode(currentMs)}
          </span>
          <CompareToggle
            showingResult={showingResult}
            onToggle={onToggleResult}
            hasResult={hasResult}
          />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
        <div className="relative w-full max-w-3xl">
          <div
            className="relative w-full overflow-hidden rounded-lg border border-border bg-checkerboard shadow-subtle"
            style={{ aspectRatio: `${aspectRatio}` }}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              muted
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onSeeked={captureFrame}
              className={cn(
                "absolute inset-0 size-full object-contain",
                showingResult && "invisible",
              )}
              data-ocid="workspace.video"
            />

            {showingResult && resultCanvas ? (
              <img
                src={resultCanvas.toDataURL("image/png")}
                alt="Processed frame preview"
                className="absolute inset-0 size-full object-contain"
                data-ocid="workspace.result_preview"
              />
            ) : null}

            <MaskCanvas
              frameCanvas={frameCanvas}
              shapes={maskShapes}
              activeTool={activeTool}
              brushSize={brushSize}
              proposal={proposal}
              onCommitShape={onCommitShape}
              onAcceptProposal={onAcceptProposal}
              onDiscardProposal={onDiscardProposal}
              className="absolute inset-0"
            />
          </div>

          <canvas ref={frameRef} className="hidden" />
        </div>
      </div>

      <div className="border-t border-border bg-card px-4 py-3">
        <input
          type="range"
          min={0}
          max={Math.max(1, durationMs)}
          step={1}
          value={currentMs}
          onChange={handleScrub}
          aria-label="Scrubber"
          data-ocid="workspace.scrubber"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
        />

        <div className="mt-3 flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => seekTo(0)}
            aria-label="Go to start"
            data-ocid="workspace.start_button"
            className="size-8"
          >
            <ChevronFirst className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => stepFrame(-1)}
            aria-label="Step back one frame"
            data-ocid="workspace.step_back_button"
            className="size-8"
          >
            <SkipBack className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            data-ocid="workspace.play_button"
            className="size-9"
          >
            {playing ? (
              <Pause className="size-4" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => stepFrame(1)}
            aria-label="Step forward one frame"
            data-ocid="workspace.step_forward_button"
            className="size-8"
          >
            <SkipForward className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => seekTo(durationMs)}
            aria-label="Go to end"
            data-ocid="workspace.end_button"
            className="size-8"
          >
            <ChevronLast className="size-4" aria-hidden="true" />
          </Button>

          <span className="ml-2 text-mono-num text-xs text-muted-foreground">
            {formatTimecode(currentMs)} / {formatTimecode(durationMs)}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onProcessFrame}
              disabled={processing}
              data-ocid="workspace.process_frame_button"
            >
              {processing ? "Processing…" : "Process frame"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={requestFullscreen}
              aria-label="Fullscreen"
              data-ocid="workspace.fullscreen_button"
              className="size-8"
            >
              <Maximize2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
