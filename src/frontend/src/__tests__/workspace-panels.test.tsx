import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BackgroundPanel } from "@/components/workspace/BackgroundPanel";
import { CompareToggle } from "@/components/workspace/CompareToggle";
import { EnhancePanel } from "@/components/workspace/EnhancePanel";
import { ToolRail } from "@/components/workspace/ToolRail";
import { DEFAULT_ENHANCE } from "@/lib/processing/enhance";
import { DEFAULT_MATTING } from "@/lib/processing/matting";

describe("EnhancePanel", () => {
  it("applies a preset to every slider at once", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EnhancePanel
        settings={DEFAULT_ENHANCE}
        onChange={onChange}
        upscale={1}
        onUpscaleChange={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("workspace.preset_vivid_button"));
    expect(onChange).toHaveBeenCalledTimes(1);
    const applied = onChange.mock.calls[0][0];
    expect(applied.saturation).toBeGreaterThan(0);
    expect(applied.contrast).toBeGreaterThan(0);
  });

  it("resets every control to the original", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EnhancePanel
        settings={{ ...DEFAULT_ENHANCE, brightness: 0.5, denoise: 0.4 }}
        onChange={onChange}
        upscale={1}
        onUpscaleChange={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("workspace.enhance_reset_button"));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_ENHANCE);
  });

  it("disables reset when nothing is modified", () => {
    render(
      <EnhancePanel
        settings={DEFAULT_ENHANCE}
        onChange={vi.fn()}
        upscale={1}
        onUpscaleChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("workspace.enhance_reset_button")).toBeDisabled();
  });

  it("reports the chosen upscale factor", async () => {
    const user = userEvent.setup();
    const onUpscaleChange = vi.fn();
    render(
      <EnhancePanel
        settings={DEFAULT_ENHANCE}
        onChange={vi.fn()}
        upscale={1}
        onUpscaleChange={onUpscaleChange}
      />,
    );

    await user.click(screen.getByTestId("workspace.upscale_2x_button"));
    expect(onUpscaleChange).toHaveBeenCalledWith(2);
  });
});

describe("BackgroundPanel", () => {
  it("toggles subject matting", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BackgroundPanel settings={DEFAULT_MATTING} onChange={onChange} />);

    await user.click(screen.getByTestId("workspace.matting_switch"));
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_MATTING,
      enabled: true,
    });
  });

  it("selects a replacement mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BackgroundPanel
        settings={{ ...DEFAULT_MATTING, enabled: true }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByTestId("workspace.background_color_radio"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "color" }),
    );
  });

  it("disables the replacement controls while matting is off", () => {
    render(<BackgroundPanel settings={DEFAULT_MATTING} onChange={vi.fn()} />);
    expect(
      screen.getByTestId("workspace.background_transparent_radio"),
    ).toBeDisabled();
  });
});

describe("ToolRail", () => {
  const baseProps = {
    activeTool: "rectangle" as const,
    onToolChange: vi.fn(),
    brushSize: 14,
    onBrushSizeChange: vi.fn(),
    canUndo: false,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onAutoDetect: vi.fn(),
    autoDetectBusy: false,
    shapeCount: 0,
    onClearMask: vi.fn(),
  };

  it("switches the active masking tool", async () => {
    const user = userEvent.setup();
    const onToolChange = vi.fn();
    render(<ToolRail {...baseProps} onToolChange={onToolChange} />);

    await user.click(screen.getByTestId("workspace.tool_brush_button"));
    expect(onToolChange).toHaveBeenCalledWith("brush");
  });

  it("disables undo and redo when there is no history", () => {
    render(<ToolRail {...baseProps} />);
    expect(screen.getByTestId("workspace.undo_button")).toBeDisabled();
    expect(screen.getByTestId("workspace.redo_button")).toBeDisabled();
  });

  it("enables undo once a shape exists", () => {
    render(<ToolRail {...baseProps} canUndo shapeCount={1} />);
    expect(screen.getByTestId("workspace.undo_button")).toBeEnabled();
  });

  it("triggers auto-detect", async () => {
    const user = userEvent.setup();
    const onAutoDetect = vi.fn();
    render(<ToolRail {...baseProps} onAutoDetect={onAutoDetect} />);

    await user.click(screen.getByTestId("workspace.auto_detect_button"));
    expect(onAutoDetect).toHaveBeenCalledTimes(1);
  });
});

describe("CompareToggle", () => {
  it("disables the after state until a result exists", () => {
    render(
      <CompareToggle
        showingResult={false}
        onToggle={vi.fn()}
        hasResult={false}
      />,
    );
    expect(screen.getByTestId("workspace.compare_after_button")).toBeDisabled();
  });

  it("switches to the processed result", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <CompareToggle showingResult={false} onToggle={onToggle} hasResult />,
    );

    await user.click(screen.getByTestId("workspace.compare_after_button"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
