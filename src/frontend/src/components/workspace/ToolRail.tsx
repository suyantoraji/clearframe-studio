import type { MaskTool } from "@/lib/processing/mask";
import { cn } from "@/lib/utils";
import { Brush, Eraser, Redo2, ScanSearch, Square, Undo2 } from "lucide-react";

interface ToolRailProps {
  activeTool: MaskTool;
  onToolChange: (tool: MaskTool) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAutoDetect: () => void;
  autoDetectBusy: boolean;
  shapeCount: number;
  onClearMask: () => void;
}

const TOOLS: { id: MaskTool; label: string; icon: typeof Square }[] = [
  { id: "rectangle", label: "Rectangle", icon: Square },
  { id: "brush", label: "Brush", icon: Brush },
  { id: "eraser", label: "Eraser", icon: Eraser },
];

/**
 * Masking tool rail.
 *
 * The left rail owns mask authoring: the rectangle and freehand brush tools,
 * the eraser, undo/redo, and the auto-detect assist. Mask geometry is entirely
 * user-defined, so a horizontal, vertical, or diagonal watermark is covered by
 * simply drawing over it.
 */
export function ToolRail({
  activeTool,
  onToolChange,
  brushSize,
  onBrushSizeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAutoDetect,
  autoDetectBusy,
  shapeCount,
  onClearMask,
}: ToolRailProps) {
  return (
    <aside
      className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-card py-3"
      aria-label="Masking tools"
      data-ocid="workspace.tool_rail"
    >
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const active = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => onToolChange(tool.id)}
            aria-pressed={active}
            aria-label={tool.label}
            title={tool.label}
            data-ocid={`workspace.tool_${tool.id}_button`}
            className={cn(
              "flex size-10 items-center justify-center rounded-md outline-none transition-smooth focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-primary text-primary-foreground shadow-subtle"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="size-4.5" aria-hidden="true" />
          </button>
        );
      })}

      <div className="my-1 h-px w-8 bg-border" />

      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo"
        title="Undo"
        data-ocid="workspace.undo_button"
        className="flex size-10 items-center justify-center rounded-md text-muted-foreground outline-none transition-smooth hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Undo2 className="size-4.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo"
        title="Redo"
        data-ocid="workspace.redo_button"
        className="flex size-10 items-center justify-center rounded-md text-muted-foreground outline-none transition-smooth hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Redo2 className="size-4.5" aria-hidden="true" />
      </button>

      <div className="my-1 h-px w-8 bg-border" />

      <button
        type="button"
        onClick={onAutoDetect}
        disabled={autoDetectBusy}
        aria-label="Auto-detect watermark"
        title="Auto-detect watermark"
        data-ocid="workspace.auto_detect_button"
        className="flex size-10 items-center justify-center rounded-md text-accent outline-none transition-smooth hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ScanSearch
          className={cn("size-4.5", autoDetectBusy && "animate-pulse")}
          aria-hidden="true"
        />
      </button>

      <div className="mt-auto flex flex-col items-center gap-2 pb-1">
        <label className="flex flex-col items-center gap-1" title="Brush size">
          <span className="sr-only">Brush size</span>
          <input
            type="range"
            min={2}
            max={40}
            step={1}
            value={brushSize}
            onChange={(event) => onBrushSizeChange(Number(event.target.value))}
            data-ocid="workspace.brush_size_input"
            className="h-24 w-1.5 cursor-pointer appearance-none rounded-full bg-secondary accent-primary [writing-mode:vertical-lr] [direction:rtl]"
          />
          <span className="text-mono-num text-[10px] text-muted-foreground">
            {brushSize}
          </span>
        </label>
        <button
          type="button"
          onClick={onClearMask}
          disabled={shapeCount === 0}
          aria-label="Clear mask"
          title="Clear mask"
          data-ocid="workspace.clear_mask_button"
          className="rounded px-1 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground outline-none transition-smooth hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </aside>
  );
}
