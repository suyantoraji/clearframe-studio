import { RenderProgress } from "@/components/render/RenderProgress";
import { RenderResult } from "@/components/render/RenderResult";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSaveRender } from "@/hooks/use-renders";
import { formatDuration } from "@/lib/format";
import {
  DEFAULT_ENHANCE,
  type EnhanceSettings,
} from "@/lib/processing/enhance";
import type { InpaintPatch } from "@/lib/processing/inpaint";
import type { MaskShape } from "@/lib/processing/mask";
import type { MattingSettings } from "@/lib/processing/matting";
import {
  type PipelineSettings,
  buildStaticPatch,
  describePipeline,
  processFrame,
} from "@/lib/processing/pipeline";
import {
  type EncodeResult,
  encodeVideo,
  formatExtension,
  formatLabel,
} from "@/lib/render/encoder";
import { fileToExternalBlob } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { ProjectId } from "@/types";
import {
  loadConfig,
  useInternetIdentity,
} from "@caffeineai/core-infrastructure";
import { StorageClient } from "@caffeineai/object-storage";
import { HttpAgent, type Identity } from "@icp-sdk/core/agent";
import { Eraser, Loader2, Sparkles, UserRound, Wand2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface RenderPanelProps {
  /** Project the render belongs to, or null in a temporary signed-out session. */
  projectId: ProjectId | null;
  /** Source video element whose frames are processed and whose audio is kept. */
  video: HTMLVideoElement | null;
  /** Source filename, used to name the exported file. */
  sourceFilename: string;
  /** Source duration in milliseconds. */
  durationMs: bigint;
  /** Whether the current visitor is signed in and can persist the render. */
  isAuthenticated: boolean;
  /** Whether watermark removal is armed in the workspace. */
  watermarkEnabled: boolean;
  /** Whether video enhancement is armed in the workspace. */
  enhanceEnabled: boolean;
  /** Whether background replacement is armed in the workspace. */
  backgroundEnabled: boolean;
  /** Toggle watermark removal. */
  onWatermarkChange: (enabled: boolean) => void;
  /** Toggle video enhancement. */
  onEnhanceChange: (enabled: boolean) => void;
  /** Toggle background replacement. */
  onBackgroundChange: (enabled: boolean) => void;
  /** The mask shapes the workspace owns, reused verbatim by the render. */
  maskShapes: MaskShape[];
  /** Whether the static-mask fast path is armed in the workspace. */
  staticMask: boolean;
  /** The user's enhancement slider values. */
  enhance: EnhanceSettings;
  /** The user's matting mode, color, and feather. */
  matting: MattingSettings;
  /** The user's upscale factor (1, 1.5, or 2). */
  upscale: number;
  className?: string;
}

type RenderPhase = "idle" | "rendering" | "done";

interface FinishedRender {
  url: string;
  blob: Blob;
  format: string;
  resolution: string;
  settingsSummary: string;
  audioIncluded: boolean;
}

const TARGET_FPS = 30;

/**
 * Seek a video element to a timestamp and resolve once the frame is decoded.
 *
 * A `seeked` event is not guaranteed to fire when the target equals the current
 * time, so an already-at-target check short-circuits and a safety timeout keeps
 * the encode from stalling on a browser that never fires the event.
 */
function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const target = Math.min(Math.max(0, time), Math.max(0, duration - 0.001));
    if (Math.abs(video.currentTime - target) < 1e-4) {
      resolve();
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener("seeked", finish);
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(finish, 1000);
    video.addEventListener("seeked", finish);
    video.currentTime = target;
  });
}

/**
 * Upload a finished render to platform object storage and return the stored
 * reference. The reference is the gateway direct URL, which is what
 * `fileRefToUrl` resolves back into a displayable URL and what
 * `downloadFileRef` resolves back into bytes.
 */
async function uploadRenderFile(
  file: File,
  identity: Identity | undefined,
): Promise<string> {
  const config = await loadConfig();
  const agent = await HttpAgent.create({
    host: config.backend_host,
    identity,
  });
  const client = new StorageClient(
    config.bucket_name,
    config.storage_gateway_url,
    config.backend_canister_id,
    config.project_id,
    agent,
  );
  const blob = await fileToExternalBlob(file);
  const bytes = await blob.getBytes();
  const { hash } = await client.putFile(
    bytes,
    undefined,
    blob.contentType,
    blob.filename,
  );
  return client.getDirectURL(hash);
}

/**
 * Render control surface used from the workspace.
 *
 * A single render action applies the chosen combination of watermark removal,
 * enhancement, and background replacement to the whole video. Frames are
 * processed on-device and muxed back into a video with the original audio
 * track; progress is shown as a percentage with an estimated remaining time
 * and a cancel action. Signed-in users can save the result to the project,
 * while signed-out visitors get a direct download.
 */
