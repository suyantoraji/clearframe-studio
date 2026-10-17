import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MaskCanvas } from "@/components/workspace/MaskCanvas";
import { PreviewStage } from "@/components/workspace/PreviewStage";
import type { MaskShape } from "@/lib/processing/mask";

// jsdom has no canvas backend, so `getContext` throws a "Not implemented" error
// on every paint. The overlay and stage both guard on a null context, so
// returning null keeps the components on their real code paths without the
// noise. Restored after each test.
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

/**
 * jsdom reports a zero-sized bounding box for every element, so the overlay's
 * pointer-to-normalized conversion would divide by zero. Give the canvas a
 * fixed 200×100 box so a pointer at (50, 25) maps to the normalized (0.25, 0.25).
 */
function stubCanvasBox(canvas: HTMLCanvasElement): void {
  canvas.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 200,
      bottom: 100,
      width: 200,
      height: 100,
      toJSON: () => ({}),
    }) as DOMRect;
}

/** jsdom has no pointer capture; the overlay calls all three methods. */
function stubPointerCapture(canvas: HTMLCanvasElement): void {
  canvas.setPointerCapture = vi.fn();
  canvas.releasePointerCapture = vi.fn();
  canvas.hasPointerCapture = vi.fn(() => true);
}

function prepareCanvas(): HTMLCanvasElement {
  const canvas = screen.getByTestId(
    "workspace.mask_canvas",
  ) as HTMLCanvasElement;
  stubCanvasBox(canvas);
  stubPointerCapture(canvas);
  return canvas;
}

describe("MaskCanvas", () => {
  it("commits a rectangle drawn in any drag direction", async () => {
    const user = userEvent.setup();
    const onCommitShape = vi.fn();
    render(
      <MaskCanvas
        frameCanvas={null}
        shapes={[]}
        activeTool="rectangle"
        brushSize={14}
        proposal={null}
        onCommitShape={onCommitShape}
        onAcceptProposal={vi.fn()}
        onDiscardProposal={vi.fn()}
      />,
    );
    const canvas = prepareCanvas();

    await user.pointer([
      {
        target: canvas,
        coords: { clientX: 150, clientY: 75 },
        keys: "[MouseLeft>]",
      },
      { target: canvas, coords: { clientX: 50, clientY: 25 } },
      { target: canvas, keys: "[/MouseLeft]" },
    ]);

    expect(onCommitShape).toHaveBeenCalledTimes(1);
    const shape = onCommitShape.mock.calls[0][0] as MaskShape;
    expect(shape.kind).toBe("rect");
    if (shape.kind !== "rect") return;
    // Dragged bottom-right to top-left; the rect normalizes to the same box.
    expect(shape.x).toBeCloseTo(0.25, 5);
    expect(shape.y).toBeCloseTo(0.25, 5);
    expect(shape.width).toBeCloseTo(0.5, 5);
    expect(shape.height).toBeCloseTo(0.5, 5);
  });

  it("commits a freehand brush stroke with the active brush size", async () => {
    const user = userEvent.setup();
    const onCommitShape = vi.fn();
    render(
      <MaskCanvas
        frameCanvas={null}
        shapes={[]}
        activeTool="brush"
        brushSize={20}
        proposal={null}
        onCommitShape={onCommitShape}
        onAcceptProposal={vi.fn()}
        onDiscardProposal={vi.fn()}
      />,
    );
    const canvas = prepareCanvas();

    await user.pointer([
      {
        target: canvas,
        coords: { clientX: 20, clientY: 20 },
        keys: "[MouseLeft>]",
      },
      { target: canvas, coords: { clientX: 100, clientY: 50 } },
      { target: canvas, coords: { clientX: 180, clientY: 80 } },
      { target: canvas, keys: "[/MouseLeft]" },
    ]);

    expect(onCommitShape).toHaveBeenCalledTimes(1);
    const shape = onCommitShape.mock.calls[0][0] as MaskShape;
    expect(shape.kind).toBe("brush");
    if (shape.kind !== "brush") return;
    // A diagonal stroke keeps every sampled point, so non-axis-aligned
    // watermarks are representable.
    expect(shape.points.length).toBeGreaterThan(1);
    expect(shape.points[0]).toEqual({ x: 0.1, y: 0.2 });
    expect(shape.size).toBeCloseTo(0.2, 5);
  });

  it("ignores a rectangle too small to be meaningful", async () => {
    const user = userEvent.setup();
    const onCommitShape = vi.fn();
    render(
      <MaskCanvas
        frameCanvas={null}
        shapes={[]}
        activeTool="rectangle"
        brushSize={14}
        proposal={null}
        onCommitShape={onCommitShape}
        onAcceptProposal={vi.fn()}
        onDiscardProposal={vi.fn()}
      />,
    );
    const canvas = prepareCanvas();

    await user.pointer([
      {
        target: canvas,
        coords: { clientX: 100, clientY: 50 },
        keys: "[MouseLeft>]",
      },
      { target: canvas, coords: { clientX: 100.2, clientY: 50.1 } },
      { target: canvas, keys: "[/MouseLeft]" },
    ]);

    expect(onCommitShape).not.toHaveBeenCalled();
  });

  it("offers accept and discard for an auto-detect proposal", async () => {
    const user = userEvent.setup();
    const onAcceptProposal = vi.fn();
    const onDiscardProposal = vi.fn();
    render(
      <MaskCanvas
        frameCanvas={null}
        shapes={[]}
        activeTool="rectangle"
        brushSize={14}
        proposal={{ kind: "rect", x: 0.6, y: 0.05, width: 0.3, height: 0.15 }}
        onCommitShape={vi.fn()}
        onAcceptProposal={onAcceptProposal}
        onDiscardProposal={onDiscardProposal}
      />,
    );

    expect(
      screen.getByTestId("workspace.auto_detect_prompt"),
    ).toBeInTheDocument();
    await user.click(screen.getByTestId("workspace.auto_detect_accept_button"));
    await user.click(
      screen.getByTestId("workspace.auto_detect_discard_button"),
    );
    expect(onAcceptProposal).toHaveBeenCalledTimes(1);
    expect(onDiscardProposal).toHaveBeenCalledTimes(1);
  });

  it("does not start a new shape while a proposal is pending", async () => {
    const user = userEvent.setup();
    const onCommitShape = vi.fn();
    render(
      <MaskCanvas
        frameCanvas={null}
        shapes={[]}
        activeTool="rectangle"
        brushSize={14}
        proposal={{ kind: "rect", x: 0.6, y: 0.05, width: 0.3, height: 0.15 }}
        onCommitShape={onCommitShape}
        onAcceptProposal={vi.fn()}
        onDiscardProposal={vi.fn()}
      />,
    );
    const canvas = prepareCanvas();

    await user.pointer([
      {
        target: canvas,
        coords: { clientX: 20, clientY: 20 },
        keys: "[MouseLeft>]",
      },
      { target: canvas, coords: { clientX: 180, clientY: 80 } },
      { target: canvas, keys: "[/MouseLeft]" },
    ]);

    expect(onCommitShape).not.toHaveBeenCalled();
  });
});

