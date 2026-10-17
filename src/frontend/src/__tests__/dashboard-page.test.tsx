import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectSummary } from "@/types";
import { renderWithRouter } from "./helpers";

// The dashboard reads auth and the project hooks, and uploads through object
// storage. Mock each module seam so the page's own states and interactions are
// exercised without a canister, a network, or real storage.
const authState = {
  isAuthenticated: true,
  isInitializing: false,
  isLoggingIn: false,
};
const projectsState: {
  data: ProjectSummary[];
  isLoading: boolean;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
} = {
  data: [],
  isLoading: false,
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
};
const deleteMutate = vi.fn();
const renameMutate = vi.fn();
const createMutateAsync = vi.fn(async () => undefined);

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ ...authState, signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("@/hooks/use-projects", () => ({
  useProjects: () => ({ ...projectsState }),
  useCreateProject: () => ({
    mutateAsync: createMutateAsync,
    isPending: false,
  }),
  useRenameProject: () => ({
    mutate: renameMutate,
    isPending: false,
    variables: undefined,
  }),
  useDeleteProject: () => ({
    mutate: deleteMutate,
    isPending: false,
    variables: undefined,
  }),
}));

vi.mock("@caffeineai/core-infrastructure", () => ({
  useInternetIdentity: () => ({ identity: undefined }),
  loadConfig: vi.fn(),
}));

vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return { ...actual, fileToExternalBlob: vi.fn() };
});

import { DashboardPage } from "@/pages/Dashboard";

const NANOS_PER_MS = 1_000_000n;

function project(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  const now = BigInt(Date.now()) * NANOS_PER_MS;
  return {
    id: 1n,
    name: "Beach clip",
    sourceFilename: "beach.mp4",
    durationMs: 65_000n,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

beforeEach(() => {
  authState.isAuthenticated = true;
  authState.isInitializing = false;
  authState.isLoggingIn = false;
  projectsState.data = [];
  projectsState.isLoading = false;
  projectsState.isPending = false;
  projectsState.isError = false;
  projectsState.error = null;
  deleteMutate.mockClear();
  renameMutate.mockClear();
  createMutateAsync.mockClear();
});

describe("DashboardPage", () => {
  it("states plainly that footage is not uploaded for processing", async () => {
    await renderWithRouter(<DashboardPage />);
    expect(
      screen.getByText(/never uploaded for processing/i),
    ).toBeInTheDocument();
  });

  it("shows the project grid for a signed-in user with projects", async () => {
    projectsState.data = [
      project({ id: 1n, name: "One" }),
      project({ id: 2n, name: "Two" }),
    ];

    await renderWithRouter(<DashboardPage />);

    expect(screen.getByTestId("dashboard.project_grid")).toBeInTheDocument();
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
  });

  it("shows an empty state when the signed-in user has no projects", async () => {
    projectsState.data = [];

    await renderWithRouter(<DashboardPage />);

    expect(screen.getByTestId("dashboard.empty_state")).toBeInTheDocument();
  });

  it("invites signed-out visitors to sign in and hides the grid", async () => {
    authState.isAuthenticated = false;

    await renderWithRouter(<DashboardPage />);

    expect(
      screen.getByTestId("dashboard.signed_out_state"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("dashboard.sign_in_prompt")).toBeInTheDocument();
    expect(
      screen.queryByTestId("dashboard.project_grid"),
    ).not.toBeInTheDocument();
  });

  it("confirms before deleting a project", async () => {
    const user = userEvent.setup();
    projectsState.data = [project({ id: 7n, name: "Beach clip" })];

    await renderWithRouter(<DashboardPage />);
    await user.click(screen.getByTestId("dashboard.delete_button.1"));

    expect(screen.getByTestId("dashboard.delete_dialog")).toBeInTheDocument();
    // Cancelling must not delete.
    await user.click(screen.getByTestId("dashboard.delete_cancel_button"));
    expect(deleteMutate).not.toHaveBeenCalled();

    // Confirming deletes the chosen project by id.
    await user.click(screen.getByTestId("dashboard.delete_button.1"));
    await user.click(screen.getByTestId("dashboard.delete_confirm_button"));
    await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith(7n));
  });

  it("renames a project through the inline editor", async () => {
    const user = userEvent.setup();
    projectsState.data = [project({ id: 3n, name: "Beach clip" })];

    await renderWithRouter(<DashboardPage />);
    await user.click(screen.getByTestId("dashboard.rename_button.1"));
    const input = screen.getByLabelText("Project name");
    await user.clear(input);
    await user.type(input, "Sunset clip");
    await user.click(screen.getByTestId("dashboard.rename_save_button.1"));

    expect(renameMutate).toHaveBeenCalledWith({ id: 3n, name: "Sunset clip" });
  });
});
