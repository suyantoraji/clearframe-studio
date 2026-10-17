import type { ProjectId, ProjectView } from "@/backend";
import { unwrapResult, useBackendActor } from "@/lib/backend";
import { deleteStoredFile } from "@/lib/storage";
import { type ProjectSummary, toProjectSummary } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const projectKeys = {
  all: ["projects"] as const,
  list: () => [...projectKeys.all, "list"] as const,
  detail: (id: ProjectId) =>
    [...projectKeys.all, "detail", id.toString()] as const,
};

/** List the signed-in user's projects. Disabled while signed out. */
export function useProjects(enabled = true) {
  const { actor, isFetching } = useBackendActor();
  return useQuery<ProjectSummary[]>({
    queryKey: projectKeys.list(),
    queryFn: async () => {
      if (!actor) return [];
      const projects = await actor.listProjects();
      return projects.map(toProjectSummary);
    },
    enabled: enabled && !!actor && !isFetching,
  });
}

/** Fetch one project by id. */
export function useProject(id: ProjectId | null) {
  const { actor, isFetching } = useBackendActor();
  return useQuery<ProjectSummary | null>({
    queryKey: projectKeys.detail(id ?? 0n),
    queryFn: async () => {
      if (!actor || id === null) return null;
      const result = await actor.getProject(id);
      if (result.__kind__ === "err") return null;
      return toProjectSummary(result.ok);
    },
    enabled: !!actor && !isFetching && id !== null,
  });
}

export interface CreateProjectInput {
  name: string;
  sourceFilename: string;
  durationMs: bigint;
  thumbnail: string | null;
  sourceFile: string;
}

/** Create a project owned by the caller. */
export function useCreateProject() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation<ProjectView, Error, CreateProjectInput>({
    mutationFn: async (input) => {
      if (!actor) throw new Error("Backend is not ready");
      const result = await actor.createProject(
        input.name,
        input.sourceFilename,
        input.durationMs,
        input.thumbnail,
        input.sourceFile,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/** Rename one of the caller's projects. */
export function useRenameProject() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation<ProjectView, Error, { id: ProjectId; name: string }>({
    mutationFn: async ({ id, name }) => {
      if (!actor) throw new Error("Backend is not ready");
      const result = await actor.renameProject(id, name);
      return unwrapResult(result);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/**
 * Delete one of the caller's projects and its render records.
 *
 * `deleteProject` returns the file references it removed from the canister's
 * records (the source file, its thumbnail, and every render output). The
 * backend cannot delete blobs from platform object storage itself, so this
 * hook deletes each returned reference through `deleteStoredFile`. A failure to
 * delete a stored file is surfaced as a thrown error rather than swallowed.
 */
export function useDeleteProject() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation<void, Error, ProjectId>({
    mutationFn: async (id) => {
      if (!actor) throw new Error("Backend is not ready");
      const result = await actor.deleteProject(id);
      const deleted = unwrapResult(result);
      const files = deleted?.files ?? [];
      const failures: string[] = [];
      for (const fileRef of files) {
        try {
          await deleteStoredFile(fileRef);
        } catch (error) {
          failures.push(error instanceof Error ? error.message : String(error));
        }
      }
      if (failures.length > 0) {
        throw new Error(
          `The project was deleted, but ${failures.length} stored ${
            failures.length === 1 ? "file" : "files"
          } could not be removed: ${failures.join("; ")}`,
        );
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["renders"] });
    },
  });
}
