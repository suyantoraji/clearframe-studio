import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_ENHANCE } from "@/lib/processing/enhance";
import { DEFAULT_MATTING } from "@/lib/processing/matting";

// The render panel reads the save-render hook and the identity provider, and
// uploads through object storage. Mock those seams so the panel's own gating and
// tool toggles are exercised without a canister or a network.
vi.mock("@/hooks/use-renders", () => ({
  useSaveRender: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@caffeineai/core-infrastructure", () => ({
  useInternetIdentity: () => ({ identity: undefined }),
  loadConfig: vi.fn(),
}));

import { RenderPanel } from "@/components/render/RenderPanel";

function renderPanel(
  overrides: Partial<Parameters<typeof RenderPanel>[0]> = {},
) {
  const props = {
    projectId: 1n,
    video: null as HTMLVideoElement | null,
    sourceFilename: "beach.mp4",
    durationMs: 12_000n,
    isAuthenticated: true,
    watermarkEnabled: true,
    enhanceEnabled: false,
    backgroundEnabled: false,
    onWatermarkChange: vi.fn(),
    onEnhanceChange: vi.fn(),
    onBackgroundChange: vi.fn(),
    maskShapes: [],
    staticMask: true,
    enhance: DEFAULT_ENHANCE,
    matting: DEFAULT_MATTING,
    upscale: 1,
    ...overrides,
  };
  render(<RenderPanel {...props} />);
  return props;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RenderPanel", () => {
  it("disables the render action until a video is loaded", () => {
    renderPanel({ video: null });
    expect(screen.getByTestId("render.primary_button")).toBeDisabled();
    expect(
      screen.getByText("Load a video to enable rendering."),
    ).toBeInTheDocument();
  });

  it("disables the render action until at least one cleanup tool is armed", () => {
    const video = document.createElement("video");
    renderPanel({
      video,
      watermarkEnabled: false,
      enhanceEnabled: false,
      backgroundEnabled: false,
    });
    expect(screen.getByTestId("render.primary_button")).toBeDisabled();
    expect(
      screen.getByText("Arm at least one cleanup tool to render."),
    ).toBeInTheDocument();
  });

  it("enables the render action once a video and a tool are present", () => {
    const video = document.createElement("video");
    renderPanel({ video, watermarkEnabled: true });
    expect(screen.getByTestId("render.primary_button")).toBeEnabled();
    expect(
      screen.getByText("Processed on your device — footage is never uploaded."),
    ).toBeInTheDocument();
  });

  it("reports each cleanup tool toggle to the workspace", async () => {
    const user = userEvent.setup();
    const onEnhanceChange = vi.fn();
    const onBackgroundChange = vi.fn();
    renderPanel({ onEnhanceChange, onBackgroundChange });

    await user.click(screen.getByTestId("render.tool_enhance_switch"));
    await user.click(screen.getByTestId("render.tool_background_switch"));

    expect(onEnhanceChange).toHaveBeenCalledWith(true);
    expect(onBackgroundChange).toHaveBeenCalledWith(true);
  });

  it("shows the source duration and output resolution", () => {
    const video = document.createElement("video");
    Object.defineProperty(video, "videoWidth", {
      value: 1920,
      configurable: true,
    });
    Object.defineProperty(video, "videoHeight", {
      value: 1080,
      configurable: true,
    });
    renderPanel({ video, durationMs: 12_000n, upscale: 2 });

    // 12s clip at 30fps, upscaled 2x from 1920×1080.
    expect(screen.getByText(/0:12/)).toBeInTheDocument();
    expect(screen.getByText(/3840 × 2160/)).toBeInTheDocument();
  });
});
