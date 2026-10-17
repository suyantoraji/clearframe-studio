import { f as useAuth, j as jsxRuntimeExports, o as History, C as Clapperboard, B as Button, b as LoaderCircle, p as LogIn, F as Film, L as Link, r as reactExports, a as cn } from "./index-Cu6O4N7x.js";
import { u as useProjects, S as Skeleton } from "./use-projects-ChGthHiN.js";
import { a as useRenders, D as Download } from "./use-renders-BvkoLVn2.js";
import { b as formatRelativeTime, h as formatDateTime, i as downloadFileRef } from "./index-DjOt3mU2.js";
function RenderHistoryRow({
  row,
  index
}) {
  const [isDownloading, setIsDownloading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const { render, projectName } = row;
  const handleDownload = async () => {
    setError(null);
    setIsDownloading(true);
    try {
      const base = projectName.replace(/\s+/g, "-").toLowerCase() || "render";
      await downloadFileRef(
        render.outputFile,
        `${base}-${render.id.toString()}.${render.format.toLowerCase()}`
      );
    } catch {
      setError("Download failed. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "li",
    {
      className: "flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-subtle transition-smooth hover:border-primary/40 sm:flex-row sm:items-center",
      "data-ocid": `renders.item.${index}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-canvas text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Film, { className: "size-5", "aria-hidden": "true" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 flex-1 flex-col gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "truncate font-display text-sm font-semibold tracking-tight", children: projectName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-mono-num text-[11px] uppercase tracking-wider text-accent", children: render.format })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-xs text-muted-foreground", children: render.settingsSummary }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex flex-wrap items-center gap-x-2 gap-y-0.5 text-mono-num text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-ocid": `renders.resolution.${index}`, children: render.resolution }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-border", children: "·" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { title: formatDateTime(render.createdAt), children: formatRelativeTime(render.createdAt) })
          ] }),
          error ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              className: "text-xs text-destructive",
              "data-ocid": `renders.error.${index}`,
              children: error
            }
          ) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            type: "button",
            variant: "secondary",
            size: "sm",
            onClick: handleDownload,
            disabled: isDownloading,
            className: "shrink-0",
            "data-ocid": `renders.download_button.${index}`,
            children: [
              isDownloading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin", "aria-hidden": "true" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-4", "aria-hidden": "true" }),
              isDownloading ? "Preparing…" : "Download"
            ]
          }
        )
      ]
    }
  );
}
function RendersSkeleton() {
  const ids = Array.from({ length: 4 }, (_, i) => `renders-skeleton-${i}`);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "flex flex-col gap-3", "data-ocid": "renders.loading_state", children: ids.map((id) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "li",
    {
      className: "flex items-center gap-3 rounded-lg border border-border bg-card p-4",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "size-10 shrink-0 rounded-md" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 flex-col gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-40" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-3 w-64" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-8 w-24 rounded-md" })
      ]
    },
    id
  )) });
}
function RendersPage() {
  const { isAuthenticated, isInitializing, isLoggingIn, signIn } = useAuth();
  const projectsQuery = useProjects(isAuthenticated);
  const projects = projectsQuery.data ?? [];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "mx-auto max-w-5xl px-4 py-8 sm:px-6",
      "data-ocid": "renders.page",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "mb-6 flex flex-col gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "size-3.5", "aria-hidden": "true" }),
            "Render history"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-display text-2xl font-semibold tracking-tight", children: "Completed renders" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Every export you have produced, newest first. Download any render to keep a local copy." })
        ] }),
        isInitializing ? /* @__PURE__ */ jsxRuntimeExports.jsx(RendersSkeleton, {}) : !isAuthenticated ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center",
            "data-ocid": "renders.signed_out_state",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-12 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Clapperboard, { className: "size-6", "aria-hidden": "true" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-display text-lg font-semibold tracking-tight", children: "Sign in to keep your render history" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-sm text-sm text-muted-foreground", children: "You can still process a video in a temporary session, but renders are only saved to your account once you sign in." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  type: "button",
                  onClick: signIn,
                  disabled: isLoggingIn,
                  "data-ocid": "renders.sign_in_button",
                  children: [
                    isLoggingIn ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "size-4 animate-spin", "aria-hidden": "true" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(LogIn, { className: "size-4", "aria-hidden": "true" }),
                    isLoggingIn ? "Signing in…" : "Sign in"
                  ]
                }
              )
            ]
          }
        ) : projectsQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(RendersSkeleton, {}) : projects.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center",
            "data-ocid": "renders.empty_state",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-12 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Film, { className: "size-6", "aria-hidden": "true" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-display text-lg font-semibold tracking-tight", children: "No renders yet" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-sm text-sm text-muted-foreground", children: "Open a project, arm your cleanup tools, and render a video to see it listed here." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  asChild: true,
                  type: "button",
                  "data-ocid": "renders.go_to_projects_button",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Clapperboard, { className: "size-4", "aria-hidden": "true" }),
                    "Go to projects"
                  ] })
                }
              )
            ]
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx(ProjectRenderLists, { projects })
      ]
    }
  );
}
function ProjectRenderLists({ projects }) {
  const [rows, setRows] = reactExports.useState([]);
  const [loadedCount, setLoadedCount] = reactExports.useState(0);
  const handleLoaded = reactExports.useCallback(
    (project, renders) => {
      setRows((current) => {
        const withoutProject = current.filter(
          (row) => row.render.projectId !== project.id
        );
        const next = [
          ...withoutProject,
          ...renders.map((render) => ({ render, projectName: project.name }))
        ];
        return next.sort(
          (a, b) => Number(b.render.createdAt - a.render.createdAt)
        );
      });
      setLoadedCount((count) => count + 1);
    },
    []
  );
  const isLoading = loadedCount < projects.length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden", "aria-hidden": "true", children: projects.map((project) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      ProjectRendersLoader,
      {
        project,
        onLoaded: handleLoaded
      },
      project.id.toString()
    )) }),
    isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(RendersSkeleton, {}) : rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center",
        "data-ocid": "renders.empty_state",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex size-12 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Film, { className: "size-6", "aria-hidden": "true" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-display text-lg font-semibold tracking-tight", children: "No renders yet" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-sm text-sm text-muted-foreground", children: "Open a project, arm your cleanup tools, and render a video to see it listed here." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              asChild: true,
              type: "button",
              "data-ocid": "renders.go_to_projects_button",
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Clapperboard, { className: "size-4", "aria-hidden": "true" }),
                "Go to projects"
              ] })
            }
          )
        ]
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: cn("flex flex-col gap-3"), "data-ocid": "renders.list", children: rows.map((row, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      RenderHistoryRow,
      {
        row,
        index: index + 1
      },
      row.render.id.toString()
    )) })
  ] });
}
function ProjectRendersLoader({
  project,
  onLoaded
}) {
  const query = useRenders(project.id);
  const data = query.data;
  reactExports.useEffect(() => {
    if (data) onLoaded(project, data);
  }, [data, project, onLoaded]);
  return null;
}
export {
  RendersPage
};
