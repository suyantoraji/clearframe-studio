import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { type RenderResult, render } from "@testing-library/react";
import { act } from "react";
import type { ReactElement } from "react";

/**
 * Render a component inside a minimal TanStack Router so components that use
 * `<Link>` (project cards, navigation) resolve their route context. The router
 * has a single catch-all route that renders the supplied element, so links
 * render as real anchors without needing the app's full route tree.
 *
 * The router resolves asynchronously, so this awaits `router.load()` before
 * rendering; callers must `await renderWithRouter(...)`.
 */
export async function renderWithRouter(
  ui: ReactElement,
): Promise<RenderResult> {
  const rootRoute = createRootRoute({
    component: () => ui,
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => ui,
  });
  const workspaceRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/workspace/$projectId",
    component: () => ui,
  });
  const rendersRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/renders",
    component: () => ui,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      indexRoute,
      workspaceRoute,
      rendersRoute,
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  const result = render(<RouterProvider router={router} />);
  // Flush the router's post-render transitions so they do not surface as
  // "not wrapped in act(...)" warnings during assertions.
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}
