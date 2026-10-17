import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useProjects } from "@/hooks/use-projects";
import { useRenders } from "@/hooks/use-renders";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { downloadFileRef } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { ProjectSummary, RenderRecord } from "@/types";
import { Link } from "@tanstack/react-router";
import {
  Clapperboard,
  Download,
  Film,
  History,
  Loader2,
  LogIn,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface RenderRow {
  render: RenderRecord;
  projectName: string;
}

function RenderHistoryRow({
  row,
  index,
}: {
  row: RenderRow;
  index: number;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { render, projectName } = row;

  const handleDownload = async () => {
    setError(null);
    setIsDownloading(true);
    try {
      const base = projectName.replace(/\s+/g, "-").toLowerCase() || "render";
      await downloadFileRef(
        render.outputFile,
        `${base}-${render.id.toString()}.${render.format.toLowerCase()}`,
      );
    } catch {
      setError("Download failed. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <li
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-subtle transition-smooth hover:border-primary/40 sm:flex-row sm:items-center"
      data-ocid={`renders.item.${index}`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-canvas text-muted-foreground">
        <Film className="size-5" aria-hidden="true" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate font-display text-sm font-semibold tracking-tight">
            {projectName}
          </h3>
          <span className="shrink-0 rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-mono-num text-[11px] uppercase tracking-wider text-accent">
            {render.format}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {render.settingsSummary}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-mono-num text-xs text-muted-foreground">
          <span data-ocid={`renders.resolution.${index}`}>
            {render.resolution}
          </span>
          <span className="text-border">·</span>
          <span title={formatDateTime(render.createdAt)}>
            {formatRelativeTime(render.createdAt)}
          </span>
        </p>
        {error ? (
          <p
            className="text-xs text-destructive"
            data-ocid={`renders.error.${index}`}
          >
            {error}
          </p>
        ) : null}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleDownload}
        disabled={isDownloading}
        className="shrink-0"
        data-ocid={`renders.download_button.${index}`}
      >
        {isDownloading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
        {isDownloading ? "Preparing…" : "Download"}
      </Button>
    </li>
  );
}

function RendersSkeleton() {
  const ids = Array.from({ length: 4 }, (_, i) => `renders-skeleton-${i}`);
  return (
    <ul className="flex flex-col gap-3" data-ocid="renders.loading_state">
      {ids.map((id) => (
        <li
          key={id}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
        >
          <Skeleton className="size-10 shrink-0 rounded-md" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Render history: every render the signed-in user has produced, newest first,
 * with the project it belongs to, its format, resolution, created time, and a
 * download action. Signed-out visitors are invited to sign in.
 */
export function RendersPage() {
  const { isAuthenticated, isInitializing, isLoggingIn, signIn } = useAuth();
  const projectsQuery = useProjects(isAuthenticated);

  const projects = projectsQuery.data ?? [];

  return (
    <div
      className="mx-auto max-w-5xl px-4 py-8 sm:px-6"
      data-ocid="renders.page"
    >
      <header className="mb-6 flex flex-col gap-1">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          <History className="size-3.5" aria-hidden="true" />
          Render history
        </span>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Completed renders
        </h1>
        <p className="text-sm text-muted-foreground">
          Every export you have produced, newest first. Download any render to
          keep a local copy.
        </p>
      </header>

      {isInitializing ? (
        <RendersSkeleton />
      ) : !isAuthenticated ? (
        <div
          className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center"
          data-ocid="renders.signed_out_state"
        >
          <span className="flex size-12 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
            <Clapperboard className="size-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Sign in to keep your render history
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              You can still process a video in a temporary session, but renders
              are only saved to your account once you sign in.
            </p>
          </div>
          <Button
            type="button"
            onClick={signIn}
            disabled={isLoggingIn}
            data-ocid="renders.sign_in_button"
          >
            {isLoggingIn ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogIn className="size-4" aria-hidden="true" />
            )}
            {isLoggingIn ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      ) : projectsQuery.isLoading ? (
        <RendersSkeleton />
      ) : projects.length === 0 ? (
        <div
          className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center"
          data-ocid="renders.empty_state"
        >
          <span className="flex size-12 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
            <Film className="size-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              No renders yet
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Open a project, arm your cleanup tools, and render a video to see
              it listed here.
            </p>
          </div>
          <Button
            asChild
            type="button"
            data-ocid="renders.go_to_projects_button"
          >
            <Link to="/">
              <Clapperboard className="size-4" aria-hidden="true" />
              Go to projects
            </Link>
          </Button>
        </div>
      ) : (
        <ProjectRenderLists projects={projects} />
      )}
    </div>
  );
}

/**
 * Renders one list per project. Each project's renders are fetched through the
 * shared `useRenders` hook inside a dedicated child component, so the hook is
 * always called at the top level of a component rather than in a loop. The
 * per-project lists are merged into a single newest-first feed.
 */
function ProjectRenderLists({ projects }: { projects: ProjectSummary[] }) {
  const [rows, setRows] = useState<RenderRow[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);

  const handleLoaded = useCallback(
    (project: ProjectSummary, renders: RenderRecord[]) => {
      setRows((current) => {
        const withoutProject = current.filter(
          (row) => row.render.projectId !== project.id,
        );
        const next = [
          ...withoutProject,
          ...renders.map((render) => ({ render, projectName: project.name })),
        ];
        return next.sort((a, b) =>
          Number(b.render.createdAt - a.render.createdAt),
        );
      });
      setLoadedCount((count) => count + 1);
    },
    [],
  );

  const isLoading = loadedCount < projects.length;

  return (
    <>
      {/* The loaders must stay mounted in every branch: they are what calls
          `onLoaded` to increment `loadedCount`. Rendering them only in the
          loaded branch would deadlock the skeleton forever. */}
      <div className="hidden" aria-hidden="true">
        {projects.map((project) => (
          <ProjectRendersLoader
            key={project.id.toString()}
            project={project}
            onLoaded={handleLoaded}
          />
        ))}
      </div>

      {isLoading ? (
        <RendersSkeleton />
      ) : rows.length === 0 ? (
        <div
          className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center"
          data-ocid="renders.empty_state"
        >
          <span className="flex size-12 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
            <Film className="size-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              No renders yet
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Open a project, arm your cleanup tools, and render a video to see
              it listed here.
            </p>
          </div>
          <Button
            asChild
            type="button"
            data-ocid="renders.go_to_projects_button"
          >
            <Link to="/">
              <Clapperboard className="size-4" aria-hidden="true" />
              Go to projects
            </Link>
          </Button>
        </div>
      ) : (
        <ul className={cn("flex flex-col gap-3")} data-ocid="renders.list">
          {rows.map((row, index) => (
            <RenderHistoryRow
              key={row.render.id.toString()}
              row={row}
              index={index + 1}
            />
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Headless loader: fetches one project's renders and reports them upward. Kept
 * as its own component so `useRenders` is called at a component top level.
 */
function ProjectRendersLoader({
  project,
  onLoaded,
}: {
  project: ProjectSummary;
  onLoaded: (project: ProjectSummary, renders: RenderRecord[]) => void;
}) {
  const query = useRenders(project.id);
  const data = query.data;

  useEffect(() => {
    if (data) onLoaded(project, data);
  }, [data, project, onLoaded]);

  return null;
}
