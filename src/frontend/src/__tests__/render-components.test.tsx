import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RenderProgress } from "@/components/render/RenderProgress";
import { RenderResult } from "@/components/render/RenderResult";

describe("RenderProgress", () => {
  const baseProps = {
    progress: 0.42,
    remainingSeconds: 12,
    framesDone: 42,
    frameCount: 100,
    onCancel: vi.fn(),
  };

  it("shows the completion percentage", () => {
    render(<RenderProgress {...baseProps} />);
    expect(screen.getByTestId("render.progress_percentage")).toHaveTextContent(
      "42%",
    );
  });

  it("clamps out-of-range progress into 0–100", () => {
    render(<RenderProgress {...baseProps} progress={1.8} />);
    expect(screen.getByTestId("render.progress_percentage")).toHaveTextContent(
      "100%",
    );
  });

  it("shows the frame counter and remaining estimate", () => {
    render(<RenderProgress {...baseProps} />);
    expect(screen.getByTestId("render.progress_frames")).toHaveTextContent(
      "42 / 100 frames",
    );
    expect(screen.getByTestId("render.progress_remaining")).toHaveTextContent(
      "12s remaining",
    );
  });

  it("reports an unknown estimate while remaining time is null", () => {
    render(<RenderProgress {...baseProps} remainingSeconds={null} />);
    expect(screen.getByTestId("render.progress_remaining")).toHaveTextContent(
      "estimating…",
    );
  });

  it("cancels the in-flight render", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<RenderProgress {...baseProps} onCancel={onCancel} />);

    await user.click(screen.getByTestId("render.cancel_button"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("RenderResult", () => {
  const baseProps = {
    url: "blob:render-output",
    format: "MP4",
    resolution: "1920 × 1080",
    settingsSummary: "Watermark removed · Vivid",
    sizeBytes: 2_500_000,
    audioIncluded: true,
    canSave: true,
    isSaving: false,
    isSaved: false,
    onSave: vi.fn(),
    onDownload: vi.fn(),
    onReset: vi.fn(),
  };

  it("reports the resolution, format, and preserved audio", () => {
    render(<RenderResult {...baseProps} />);
    expect(screen.getByTestId("render.result_resolution")).toHaveTextContent(
      "1920 × 1080",
    );
    expect(screen.getByTestId("render.result_audio")).toHaveTextContent(
      "Original audio track preserved",
    );
    expect(screen.getByTestId("render.result_preview")).toHaveAttribute(
      "src",
      "blob:render-output",
    );
  });

  it("labels a silent export when audio is absent", () => {
    render(<RenderResult {...baseProps} audioIncluded={false} />);
    expect(screen.getByTestId("render.result_audio")).toHaveTextContent(
      "Silent export",
    );
  });

  it("offers save-to-project for signed-in users", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<RenderResult {...baseProps} onSave={onSave} />);

    await user.click(screen.getByTestId("render.save_button"));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("disables save once the render is already saved", () => {
    render(<RenderResult {...baseProps} isSaved />);
    expect(screen.getByTestId("render.save_button")).toBeDisabled();
    expect(screen.getByTestId("render.save_button")).toHaveTextContent(
      "Saved to project",
    );
  });

  it("shows a sign-in hint instead of save for signed-out visitors", () => {
    render(<RenderResult {...baseProps} canSave={false} />);
    expect(screen.queryByTestId("render.save_button")).not.toBeInTheDocument();
    expect(screen.getByTestId("render.save_signed_out_hint")).toHaveTextContent(
      "Sign in to save renders",
    );
  });

  it("downloads and resets the result", async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn();
    const onReset = vi.fn();
    render(
      <RenderResult {...baseProps} onDownload={onDownload} onReset={onReset} />,
    );

    await user.click(screen.getByTestId("render.download_button"));
    await user.click(screen.getByTestId("render.reset_button"));
    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
