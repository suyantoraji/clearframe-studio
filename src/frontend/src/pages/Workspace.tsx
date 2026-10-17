import { RenderPanel } from "@/components/render/RenderPanel";
import { Button } from "@/components/ui/button";
import { BackgroundPanel } from "@/components/workspace/BackgroundPanel";
import { EnhancePanel } from "@/components/workspace/EnhancePanel";
import { PreviewStage } from "@/components/workspace/PreviewStage";
import { ToolRail } from "@/components/workspace/ToolRail";
import { useAuth } from "@/hooks/use-auth";
import { useBackendActor } from "@/lib/backend";
import {
  DEFAULT_ENHANCE,
  type EnhanceSettings,
} from "@/lib/processing/enhance";
import type { InpaintPatch } from "@/lib/processing/inpaint";
import {
  type MaskShape,
  type MaskTool,
  detectWatermarkRegion,
} from "@/lib/processing/mask";
import {
  DEFAULT_MATTING,
  type MattingSettings,
} from "@/lib/processing/matting";
import { buildStaticPatch, processFrame } from "@/lib/processing/pipeline";
import { fileRefToUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { ProjectView } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  FileQuestion,
  Loader2,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Editing workspace.
 *
 * A dense, studio-grade surface: a left masking tool rail, a central preview
 * stage with the video player and mask overlay, and a right control panel for
 * enhancement, background removal, and the render/export action. Every
 * processing stage runs on the user's own device against a canvas — footage is
 * never uploaded for processing.
 *
 * On narrow widths the rail and control panel collapse into a single stacked
 * column so the preview keeps a usable width instead of being squeezed to zero.
 */
export function WorkspacePage() {
  const { projectId } = useParams({ from: "/workspace/$projectId" });
  const parsedId = useMemo(() => {
    try {
      return BigInt(projectId);
    } catch {
      return null;
    }
  }, [projectId]);

  const { isAuthenticated } = useAuth();
  const { actor, isFetching } = useBackendActor();

  // The workspace needs the raw `ProjectView` because it carries the opaque
  // `sourceFile` reference the preview resolves into a playable URL; the shared
  // `ProjectSummary` intentionally omits it.
  const {
    data: project,
    isError: projectError,
    error: projectErrorValue,
    isFetched: projectFetched,
    refetch: refetchProject,
  } = useQuery<ProjectView | null>({
    queryKey: ["workspace", "project", projectId],
    queryFn: async () => {
      if (!actor || parsedId === null) return null;
      const result = await actor.getProject(parsedId);
      return result.__kind__ === "ok" ? result.ok : null;
    },
    enabled: !!actor && !isFetching && parsedId !== null,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [resultCanvas, setResultCanvas] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [showingResult, setShowingResult] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);

  const [shapes, setShapes] = useState<MaskShape[]>([]);
  const [redoStack, setRedoStack] = useState<MaskShape[]>([]);
  const [activeTool, setActiveTool] = useState<MaskTool>("rectangle");
  const [brushSize, setBrushSize] = useState(14);
  const [proposal, setProposal] = useState<MaskShape | null>(null);
  const [autoDetectBusy, setAutoDetectBusy] = useState(false);
  const [staticMask, setStaticMask] = useState(true);
  const [patch, setPatch] = useState<InpaintPatch | null>(null);

  const [enhance, setEnhance] = useState<EnhanceSettings>(DEFAULT_ENHANCE);
  const [matting, setMatting] = useState<MattingSettings>(DEFAULT_MATTING);
  const [upscale, setUpscale] = useState(1);

  // Which cleanup tools are armed for the render. These mirror the panels below
  // and drive the render pipeline. Background replacement has a single source of
  // truth — `matting.enabled` — so the panel switch and the render tool switch
  // can never disagree.
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [enhanceEnabled, setEnhanceEnabled] = useState(false);
  const backgroundEnabled = matting.enabled;
  const setBackgroundEnabled = useCallback((enabled: boolean) => {
    setMatting((current) => ({ ...current, enabled }));
  }, []);

  const videoUrl = project ? fileRefToUrl(project.sourceFile) : null;

  // The preview pipeline mirrors the render pipeline's tool gating so what the
  // user sees on the current frame matches what the full render will produce.
  const pipelineSettings = useMemo(
    () => ({
      maskShapes: watermarkEnabled ? shapes : [],
      staticMask,
      enhance: enhanceEnabled ? enhance : DEFAULT_ENHANCE,
      matting: { ...matting, enabled: backgroundEnabled },
      upscale,
    }),
    [
      watermarkEnabled,
      shapes,
      staticMask,
      enhance,
      enhanceEnabled,
      matting,
      backgroundEnabled,
      upscale,
    ],
  );

  const handleFrameReady = useCallback((canvas: HTMLCanvasElement) => {
    setSourceCanvas(canvas);
    // The video element is mounted by the time the first frame is captured;
    // publish it so the render panel can process the whole clip.
    setVideoEl(videoRef.current);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    // The stage owns the readout; the page only needs the frame for processing.
  }, []);

  const commitShape = useCallback((shape: MaskShape) => {
    setShapes((previous) => [...previous, shape]);
    setRedoStack([]);
    setPatch(null);
  }, []);

  const undo = useCallback(() => {
    setShapes((previous) => {
      if (previous.length === 0) return previous;
      const last = previous[previous.length - 1];
      setRedoStack((redo) => [...redo, last]);
      return previous.slice(0, -1);
    });
    setPatch(null);
  }, []);

  const redo = useCallback(() => {
    setRedoStack((redo) => {
      if (redo.length === 0) return redo;
      const last = redo[redo.length - 1];
      setShapes((previous) => [...previous, last]);
      return redo.slice(0, -1);
    });
    setPatch(null);
  }, []);

  const clearMask = useCallback(() => {
    setShapes([]);
    setRedoStack([]);
    setPatch(null);
  }, []);

  const autoDetect = useCallback(() => {
    const canvas = sourceCanvas;
    if (!canvas) return;
    setAutoDetectBusy(true);
    // Yield a frame so the button's busy state paints before the synchronous
    // scan runs over the full frame.
    window.setTimeout(() => {
      try {
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;
        const imageData = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
        setProposal(detectWatermarkRegion(imageData));
      } finally {
        setAutoDetectBusy(false);
      }
    }, 0);
  }, [sourceCanvas]);

  const acceptProposal = useCallback(() => {
    if (proposal) commitShape(proposal);
    setProposal(null);
  }, [commitShape, proposal]);

  const discardProposal = useCallback(() => setProposal(null), []);

  // Run the pipeline over the current frame and publish the result canvas.
  // Shared by the explicit "Process frame" action and the live preview effect.
  const renderCurrentFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const nextPatch =
      staticMask && pipelineSettings.maskShapes.length > 0 && !patch
        ? buildStaticPatch(
            video,
            video.videoWidth,
            video.videoHeight,
            pipelineSettings,
          )
        : patch;
    if (nextPatch && nextPatch !== patch) setPatch(nextPatch);
    const result = processFrame(
      video,
      video.videoWidth,
      video.videoHeight,
      pipelineSettings,
      staticMask ? nextPatch : null,
    );
    setResultCanvas(result.canvas);
  }, [patch, pipelineSettings, staticMask]);

  const processCurrentFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    setProcessing(true);
    // Yield a frame so the button's pending state paints before the work runs.
    window.setTimeout(() => {
      try {
        renderCurrentFrame();
        setShowingResult(true);
      } finally {
        setProcessing(false);
      }
    }, 0);
  }, [renderCurrentFrame]);

  // Live preview: once a processed frame is on screen, re-run the pipeline as
  // the enhancement sliders, matting settings, mask, or upscale change so the
  // preview tracks the controls without a manual "Process frame" click.
  useEffect(() => {
    if (!showingResult) return;
    const handle = window.setTimeout(() => {
      renderCurrentFrame();
    }, 120);
    return () => window.clearTimeout(handle);
  }, [showingResult, renderCurrentFrame]);

  // A missing id, an unauthorized project, or a backend failure must not strand
  // the user on an indefinite spinner — each gets its own terminal state.
  if (projectError) {
    return (
      <div
        className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center"
        data-ocid="workspace.error_state"
      >
        <AlertTriangle className="size-6 text-destructive" aria-hidden="true" />
        <h1 className="font-display text-base font-semibold tracking-tight">
          Could not open this project
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {projectErrorValue instanceof Error
            ? projectErrorValue.message
            : "Something went wrong while loading the project."}
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void refetchProject()}
          data-ocid="workspace.retry_button"
        >
          Try again
        </Button>
      </div>
    );
  }

  if (parsedId === null || (projectFetched && !project)) {
    return (
      <div
        className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center"
        data-ocid="workspace.not_found_state"
      >
        <FileQuestion
          className="size-6 text-muted-foreground"
          aria-hidden="true"
        />
        <h1 className="font-display text-base font-semibold tracking-tight">
          Project not found
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This project does not exist, or it belongs to another account.
        </p>
        <Button type="button" variant="secondary" asChild>
          <Link to="/" data-ocid="workspace.back_to_dashboard_link">
            Back to dashboard
          </Link>
        </Button>
      </div>
    );
  }

  if (!project) {
    return (
      <div
        className="flex min-h-[70vh] items-center justify-center"
        data-ocid="workspace.loading_state"
      >
        <Loader2
          className="size-6 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
        <span className="sr-only">Loading project</span>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden"
      data-ocid="workspace.page"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate font-display text-sm font-semibold tracking-tight">
            {project.name}
          </h1>
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">
            {project.sourceFilename}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="hidden items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-accent md:flex"
            data-ocid="workspace.on_device_badge"
          >
            <ShieldCheck className="size-3" aria-hidden="true" />
            Processed on your device — footage is never uploaded
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setControlsOpen((open) => !open)}
            className="lg:hidden"
            aria-expanded={controlsOpen}
            aria-controls="workspace-controls"
            data-ocid="workspace.controls_toggle_button"
          >
            {controlsOpen ? (
              <X className="size-4" aria-hidden="true" />
            ) : (
              <SlidersHorizontal className="size-4" aria-hidden="true" />
            )}
            Controls
          </Button>
        </div>
      </div>

      {!isAuthenticated ? (
        <p
          className="border-b border-border bg-secondary/40 px-4 py-1.5 text-xs text-muted-foreground"
          data-ocid="workspace.session_notice"
        >
          Temporary session — you can process freely, but sign in to save
          renders to your project.
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <ToolRail
          activeTool={activeTool}
          onToolChange={setActiveTool}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          canUndo={shapes.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={undo}
          onRedo={redo}
          onAutoDetect={autoDetect}
          autoDetectBusy={autoDetectBusy}
          shapeCount={shapes.length}
          onClearMask={clearMask}
        />

        {videoUrl ? (
          <PreviewStage
            videoUrl={videoUrl}
            videoRef={videoRef}
            resultCanvas={resultCanvas}
            showingResult={showingResult}
            onToggleResult={setShowingResult}
            hasResult={!!resultCanvas}
            maskShapes={shapes}
            activeTool={activeTool}
            brushSize={brushSize}
            proposal={proposal}
            onCommitShape={commitShape}
            onAcceptProposal={acceptProposal}
            onDiscardProposal={discardProposal}
            onFrameReady={handleFrameReady}
            onTimeUpdate={handleTimeUpdate}
            onProcessFrame={processCurrentFrame}
            processing={processing}
          />
        ) : (
          <div
            className="flex flex-1 items-center justify-center"
            data-ocid="workspace.error_state"
          >
            <p className="text-sm text-muted-foreground">
              This project has no source video.
            </p>
          </div>
        )}

        <aside
          id="workspace-controls"
          className={cn(
            "flex w-full shrink-0 flex-col overflow-y-auto border-t border-border bg-card lg:w-80 lg:border-t-0 lg:border-l",
            controlsOpen ? "flex" : "hidden lg:flex",
          )}
          aria-label="Controls"
          data-ocid="workspace.control_panel"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Control
            </h2>
            <label className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <input
                type="checkbox"
                checked={staticMask}
                onChange={(event) => {
                  setStaticMask(event.target.checked);
                  setPatch(null);
                }}
                data-ocid="workspace.static_mask_checkbox"
                className="size-3.5 accent-primary"
              />
              Static mask
            </label>
          </div>

          <EnhancePanel
            settings={enhance}
            onChange={setEnhance}
            upscale={upscale}
            onUpscaleChange={setUpscale}
          />
          <BackgroundPanel settings={matting} onChange={setMatting} />

          <div className="border-t border-border px-4 py-4">
            <RenderPanel
              projectId={project.id}
              video={videoEl}
              sourceFilename={project.sourceFilename}
              durationMs={project.durationMs}
              isAuthenticated={isAuthenticated}
              watermarkEnabled={watermarkEnabled}
              enhanceEnabled={enhanceEnabled}
              backgroundEnabled={backgroundEnabled}
              onWatermarkChange={setWatermarkEnabled}
              onEnhanceChange={setEnhanceEnabled}
              onBackgroundChange={setBackgroundEnabled}
              maskShapes={shapes}
              staticMask={staticMask}
              enhance={enhance}
              matting={matting}
              upscale={upscale}
            />
          </div>

          <div className="mt-auto border-t border-border px-4 py-3">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {shapes.length === 0
                ? "Draw over the watermark with the rectangle or brush tool. Any orientation works."
                : `${shapes.length} mask shape${shapes.length === 1 ? "" : "s"} · ${staticMask ? "static patch reused across frames" : "re-inpainted per frame"}`}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
