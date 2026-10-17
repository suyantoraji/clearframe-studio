import { c as createLucideIcon, q as useQueryClient } from "./index-Cu6O4N7x.js";
import { u as useBackendActor, j as useMutation, m as toRenderRecord, k as unwrapResult, g as useQuery } from "./index-DjOt3mU2.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M12 15V3", key: "m9g1x1" }],
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["path", { d: "m7 10 5 5 5-5", key: "brsn70" }]
];
const Download = createLucideIcon("download", __iconNode);
const renderKeys = {
  all: ["renders"],
  forProject: (projectId) => [...renderKeys.all, "project", projectId.toString()]
};
function useRenders(projectId, enabled = true) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: renderKeys.forProject(projectId ?? 0n),
    queryFn: async () => {
      if (!actor || projectId === null) return [];
      const result = await actor.listRenders(projectId);
      if (result.__kind__ === "err") {
        throw new Error(
          result.err === "notAuthorized" ? "You do not have access to this project's renders." : "Could not load this project's renders."
        );
      }
      return result.ok.map(toRenderRecord);
    },
    enabled: enabled && !!actor && !isFetching && projectId !== null
  });
}
function useSaveRender() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      if (!actor) throw new Error("Backend is not ready");
      const result = await actor.saveRender(
        input.projectId,
        input.outputFile,
        input.format,
        input.resolution,
        input.settingsSummary
      );
      return toRenderRecord(unwrapResult(result));
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: renderKeys.all });
      void queryClient.invalidateQueries({
        queryKey: renderKeys.forProject(variables.projectId)
      });
    }
  });
}
export {
  Download as D,
  useRenders as a,
  useSaveRender as u
};
