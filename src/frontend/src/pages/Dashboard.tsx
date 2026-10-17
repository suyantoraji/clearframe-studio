import {
  ProjectGrid,
  ProjectGridSkeleton,
} from "@/components/dashboard/ProjectGrid";
import { UploadDropzone } from "@/components/dashboard/UploadDropzone";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useRenameProject,
} from "@/hooks/use-projects";
import { fileToExternalBlob } from "@/lib/storage";
import type { ProjectId, ProjectSummary } from "@/types";
import {
  loadConfig,
  useInternetIdentity,
} from "@caffeineai/core-infrastructure";
import { StorageClient } from "@caffeineai/object-storage";
import { HttpAgent, type Identity } from "@icp-sdk/core/agent";
import { Link } from "@tanstack/react-router";
import {
  FolderPlus,
  Loader2,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useCallback, useState } from "react";

const CAPABILITIES = [
  {
    icon: Wand2,
    title: "Watermark removal",
    body: "Erase horizontal, vertical, and diagonal overlays with a tracked mask.",
  },
  {
    icon: Sparkles,
    title: "Enhancement",
    body: "Lift brightness, contrast, saturation, and sharpness in one pass.",
  },
  {
    icon: ShieldCheck,
    title: "Background removal",
    body: "Subject matting cuts the subject out to transparent, solid, or blurred.",
  },
] as const;

/** Read a video's duration in milliseconds by probing it in the browser. */
function readVideoDurationMs(file: File): Promise<bigint> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const finish = (ms: number) => {
      URL.revokeObjectURL(url);
      resolve(BigInt(Math.max(0, Math.round(ms))));
    };
    video.onloadedmetadata = () => {
      const seconds = Number.isFinite(video.duration) ? video.duration : 0;
      finish(seconds * 1000);
    };
    video.onerror = () => finish(0);
    video.src = url;
  });
}

/** Strip the extension from a filename to seed a project name. */
function baseName(filename: string): string {
  const withoutExtension = filename.replace(/\.[^./\\]+$/, "");
  return withoutExtension.trim().slice(0, 80) || "Untitled project";
}

/**
 * Capture a representative still from a video file as a JPEG blob.
 *
 * The clip is probed off-screen, seeked a little past the start (so the frame
 * is not a black lead-in), and drawn to a canvas at a thumbnail-sized width.
 * Returns null when the browser cannot decode a frame, in which case the
 * dashboard falls back to its placeholder icon.
 */
function captureThumbnail(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };

    const fail = () => {
      cleanup();
      resolve(null);
    };

    video.onerror = fail;
    video.onloadeddata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const target = duration > 0 ? Math.min(duration * 0.1, 1) : 0;
      const draw = () => {
        try {
          const width = video.videoWidth || 640;
          const height = video.videoHeight || 360;
          const scale = Math.min(1, 640 / width);
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(width * scale));
          canvas.height = Math.max(1, Math.round(height * scale));
          const context = canvas.getContext("2d");
          if (!context) {
            fail();
            return;
          }
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              cleanup();
              if (!blob) {
                resolve(null);
                return;
              }
              resolve(
                new File([blob], "thumbnail.jpg", { type: "image/jpeg" }),
              );
            },
            "image/jpeg",
            0.8,
          );
        } catch {
          fail();
        }
      };
      if (target > 0) {
        video.onseeked = draw;
        video.currentTime = target;
      } else {
        draw();
      }
    };
    video.src = url;
  });
}

/**
 * Upload a source video to platform object storage and return the stored
 * reference. The reference is the gateway direct URL, which is what
 * `fileRefToUrl` resolves back into a displayable URL.
 */
async function uploadSourceVideo(
  file: File,
  identity: Identity | undefined,
  onProgress: (percentage: number) => void,
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
  const blob = await fileToExternalBlob(file, onProgress);
  const bytes = await blob.getBytes();
  const { hash } = await client.putFile(
    bytes,
    onProgress,
    blob.contentType,
    blob.filename,
  );
  return client.getDirectURL(hash);
}

