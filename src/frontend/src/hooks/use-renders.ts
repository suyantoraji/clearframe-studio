import type { ProjectId, RenderId } from "@/backend";
import { unwrapResult, useBackendActor } from "@/lib/backend";
import { type RenderRecord, toRenderRecord } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const renderKeys = {
  all: ["renders"] as const,
  forProject: (projectId: ProjectId) =>
    [...renderKeys.all, "project", projectId.toString()] as const,
};

/** List the renders of one of the caller's projects. */
export function useRenders(projectId: ProjectId | null, enabled = true) {
  const { actor, isFetching } = useBackendActor();
  return useQuery<RenderRecord[]>({
    queryKey: renderKeys.forProject(projectId ?? 0n),
    queryFn: async () => {
      if (!actor || projectId === null) return [];
      const result = await actor.listRenders(projectId);
      if (result.__kind__ === "err") {
        // Surface the failure instead of silently presenting "no renders".
        throw new Error(
          result.err === "notAuthorized"
            ? "You do not have access to this project's renders."
            : "Could not load this project's renders.",
        );
      }
      return result.ok.map(toRenderRecord);
    },
    enabled: enabled && !!actor && !isFetching && projectId !== null,
  });
}

export interface SaveRenderInput {
  projectId: ProjectId;
  outputFile: string;
  format: string;
  resolution: string;
  settingsSummary: string;
}

/** Save a render record for one of the caller's projects. */
export function useSaveRender() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation<RenderRecord, Error, SaveRenderInput>({
    mutationFn: async (input) => {
      if (!actor) throw new Error("Backend is not ready");
      const result = await actor.saveRender(
        input.projectId,
        input.outputFile,
        input.format,
        input.resolution,
        input.settingsSummary,
      );
      return toRenderRecord(unwrapResult(result));
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: renderKeys.all });
      void queryClient.invalidateQueries({
        queryKey: renderKeys.forProject(variables.projectId),
      });
    },
  });
}

/** Delete one of the caller's renders. */
export function useDeleteRender() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation<void, Error, RenderId>({
    mutationFn: async (id) => {
      if (!actor) throw new Error("Backend is not ready");
      const result = await actor.deleteRender(id);
      unwrapResult(result);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: renderKeys.all });
    },
  });
}