export function RenderPanel({
  projectId,
  video,
  sourceFilename,
  durationMs,
  isAuthenticated,
  watermarkEnabled,
  enhanceEnabled,
  backgroundEnabled,
  onWatermarkChange,
  onEnhanceChange,
  onBackgroundChange,
  maskShapes,
  staticMask,
  enhance,
  matting,
  upscale,
  className,
}: RenderPanelProps) {
  const [phase, setPhase] = useState<RenderPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [framesDone, setFramesDone] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [result, setResult] = useState<FinishedRender | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const cancelRef = useRef(false);
  const startedAtRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const saveRender = useSaveRender();
  const { identity } = useInternetIdentity();

  const anyToolEnabled =
    watermarkEnabled || enhanceEnabled || backgroundEnabled;

  const frameCount = useMemo(() => {
    const seconds = Number(durationMs) / 1000;
    return Math.max(1, Math.round(seconds * TARGET_FPS));
  }, [durationMs]);

  const resolution = useMemo(() => {
    if (!video) return "—";
    const width = Math.round((video.videoWidth || 1920) * upscale);
    const height = Math.round((video.videoHeight || 1080) * upscale);
    return `${width} × ${height}`;
  }, [video, upscale]);

  // The pipeline settings derived from the workspace's real state: the mask
  // shapes the user drew, the static-mask toggle, the enhancement sliders, the
  // matting mode/color/feather, and the upscale factor. Each tool switch gates
  // its stage: enhancement applies only when the enhancement tool is on, and
  // background replacement only when the background tool is on.
  const pipelineSettings = useMemo<PipelineSettings>(
    () => ({
      maskShapes: watermarkEnabled ? maskShapes : [],
      staticMask,
      enhance: enhanceEnabled ? enhance : DEFAULT_ENHANCE,
      matting: { ...matting, enabled: backgroundEnabled },
      upscale,
    }),
    [
      watermarkEnabled,
      maskShapes,
      staticMask,
      enhance,
      enhanceEnabled,
      backgroundEnabled,
      matting,
      upscale,
    ],
  );

  // Release the object URL when the result is replaced or the panel unmounts.
  useEffect(() => {
    return () => {
      if (result) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  const reset = useCallback(() => {
    cancelRef.current = false;
    setPhase("idle");
    setProgress(0);
    setFramesDone(0);
    setRemainingSeconds(null);
    setError(null);
    setIsSaved(false);
    setResult((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }, []);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const handleRender = useCallback(async () => {
    if (!video) {
      setError("Load a video into the workspace before rendering.");
      return;
    }

    setError(null);
    setIsSaved(false);
    setPhase("rendering");
    setProgress(0);
    setFramesDone(0);
    setRemainingSeconds(null);
    cancelRef.current = false;
    startedAtRef.current = performance.now();

    const sourceWidth = video.videoWidth || 1920;
    const sourceHeight = video.videoHeight || 1080;

    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    canvas.width = Math.max(1, Math.round(sourceWidth * upscale));
    canvas.height = Math.max(1, Math.round(sourceHeight * upscale));
    const context = canvas.getContext("2d");
    if (!context) {
      setError("This browser cannot create a drawing surface for rendering.");
      setPhase("idle");
      return;
    }

    // Build the reusable inpaint patch once for static-mask mode so every
    // frame reuses the same reconstruction instead of re-inpainting.
    let patch: InpaintPatch | null = null;
    if (staticMask && pipelineSettings.maskShapes.length > 0) {
      try {
        patch = buildStaticPatch(
          video,
          sourceWidth,
          sourceHeight,
          pipelineSettings,
        );
      } catch {
        patch = null;
      }
    }

    // Seek the source to each frame's timestamp before processing, so every
    // output frame is the processed frame at that time rather than one repeated
    // frame. The static patch is built once and reused across frames.
    const clipDuration = Number.isFinite(video.duration)
      ? video.duration
      : Number(durationMs) / 1000;
    const drawFrame = async (index: number) => {
      const time =
        frameCount <= 1 ? 0 : (index / (frameCount - 1)) * clipDuration;
      await seekVideo(video, time);
      const processed = processFrame(
        video,
        sourceWidth,
        sourceHeight,
        pipelineSettings,
        staticMask ? patch : null,
      );
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(processed.canvas, 0, 0, canvas.width, canvas.height);
    };

    let encoded: EncodeResult;
    try {
      encoded = await encodeVideo({
        source: video,
        canvas,
        frameCount,
        playbackRate: video.playbackRate || 1,
        drawFrame,
        onProgress: (value) => {
          setProgress(value);
          setFramesDone(Math.round(value * frameCount));
          const elapsed = (performance.now() - startedAtRef.current) / 1000;
          if (value > 0.02) {
            const total = elapsed / value;
            setRemainingSeconds(Math.max(0, total - elapsed));
          }
        },
        isCancelled: () => cancelRef.current,
      });
    } catch {
      setError("Rendering failed. Try a shorter clip or a different browser.");
      setPhase("idle");
      return;
    }

    if (cancelRef.current || encoded.blob.size === 0) {
      reset();
      return;
    }

    const url = URL.createObjectURL(encoded.blob);
    setResult({
      url,
      blob: encoded.blob,
      format: formatLabel(encoded.format),
      resolution,
      settingsSummary: describePipeline(pipelineSettings),
      audioIncluded: encoded.audioIncluded,
    });
    setProgress(1);
    setFramesDone(frameCount);
    setRemainingSeconds(0);
    setPhase("done");
  }, [
    video,
    frameCount,
    durationMs,
    resolution,
    pipelineSettings,
    staticMask,
    upscale,
    reset,
  ]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const base = sourceFilename.replace(/\.[^.]+$/, "") || "render";
    const extension = result.format.toLowerCase();
    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.download = `${base}-clean.${extension}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }, [result, sourceFilename]);

  const handleSave = useCallback(async () => {
    if (!result || projectId === null) return;
    setError(null);
    try {
      const extension = formatExtension(
        result.format === "MP4" ? "mp4" : "webm",
      );
      const file = new File(
        [result.blob],
        `${sourceFilename.replace(/\.[^.]+$/, "") || "render"}-clean.${extension}`,
        { type: result.blob.type },
      );
      const fileRef = await uploadRenderFile(file, identity);
      await saveRender.mutateAsync({
        projectId,
        outputFile: fileRef,
        format: result.format,
        resolution: result.resolution,
        settingsSummary: result.settingsSummary,
      });
      setIsSaved(true);
    } catch {
      setError("Could not save this render. Please try again.");
    }
  }, [result, projectId, sourceFilename, saveRender, identity]);

  const tools = [
    {
      key: "watermark",
      label: "Watermark removal",
      description: "Horizontal, vertical, and diagonal marks",
      icon: Eraser,
      enabled: watermarkEnabled,
      onChange: onWatermarkChange,
    },
    {
      key: "enhance",
      label: "Video enhancement",
      description: "Sharpen, denoise, and rebalance tone",
      icon: Sparkles,
      enabled: enhanceEnabled,
      onChange: onEnhanceChange,
    },
    {
      key: "background",
      label: "Background replacement",
      description: "Subject matting and backdrop swap",
      icon: UserRound,
      enabled: backgroundEnabled,
      onChange: onBackgroundChange,
    },
  ] as const;

  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-panel",
        className,
      )}
      aria-label="Render and export"
      data-ocid="render.panel"
    >
      <div className="flex items-center gap-2">
        <Wand2 className="size-4 text-primary" aria-hidden="true" />
        <h2 className="font-display text-sm font-semibold tracking-tight">
          Render &amp; export
        </h2>
        <span className="ml-auto text-mono-num text-xs text-muted-foreground">
          {formatDuration(durationMs)} · {resolution}
        </span>
      </div>

      <fieldset
        className="flex flex-col gap-2"
        disabled={phase === "rendering"}
        data-ocid="render.tools"
      >
        <legend className="sr-only">
          Cleanup tools applied to the whole video
        </legend>
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.key}
              className={cn(
                "flex items-center gap-3 rounded-md border px-3 py-2 transition-smooth",
                tool.enabled
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-secondary/40 hover:border-border",
                phase === "rendering" && "opacity-60",
              )}
              data-ocid={`render.tool_${tool.key}`}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md",
                  tool.enabled
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {tool.label}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {tool.description}
                </span>
              </span>
              <Switch
                checked={tool.enabled}
                onCheckedChange={tool.onChange}
                className="ml-auto"
                aria-label={tool.label}
                data-ocid={`render.tool_${tool.key}_switch`}
              />
            </div>
          );
        })}
      </fieldset>

      {error ? (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          data-ocid="render.error_state"
        >
          {error}
        </p>
      ) : null}

      {phase === "rendering" ? (
        <RenderProgress
          progress={progress}
          remainingSeconds={remainingSeconds}
          framesDone={framesDone}
          frameCount={frameCount}
          onCancel={handleCancel}
        />
      ) : null}

      {phase === "done" && result ? (
        <RenderResult
          url={result.url}
          format={result.format}
          resolution={result.resolution}
          settingsSummary={result.settingsSummary}
          sizeBytes={result.blob.size}
          audioIncluded={result.audioIncluded}
          canSave={isAuthenticated && projectId !== null}
          isSaving={saveRender.isPending}
          isSaved={isSaved}
          onSave={handleSave}
          onDownload={handleDownload}
          onReset={reset}
        />
      ) : null}

      {phase === "idle" ? (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={handleRender}
            disabled={!video || !anyToolEnabled}
            className="w-full"
            data-ocid="render.primary_button"
          >
            {video ? (
              <Wand2 className="size-4" aria-hidden="true" />
            ) : (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            Render video
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {!video
              ? "Load a video to enable rendering."
              : !anyToolEnabled
                ? "Arm at least one cleanup tool to render."
                : "Processed on your device — footage is never uploaded."}
          </p>
        </div>
      ) : null}
    </section>
  );
}
