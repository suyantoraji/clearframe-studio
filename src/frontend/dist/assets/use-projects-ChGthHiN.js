import { j as jsxRuntimeExports, a as cn, q as useQueryClient } from "./index-Cu6O4N7x.js";
import { u as useBackendActor, g as useQuery, j as useMutation, k as unwrapResult, l as deleteStoredFile, t as toProjectSummary } from "./index-DjOt3mU2.js";
function Skeleton({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-slot": "skeleton",
      className: cn("bg-accent animate-pulse rounded-md", className),
      ...props
    }
  );
}
const projectKeys = {
  all: ["projects"],
  list: () => [...projectKeys.all, "list"],
  detail: (id) => [...projectKeys.all, "detail", id.toString()]
};
function useProjects(enabled = true) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: async () => {
      if (!actor) return [];
      const projects = await actor.listProjects();
      return projects.map(toProjectSummary);
    },
    enabled: enabled && !!actor && !isFetching
  });
}
function useCreateProject() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      if (!actor) throw new Error("Backend is not ready");
      const result = await actor.createProject(
        input.name,
        input.sourceFilename,
        input.durationMs,
        input.thumbnail,
        input.sourceFile
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    }
  });
}
function useRenameProject() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }) => {
      if (!actor) throw new Error("Backend is not ready");
      const result = await actor.renameProject(id, name);
      return unwrapResult(result);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    }
  });
}
function useDeleteProject() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      if (!actor) throw new Error("Backend is not ready");
      const result = await actor.deleteProject(id);
      const deleted = unwrapResult(result);
      const files = (deleted == null ? void 0 : deleted.files) ?? [];
      const failures = [];
      for (const fileRef of files) {
        try {
          await deleteStoredFile(fileRef);
        } catch (error) {
          failures.push(error instanceof Error ? error.message : String(error));
        }
      }
      if (failures.length > 0) {
        throw new Error(
          `The project was deleted, but ${failures.length} stored ${failures.length === 1 ? "file" : "files"} could not be removed: ${failures.join("; ")}`
        );
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["renders"] });
    }
  });
}
export {
  Skeleton as S,
  useCreateProject as a,
  useRenameProject as b,
  useDeleteProject as c,
  useProjects as u
};
