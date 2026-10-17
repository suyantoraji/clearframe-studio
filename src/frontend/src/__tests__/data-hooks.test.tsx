import type { Backend, ProjectView, RenderView } from "@/backend";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useRenameProject,
} from "@/hooks/use-projects";
import {
  useDeleteRender,
  useRenders,
  useSaveRender,
} from "@/hooks/use-renders";

// The single backend seam every data hook goes through. Mocking it here keeps
// the tests on the hook contract without a live canister or network.
const actorRef: { current: Backend | null } = { current: null };

vi.mock("@/lib/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/backend")>();
  return {
    ...actual,
    useBackendActor: () => ({ actor: actorRef.current, isFetching: false }),
  };
});

// Deleting a project fans out to platform object storage for each returned
// file reference. Mock the storage seam so the hook's cleanup and failure
// surfacing are exercised without a network.
const deleteStoredFile = vi.fn(async (_fileRef: string) => undefined);

vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return {
    ...actual,
    deleteStoredFile: (fileRef: string) => deleteStoredFile(fileRef),
  };
});

function projectView(overrides: Partial<ProjectView> = {}): ProjectView {
  return {
    id: 1n,
    name: "Beach clip",
    sourceFilename: "beach.mp4",
    sourceFile: "file://beach.mp4",
    durationMs: 12_000n,
    createdAt: 1_700_000_000_000n,
    updatedAt: 1_700_000_000_000n,
    ...overrides,
  };
}

function renderView(overrides: Partial<RenderView> = {}): RenderView {
  return {
    id: 10n,
    projectId: 1n,
    format: "MP4",
    resolution: "1920 × 1080",
    settingsSummary: "Watermark mask (1 shape, per-frame)",
    outputFile: "file://out.mp4",
    createdAt: 1_700_000_100_000n,
    ...overrides,
  };
}

function makeActor(overrides: Partial<Backend> = {}): Backend {
  return {
    listProjects: vi.fn(async () => [projectView()]),
    getProject: vi.fn(async () => ({ __kind__: "ok", ok: projectView() })),
    createProject: vi.fn(async () => ({ __kind__: "ok", ok: projectView() })),
    renameProject: vi.fn(async (_id, name) => ({
      __kind__: "ok",
      ok: projectView({ name }),
    })),
    deleteProject: vi.fn(async () => ({
      __kind__: "ok",
      ok: { files: ["file://source.mp4"] },
    })),
    saveRender: vi.fn(async () => ({ __kind__: "ok", ok: renderView() })),
    listRenders: vi.fn(async () => ({ __kind__: "ok", ok: [renderView()] })),
    deleteRender: vi.fn(async () => ({ __kind__: "ok", ok: null })),
    ...overrides,
  } as unknown as Backend;
}

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function newClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

beforeEach(() => {
  actorRef.current = makeActor();
  deleteStoredFile.mockClear();
  deleteStoredFile.mockImplementation(async () => undefined);
});

describe("project data hooks", () => {
  it("lists the signed-in user's projects", async () => {
    const client = newClient();
    const { result } = renderHook(() => useProjects(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]).toMatchObject({
      id: 1n,
      name: "Beach clip",
      sourceFilename: "beach.mp4",
    });
  });

  it("creates a project and refreshes the list", async () => {
    const client = newClient();
    const actor = actorRef.current as Backend;
    const { result } = renderHook(() => useCreateProject(), {
      wrapper: wrapper(client),
    });

    await result.current.mutateAsync({
      name: "New clip",
      sourceFilename: "new.mp4",
      durationMs: 5_000n,
      thumbnail: null,
      sourceFile: "file://new.mp4",
    });

    expect(actor.createProject).toHaveBeenCalledWith(
      "New clip",
      "new.mp4",
      5_000n,
      null,
      "file://new.mp4",
    );
  });

  it("renames a project through the backend", async () => {
    const client = newClient();
    const actor = actorRef.current as Backend;
    const { result } = renderHook(() => useRenameProject(), {
      wrapper: wrapper(client),
    });

    await result.current.mutateAsync({ id: 1n, name: "Renamed clip" });
    expect(actor.renameProject).toHaveBeenCalledWith(1n, "Renamed clip");
  });

  it("deletes a project through the backend", async () => {
    const client = newClient();
    const actor = actorRef.current as Backend;
    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: wrapper(client),
    });

    await result.current.mutateAsync(1n);
    expect(actor.deleteProject).toHaveBeenCalledWith(1n);
  });

  it("removes every stored file the backend reports for a deleted project", async () => {
    actorRef.current = makeActor({
      deleteProject: vi.fn(async () => ({
        __kind__: "ok",
        ok: {
          files: ["file://source.mp4", "file://thumb.jpg", "file://out.mp4"],
        },
      })),
    } as unknown as Partial<Backend>);
    const client = newClient();
    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: wrapper(client),
    });

    await result.current.mutateAsync(1n);

    expect(deleteStoredFile).toHaveBeenCalledTimes(3);
    expect(deleteStoredFile).toHaveBeenCalledWith("file://source.mp4");
    expect(deleteStoredFile).toHaveBeenCalledWith("file://thumb.jpg");
    expect(deleteStoredFile).toHaveBeenCalledWith("file://out.mp4");
  });

  it("surfaces a stored file that could not be removed", async () => {
    actorRef.current = makeActor({
      deleteProject: vi.fn(async () => ({
        __kind__: "ok",
        ok: { files: ["file://source.mp4"] },
      })),
    } as unknown as Partial<Backend>);
    deleteStoredFile.mockRejectedValueOnce(new Error("Storage refused"));
    const client = newClient();
    const { result } = renderHook(() => useDeleteProject(), {
      wrapper: wrapper(client),
    });

    await expect(result.current.mutateAsync(1n)).rejects.toThrow(
      /could not be removed/,
    );
  });

  it("surfaces a backend error instead of a silent success", async () => {
    actorRef.current = makeActor({
      renameProject: vi.fn(async () => ({
        __kind__: "err",
        err: "notAuthorized",
      })),
    } as unknown as Partial<Backend>);
    const client = newClient();
    const { result } = renderHook(() => useRenameProject(), {
      wrapper: wrapper(client),
    });

    await expect(
      result.current.mutateAsync({ id: 1n, name: "Nope" }),
    ).rejects.toThrow("notAuthorized");
  });
});

describe("render data hooks", () => {
  it("lists a project's renders", async () => {
    const client = newClient();
    const { result } = renderHook(() => useRenders(1n), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]).toMatchObject({
      id: 10n,
      projectId: 1n,
      format: "MP4",
      resolution: "1920 × 1080",
    });
  });

  it("saves a render record for a project", async () => {
    const client = newClient();
    const actor = actorRef.current as Backend;
    const { result } = renderHook(() => useSaveRender(), {
      wrapper: wrapper(client),
    });

    await result.current.mutateAsync({
      projectId: 1n,
      outputFile: "file://out.mp4",
      format: "MP4",
      resolution: "1920 × 1080",
      settingsSummary: "Watermark mask (1 shape, per-frame)",
    });

    expect(actor.saveRender).toHaveBeenCalledWith(
      1n,
      "file://out.mp4",
      "MP4",
      "1920 × 1080",
      "Watermark mask (1 shape, per-frame)",
    );
  });

  it("deletes a render through the backend", async () => {
    const client = newClient();
    const actor = actorRef.current as Backend;
    const { result } = renderHook(() => useDeleteRender(), {
      wrapper: wrapper(client),
    });

    await result.current.mutateAsync(10n);
    expect(actor.deleteRender).toHaveBeenCalledWith(10n);
  });
});
