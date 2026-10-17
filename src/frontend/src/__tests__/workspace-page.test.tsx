import type { Backend, ProjectView } from "@/backend";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The workspace reads auth, the backend actor, and resolves the stored source
// file into a playable URL. Mock each module seam so the page's own states and
// the preview/control wiring are exercised without a canister or a network.
const authState = { isAuthenticated: true };
const actorRef: { current: Backend | null } = { current: null };

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ ...authState, signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("@/lib/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/backend")>();
  return {
    ...actual,
    useBackendActor: () => ({ actor: actorRef.current, isFetching: false }),
  };
});

vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return {
    ...actual,
    fileRefToUrl: (fileRef: string) => `blob:${fileRef}`,
  };
});

// The render panel reads the identity provider and object storage. Mock the
// platform module so the workspace renders without an Internet Identity
// provider or a network.
vi.mock("@caffeineai/core-infrastructure", () => ({
  useInternetIdentity: () => ({ identity: undefined }),
  loadConfig: vi.fn(),
}));

import { WorkspacePage } from "@/pages/Workspace";

function projectView(overrides: Partial<ProjectView> = {}): ProjectView {
  return {
    id: 7n,
    name: "Beach clip",
    sourceFilename: "beach.mp4",
    sourceFile: "file://beach.mp4",
    durationMs: 12_000n,
    thumbnail: undefined,
    createdAt: 1_700_000_000_000n,
    updatedAt: 1_700_000_000_000n,
    ...overrides,
  };
}

function makeActor(overrides: Partial<Backend> = {}): Backend {
  return {
    getProject: vi.fn(async () => ({ __kind__: "ok", ok: projectView() })),
    ...overrides,
  } as unknown as Backend;
}

/**
 * Render the workspace at a real `/workspace/$projectId` route so `useParams`
 * resolves the id the page parses. The router resolves asynchronously, so this
 * awaits `router.load()` before rendering.
 */
async function renderWorkspace(projectId: string) {
  const rootRoute = createRootRoute();
  const workspaceRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/workspace/$projectId",
    component: WorkspacePage,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([workspaceRoute]),
    history: createMemoryHistory({
      initialEntries: [`/workspace/${projectId}`],
    }),
  });
  await router.load();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}

beforeEach(() => {
  authState.isAuthenticated = true;
  actorRef.current = makeActor();
  // jsdom has no canvas backend, so `getContext` throws a "Not implemented"
  // error on every paint. The overlay and stage both guard on a null context,
  // so returning null keeps the components on their real code paths without the
  // noise.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

describe("WorkspacePage", () => {
  it("loads a project and shows the preview stage and control panel", async () => {
    await renderWorkspace("7");

    await waitFor(() =>
      expect(screen.getByTestId("workspace.preview_stage")).toBeInTheDocument(),
    );
    // The project's name and source filename head the workspace.
    expect(screen.getByText("Beach clip")).toBeInTheDocument();
    expect(screen.getByText("beach.mp4")).toBeInTheDocument();
    // The video element is wired to the resolved source URL.
    expect(screen.getByTestId("workspace.video")).toHaveAttribute(
      "src",
      "blob:file://beach.mp4",
    );
    // The masking rail and the render control surface are both present.
    expect(screen.getByTestId("workspace.mask_canvas")).toBeInTheDocument();
    expect(screen.getByTestId("render.panel")).toBeInTheDocument();
  });

  it("states plainly that footage is processed on the device", async () => {
    await renderWorkspace("7");

    await waitFor(() =>
      expect(
        screen.getByTestId("workspace.on_device_badge"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByTestId("workspace.on_device_badge")).toHaveTextContent(
      /never uploaded/i,
    );
  });

  it("shows a not-found state when the project does not exist", async () => {
    actorRef.current = makeActor({
      getProject: vi.fn(async () => ({ __kind__: "err", err: "notFound" })),
    } as unknown as Partial<Backend>);

    await renderWorkspace("7");

    await waitFor(() =>
      expect(
        screen.getByTestId("workspace.not_found_state"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByTestId("workspace.preview_stage"),
    ).not.toBeInTheDocument();
  });

  it("shows a not-found state for a malformed project id", async () => {
    await renderWorkspace("not-a-number");

    await waitFor(() =>
      expect(
        screen.getByTestId("workspace.not_found_state"),
      ).toBeInTheDocument(),
    );
  });

  it("shows a temporary-session notice for signed-out visitors", async () => {
    authState.isAuthenticated = false;

    await renderWorkspace("7");

    await waitFor(() =>
      expect(
        screen.getByTestId("workspace.session_notice"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByTestId("workspace.session_notice")).toHaveTextContent(
      /sign in to save/i,
    );
  });
});