export function DashboardPage() {
  const { isAuthenticated, isInitializing, signIn } = useAuth();
  const { identity } = useInternetIdentity();
  const projectsQuery = useProjects(isAuthenticated);
  const createProject = useCreateProject();
  const renameProject = useRenameProject();
  const deleteProject = useDeleteProject();

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProjectSummary | null>(
    null,
  );

  const handleSelectFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      setUploadingName(file.name);
      setUploadProgress(0);
      try {
        const durationMs = await readVideoDurationMs(file);
        const fileRef = await uploadSourceVideo(file, identity, (percentage) =>
          setUploadProgress(percentage),
        );
        // Generate and store a real thumbnail so the dashboard shows the clip's
        // first representative frame instead of a placeholder icon.
        let thumbnail: string | null = null;
        try {
          const thumbnailFile = await captureThumbnail(file);
          if (thumbnailFile) {
            thumbnail = await uploadSourceVideo(thumbnailFile, identity, () => {
              /* thumbnail upload is small; no separate progress readout */
            });
          }
        } catch {
          thumbnail = null;
        }
        await createProject.mutateAsync({
          name: baseName(file.name),
          sourceFilename: file.name,
          durationMs,
          thumbnail,
          sourceFile: fileRef,
        });
      } catch (error) {
        setUploadError(
          error instanceof Error
            ? error.message
            : "The upload did not finish. Please try again.",
        );
      } finally {
        setUploadProgress(null);
        setUploadingName(null);
      }
    },
    [createProject, identity],
  );

  const handleRename = useCallback(
    (id: ProjectId, name: string) => {
      renameProject.mutate({ id, name });
    },
    [renameProject],
  );

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    setDeleteError(null);
    deleteProject.mutate(pendingDelete.id);
    setPendingDelete(null);
  }, [deleteProject, pendingDelete]);

  const projects = projectsQuery.data ?? [];
  const showGridSkeleton =
    isAuthenticated && (projectsQuery.isLoading || projectsQuery.isPending);
  const showEmptyState =
    isAuthenticated && !showGridSkeleton && projects.length === 0;

  // Surface a failed delete (including a stored file that could not be
  // removed) instead of swallowing it. `deleteError` lets the user dismiss it.
  const deleteErrorMessage =
    deleteError ??
    (deleteProject.isError
      ? deleteProject.error instanceof Error
        ? deleteProject.error.message
        : "The project could not be deleted. Please try again."
      : null);

  return (
    <div
      className="mx-auto max-w-6xl px-4 py-8 sm:px-6"
      data-ocid="dashboard.page"
    >
      <header className="flex flex-col gap-2">
        <p className="text-mono-num text-xs uppercase tracking-wider text-muted-foreground">
          Project desk
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Clean up your footage
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Add a clip, then open its workspace to remove watermarks, enhance the
          image, and cut out the background.
        </p>
      </header>

      <section
        className="mt-6 rounded-lg border border-border bg-card p-4 shadow-subtle sm:p-6"
        data-ocid="dashboard.upload_section"
      >
        <div className="mb-4 flex items-start gap-3 rounded-md border border-accent/30 bg-accent/10 px-3 py-2.5">
          <ShieldCheck
            className="mt-0.5 size-4 shrink-0 text-accent"
            aria-hidden="true"
          />
          <p className="text-sm text-foreground">
            Processing happens on your own device, in this browser. Your footage
            is never uploaded for processing — only the source file you add is
            stored so you can reopen the project.
          </p>
        </div>

        <UploadDropzone
          onSelectFile={handleSelectFile}
          progress={uploadProgress}
          uploadingName={uploadingName}
          error={uploadError}
        />

        {!isAuthenticated ? (
          <div
            className="mt-4 flex flex-col items-start gap-3 rounded-md border border-border bg-secondary/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            data-ocid="dashboard.sign_in_prompt"
          >
            <p className="text-sm text-muted-foreground">
              You can process a video right now in a temporary session. Sign in
              to save projects and keep your render history.
            </p>
            <Button
              type="button"
              onClick={signIn}
              disabled={isInitializing}
              className="shrink-0"
              data-ocid="dashboard.sign_in_button"
            >
              {isInitializing ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Sign in to save
            </Button>
          </div>
        ) : null}
      </section>

      <section className="mt-8" data-ocid="dashboard.projects_section">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Your projects
          </h2>
          {isAuthenticated && projects.length > 0 ? (
            <span className="text-mono-num text-xs text-muted-foreground">
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </span>
          ) : null}
        </div>

        {deleteErrorMessage ? (
          <div
            role="alert"
            className="mb-4 flex items-start justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5"
            data-ocid="dashboard.delete_error"
          >
            <p className="text-sm text-destructive">{deleteErrorMessage}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDeleteError(null);
                deleteProject.reset();
              }}
              data-ocid="dashboard.delete_error_dismiss_button"
            >
              Dismiss
            </Button>
          </div>
        ) : null}

        {!isAuthenticated ? (
          <div
            className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/60 px-6 py-12 text-center"
            data-ocid="dashboard.signed_out_state"
          >
            <span className="flex size-12 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
              <FolderPlus className="size-6" aria-hidden="true" />
            </span>
            <h3 className="font-display text-base font-semibold tracking-tight">
              Sign in to see your projects
            </h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Saved projects and render history live with your account. Sign in
              to pick up where you left off.
            </p>
            <Button
              type="button"
              onClick={signIn}
              disabled={isInitializing}
              data-ocid="dashboard.empty_sign_in_button"
            >
              Sign in
            </Button>
          </div>
        ) : showGridSkeleton ? (
          <ProjectGridSkeleton />
        ) : projectsQuery.isError ? (
          <div
            className="flex flex-col items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-6 py-12 text-center"
            data-ocid="dashboard.error_state"
          >
            <h3 className="font-display text-base font-semibold tracking-tight">
              Could not load your projects
            </h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              {projectsQuery.error instanceof Error
                ? projectsQuery.error.message
                : "Something went wrong. Please try again."}
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void projectsQuery.refetch()}
              data-ocid="dashboard.retry_button"
            >
              Try again
            </Button>
          </div>
        ) : showEmptyState ? (
          <div
            className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/60 px-6 py-12 text-center"
            data-ocid="dashboard.empty_state"
          >
            <span className="flex size-12 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
              <FolderPlus className="size-6" aria-hidden="true" />
            </span>
            <h3 className="font-display text-base font-semibold tracking-tight">
              No projects yet
            </h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add your first video above to start cleaning it up. Each upload
              becomes a project you can reopen any time.
            </p>
          </div>
        ) : (
          <ProjectGrid
            projects={projects}
            onRename={handleRename}
            onDelete={setPendingDelete}
            renamingId={
              renameProject.isPending ? renameProject.variables?.id : null
            }
            deletingId={
              deleteProject.isPending ? deleteProject.variables : null
            }
          />
        )}
      </section>

      <section className="mt-10" data-ocid="dashboard.capabilities_section">
        <h2 className="mb-4 font-display text-lg font-semibold tracking-tight">
          What you can do in the workspace
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {CAPABILITIES.map((capability) => {
            const Icon = capability.icon;
            return (
              <div
                key={capability.title}
                className="rounded-lg border border-border bg-card p-4"
              >
                <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <h3 className="mt-3 font-display text-sm font-semibold tracking-tight">
                  {capability.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {capability.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent data-ocid="dashboard.delete_dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `“${pendingDelete.name}” and its stored source and output files will be removed. This cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              type="button"
              data-ocid="dashboard.delete_cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="dashboard.delete_confirm_button"
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Need a different view?{" "}
        <Link
          to="/renders"
          className="rounded-sm underline-offset-4 transition-smooth hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          data-ocid="dashboard.renders_link"
        >
          Review your render history
        </Link>
        .
      </p>
    </div>
  );
}
