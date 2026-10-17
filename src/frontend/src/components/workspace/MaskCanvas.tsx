import {
  type MaskShape,
  type MaskTool,
  type Point,
  clampPoint,
  isUsableRect,
  rectFromPoints,
} from "@/lib/processing/mask";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

interface MaskCanvasProps {
  /** The frame the mask is drawn over, already sized to the stage. */
  frameCanvas: HTMLCanvasElement | null;
  shapes: MaskShape[];
  activeTool: MaskTool;
  brushSize: number;
  /** A proposed auto-detect region the user can accept, adjust, or discard. */
  proposal: MaskShape | null;
  onCommitShape: (shape: MaskShape) => void;
  onAcceptProposal: () => void;
  onDiscardProposal: () => void;
  className?: string;
}

interface DragState {
  start: Point;
  current: Point;
  points: Point[];
}

/**
 * Resolve a semantic design token (e.g. `--accent`) into an `oklch()` color
 * string the canvas can paint. Canvas does not resolve CSS custom properties,
 * so the token's raw channel values are read from the document root and
 * composed with the requested alpha. Falls back to the token name when the
 * variable is unavailable.
 */
function tokenColor(token: string, alpha: number): string {
  if (typeof window === "undefined") return `oklch(0.7 0.1 200 / ${alpha})`;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  if (!raw) return `oklch(0.7 0.1 200 / ${alpha})`;
  return `oklch(${raw} / ${alpha})`;
}

/**
 * Canvas overlay for drawing the removal mask.
 *
 * The overlay sits exactly on top of the preview frame and converts pointer
 * positions into normalized video coordinates, so the mask geometry is
 * resolution-independent and survives any preview size. The rectangle tool
 * drags a box in any direction; the brush paints a freehand stroke; the eraser
 * paints a stroke that punches the mask back out.
 */
export function MaskCanvas({
  frameCanvas,
  shapes,
  activeTool,
  brushSize,
  proposal,
  onCommitShape,
  onAcceptProposal,
  onDiscardProposal,
  className,
}: MaskCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const toNormalized = useCallback((event: React.PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return clampPoint({
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    });
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (proposal) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      const point = toNormalized(event);
      setDrag({ start: point, current: point, points: [point] });
    },
    [proposal, toNormalized],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drag) return;
      const point = toNormalized(event);
      setDrag((previous) =>
        previous
          ? {
              ...previous,
              current: point,
              points:
                activeTool === "rectangle"
                  ? previous.points
                  : [...previous.points, point],
            }
          : previous,
      );
    },
    [activeTool, drag, toNormalized],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drag) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (activeTool === "rectangle") {
        const rect = rectFromPoints(drag.start, drag.current);
        if (isUsableRect(rect)) onCommitShape(rect);
      } else if (drag.points.length > 1) {
        onCommitShape({
          kind: "brush",
          points: drag.points,
          size: brushSize / 100,
          subtract: activeTool === "eraser",
        });
      }
      setDrag(null);
    },
    [activeTool, brushSize, drag, onCommitShape],
  );

  // Paint the mask overlay whenever the shapes, drag, or frame change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);

    const paintShape = (shape: MaskShape, fill: string, stroke: string) => {
      context.fillStyle = fill;
      context.strokeStyle = stroke;
      context.lineWidth = 1.5;
      if (shape.kind === "rect") {
        const x = shape.x * width;
        const y = shape.y * height;
        const w = shape.width * width;
        const h = shape.height * height;
        context.fillRect(x, y, w, h);
        context.strokeRect(x, y, w, h);
      } else {
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = Math.max(2, shape.size * width);
        context.strokeStyle = fill;
        context.beginPath();
        shape.points.forEach((point, index) => {
          const x = point.x * width;
          const y = point.y * height;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.stroke();
      }
    };

    for (const shape of shapes) {
      if (shape.subtract) {
        paintShape(
          shape,
          tokenColor("--destructive", 0.4),
          tokenColor("--destructive", 1),
        );
      } else {
        paintShape(
          shape,
          tokenColor("--accent", 0.32),
          tokenColor("--accent", 1),
        );
      }
    }

    if (drag) {
      if (activeTool === "rectangle") {
        paintShape(
          rectFromPoints(drag.start, drag.current),
          tokenColor("--primary", 0.28),
          tokenColor("--primary", 1),
        );
      } else {
        paintShape(
          { kind: "brush", points: drag.points, size: brushSize / 100 },
          activeTool === "eraser"
            ? tokenColor("--destructive", 0.5)
            : tokenColor("--primary", 0.5),
          "transparent",
        );
      }
    }

    if (proposal && proposal.kind === "rect") {
      const x = proposal.x * width;
      const y = proposal.y * height;
      const w = proposal.width * width;
      const h = proposal.height * height;
      context.setLineDash([6, 4]);
      context.strokeStyle = tokenColor("--primary", 1);
      context.lineWidth = 2;
      context.strokeRect(x, y, w, h);
      context.setLineDash([]);
    }
  }, [shapes, drag, activeTool, brushSize, proposal]);

  // Keep the overlay backing store matched to the frame's pixel size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frameCanvas) return;
    canvas.width = frameCanvas.width;
    canvas.height = frameCanvas.height;
  }, [frameCanvas]);

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label="Watermark removal mask overlay"
        data-ocid="workspace.mask_canvas"
        className={cn(
          "absolute inset-0 size-full touch-none",
          proposal ? "cursor-default" : "cursor-crosshair",
        )}
      />

      {proposal ? (
        <div
          className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-card/95 px-3 py-2 shadow-subtle backdrop-blur"
          data-ocid="workspace.auto_detect_prompt"
        >
          <span className="text-xs text-muted-foreground">
            Candidate watermark region detected. Accept, adjust, or discard it.
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onAcceptProposal}
              data-ocid="workspace.auto_detect_accept_button"
              className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground outline-none transition-smooth hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={onDiscardProposal}
              data-ocid="workspace.auto_detect_discard_button"
              className="rounded border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground outline-none transition-smooth hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