describe("PreviewStage transport", () => {
  function renderStage(
    overrides: Partial<Parameters<typeof PreviewStage>[0]> = {},
  ) {
    const videoRef = createRef<HTMLVideoElement>();
    const props = {
      videoUrl: "blob:source",
      videoRef,
      resultCanvas: null,
      showingResult: false,
      onToggleResult: vi.fn(),
      hasResult: false,
      maskShapes: [] as MaskShape[],
      activeTool: "rectangle" as const,
      brushSize: 14,
      proposal: null,
      onCommitShape: vi.fn(),
      onAcceptProposal: vi.fn(),
      onDiscardProposal: vi.fn(),
      onFrameReady: vi.fn(),
      onTimeUpdate: vi.fn(),
      onProcessFrame: vi.fn(),
      processing: false,
      ...overrides,
    };
    render(<PreviewStage {...props} />);
    return { videoRef, props };
  }

  it("renders the video element and the scrubber", () => {
    renderStage();
    expect(screen.getByTestId("workspace.video")).toHaveAttribute(
      "src",
      "blob:source",
    );
    expect(screen.getByTestId("workspace.scrubber")).toBeInTheDocument();
  });

  it("toggles play and pause through the transport button", async () => {
    const user = userEvent.setup();
    const { videoRef } = renderStage();
    const video = videoRef.current as HTMLVideoElement;
    // jsdom does not implement media playback; stub the two methods the
    // transport calls and drive the paused flag the component reads.
    const play = vi.fn(() => {
      Object.defineProperty(video, "paused", {
        value: false,
        configurable: true,
      });
      return Promise.resolve();
    });
    const pause = vi.fn(() => {
      Object.defineProperty(video, "paused", {
        value: true,
        configurable: true,
      });
    });
    video.play = play;
    video.pause = pause;
    Object.defineProperty(video, "paused", { value: true, configurable: true });

    await user.click(screen.getByTestId("workspace.play_button"));
    expect(play).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId("workspace.play_button"));
    expect(pause).toHaveBeenCalledTimes(1);
  });

  it("steps the playhead one frame forward and back", async () => {
    const user = userEvent.setup();
    const { videoRef } = renderStage();
    const video = videoRef.current as HTMLVideoElement;
    video.pause = vi.fn();
    Object.defineProperty(video, "duration", { value: 10, configurable: true });
    Object.defineProperty(video, "currentTime", {
      value: 1,
      writable: true,
      configurable: true,
    });

    await user.click(screen.getByTestId("workspace.step_forward_button"));
    expect(video.currentTime).toBeCloseTo(1 + 1000 / 30 / 1000, 5);

    video.currentTime = 1;
    await user.click(screen.getByTestId("workspace.step_back_button"));
    expect(video.currentTime).toBeCloseTo(1 - 1000 / 30 / 1000, 5);
  });

  it("seeks to the start and end of the clip", async () => {
    const user = userEvent.setup();
    const { videoRef } = renderStage();
    const video = videoRef.current as HTMLVideoElement;
    video.pause = vi.fn();
    Object.defineProperty(video, "duration", { value: 10, configurable: true });
    Object.defineProperty(video, "currentTime", {
      value: 5,
      writable: true,
      configurable: true,
    });
    // The stage learns the clip duration from `loadeddata`; fire it so the
    // end button seeks to the real duration rather than the initial zero.
    await act(async () => {
      video.dispatchEvent(new Event("loadeddata"));
    });

    await user.click(screen.getByTestId("workspace.end_button"));
    expect(video.currentTime).toBe(10);

    await user.click(screen.getByTestId("workspace.start_button"));
    expect(video.currentTime).toBe(0);
  });

  it("requests a single-frame process from the stage", async () => {
    const user = userEvent.setup();
    const onProcessFrame = vi.fn();
    renderStage({ onProcessFrame });

    await user.click(screen.getByTestId("workspace.process_frame_button"));
    expect(onProcessFrame).toHaveBeenCalledTimes(1);
  });

  it("disables the process button while a frame is processing", () => {
    renderStage({ processing: true });
    expect(screen.getByTestId("workspace.process_frame_button")).toBeDisabled();
  });
});
