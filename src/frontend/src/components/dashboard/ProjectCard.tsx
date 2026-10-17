import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDuration, formatRelativeTime } from "@/lib/format";
import { fileRefToUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { ProjectSummary } from "@/types";
import { Link } from "@tanstack/react-router";
import { Check, Clock, Film, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface ProjectCardProps {
  project: ProjectSummary;
  /** 1-based position, used for stable deterministic markers. */
  index: number;
  onRename: (id: ProjectSummary["id"], name: string) => void;
  onDelete: (project: ProjectSummary) => void;
  isRenaming?: boolean;
  isDeleting?: boolean;
}

/**
 * A single project tile: thumbnail, name, source filename, duration, and
 * last-edited time. The whole tile links to the workspace; rename and delete
 * are inline actions that stop propagation so they never trigger navigation.
 */
export function ProjectCard({
  project,
  index,
  onRename,
  onDelete,
  isRenaming = false,
  isDeleting = false,
}: ProjectCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(project.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const beginEdit = () => {
    setDraft(project.name);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraft(project.name);
  };

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0 || trimmed === project.name) {
      cancelEdit();
      return;
    }
    onRename(project.id, trimmed);
    setIsEditing(false);
  };

  const thumbnailUrl = project.thumbnail
    ? fileRefToUrl(project.thumbnail)
    : null;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-subtle transition-smooth hover:border-primary/50",
        isDeleting && "opacity-60",
      )}
      data-ocid={`dashboard.project_card.${index}`}
    >
      <Link
        to="/workspace/$projectId"
        params={{ projectId: project.id.toString() }}
        className="flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-ocid={`dashboard.project_open_link.${index}`}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-checkerboard">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={`Thumbnail for ${project.name}`}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <Film className="size-8" aria-hidden="true" />
            </div>
          )}
          <span className="absolute bottom-2 right-2 rounded bg-background/85 px-1.5 py-0.5 text-mono-num text-[11px] text-foreground backdrop-blur">
            {formatDuration(project.durationMs)}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          {isEditing ? (
            <Input
              ref={inputRef}
              value={draft}
              maxLength={80}
              onChange={(event) => setDraft(event.target.value)}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitEdit();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  cancelEdit();
                }
              }}
              aria-label="Project name"
              className="h-8"
              data-ocid={`dashboard.rename_input.${index}`}
            />
          ) : (
            <h3 className="truncate font-display text-sm font-semibold tracking-tight">
              {project.name}
            </h3>
          )}
          <p className="truncate font-mono text-xs text-muted-foreground">
            {project.sourceFilename}
          </p>
          <p className="mt-auto flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
            <Clock className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              Edited {formatRelativeTime(project.updatedAt)}
            </span>
          </p>
        </div>
      </Link>

      <div className="flex items-center justify-end gap-1 border-t border-border px-2 py-1.5">
        {isEditing ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={commitEdit}
              disabled={isRenaming}
              aria-label="Save project name"
              data-ocid={`dashboard.rename_save_button.${index}`}
            >
              <Check className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancelEdit}
              aria-label="Cancel rename"
              data-ocid={`dashboard.rename_cancel_button.${index}`}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={beginEdit}
              aria-label={`Rename ${project.name}`}
              data-ocid={`dashboard.rename_button.${index}`}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onDelete(project)}
              disabled={isDeleting}
              aria-label={`Delete ${project.name}`}
              className="text-muted-foreground hover:text-destructive"
              data-ocid={`dashboard.delete_button.${index}`}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
