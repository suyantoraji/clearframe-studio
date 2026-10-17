import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { ArrowLeft, Film, Loader2 } from "lucide-react";
import { Suspense, lazy } from "react";

const DashboardPage = lazy(() =>
  import("@/pages/Dashboard").then((module) => ({
    default: module.DashboardPage,
  })),
);
const WorkspacePage = lazy(() =>
  import("@/pages/Workspace").then((module) => ({
    default: module.WorkspacePage,
  })),
);
const RendersPage = lazy(() =>
  import("@/pages/Renders").then((module) => ({ default: module.RendersPage })),
);

function RouteFallback() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      data-ocid="page.loading_state"
    >
      <Loader2
        className="size-6 animate-spin text-muted-foreground"
        aria-hidden="true"
      />
      <span className="sr-only">Loading</span>
    </div>
  );
}

function RootComponent() {
  return (
    <Layout>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </Layout>
  );
}

function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
        <Film className="size-6" aria-hidden="true" />
      </span>
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Signal lost
      </h1>
      <p className="text-sm text-muted-foreground">
        That route does not exist. Head back to the project desk to keep
        working.
      </p>
      <Button asChild type="button" data-ocid="not_found.back_button">
        <Link to="/">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to projects
        </Link>
      </Button>
    </div>
  );
}

const rootRoute = createRootRoute({ component: RootComponent });

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const rendersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/renders",
  component: RendersPage,
});

const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspace/$projectId",
  component: WorkspacePage,
});

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "$",
  component: NotFoundPage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  rendersRoute,
  workspaceRoute,
  notFoundRoute,
]);

export const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
