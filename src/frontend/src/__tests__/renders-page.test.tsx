import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectSummary, RenderRecord } from "@/types";
import { renderWithRouter } from "./helpers";

// The Renders page reads auth, projects, and per-project renders, and triggers
// a storage download. Each is mocked at its module seam so the page is exercised
// without a canister, a network, or real object storage.
const authState = {
  isAuthenticated: true,
  isInitializing: false,
  isLoggingIn: false,
};
const projectsState: { data: ProjectSummary[]; isLoading: boolean } = {
  data: [],
  isLoading: false,
};
const rendersByProject = new Map<string, RenderRecord[]>();
const downloadFileRef = vi.fn(
  async (_fileRef: string, _filename: string) => undefined,
);

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ ...authState, signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("@/hooks/use-projects", () => ({
  useProjects: () => ({ ...projectsState }),
}));

vi.mock("@/hooks/use-renders", () => ({
  useRenders: (projectId: bigint | null) => ({
    data:
      projectId === null
        ? []
        : (rendersByProject.get(projectId.toString()) ?? []),
    isLoading: false,
  }),
}));

vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return {
    ...actual,
    downloadFileRef: (fileRef: string, filename: string) =>
      downloadFileRef(fileRef, filename),
  };
});

import { RendersPage } from "@/pages/Renders";

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

function renderRecord(overrides: Partial<RenderRecord> = {}): RenderRecord {
  return {
    id: 10n,
    projectId: 1n,
    format: "MP4",
    resolution: "1920 × 1080",
    settingsSummary: "Watermark mask (1 shape, static)",
    outputFile: "file://out.mp4",
    createdAt: BigInt(Date.now()) * NANOS_PER_MS,
    ...overrides,
  };
}

beforeEach(() => {
  authState.isAuthenticated = true;
  authState.isInitializing = false;
  authState.isLoggingIn = false;
  projectsState.data = [];
  projectsState.isLoading = false;
  rendersByProject.clear();
  downloadFileRef.mockClear();
});

describe("RendersPage", () => {
  it("lists a signed-in user's renders with project, format, and resolution", async () => {
    projectsState.data = [project({ id: 1n, name: "Beach clip" })];
    rendersByProject.set("1", [renderRecord()]);

    await renderWithRouter(<RendersPage />);

    await waitFor(() =>
      expect(screen.getByTestId("renders.list")).toBeInTheDocument(),
    );
    expect(screen.getByText("Beach clip")).toBeInTheDocument();
    expect(screen.getByText("MP4")).toBeInTheDocument();
    expect(screen.getByTestId("renders.resolution.1")).toHaveTextContent(
      "1920 × 1080",
    );
  });

  it("downloads a render through the storage helper", async () => {
    const user = userEvent.setup();
    projectsState.data = [project({ id: 1n, name: "Beach clip" })];
    rendersByProject.set("1", [renderRecord({ id: 10n, format: "MP4" })]);

    await renderWithRouter(<RendersPage />);
    await waitFor(() =>
      expect(
        screen.getByTestId("renders.download_button.1"),
      ).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId("renders.download_button.1"));

    await waitFor(() => expect(downloadFileRef).toHaveBeenCalledTimes(1));
    expect(downloadFileRef).toHaveBeenCalledWith(
      "file://out.mp4",
      "beach-clip-10.mp4",
    );
  });

  it("invites signed-out visitors to sign in instead of listing renders", async () => {
    authState.isAuthenticated = false;

    await renderWithRouter(<RendersPage />);

    expect(screen.getByTestId("renders.signed_out_state")).toBeInTheDocument();
    expect(screen.getByTestId("renders.sign_in_button")).toBeInTheDocument();
    expect(screen.queryByTestId("renders.list")).not.toBeInTheDocument();
  });

  it("shows an empty state when the user has no projects", async () => {
    projectsState.data = [];

    await renderWithRouter(<RendersPage />);

    expect(screen.getByTestId("renders.empty_state")).toBeInTheDocument();
    expect(
      screen.getByTestId("renders.go_to_projects_button"),
    ).toBeInTheDocument();
  });

  it("shows an empty state when projects exist but have no renders", async () => {
    projectsState.data = [project({ id: 1n, name: "Beach clip" })];
    rendersByProject.set("1", []);

    await renderWithRouter(<RendersPage />);

    await waitFor(() =>
      expect(screen.getByTestId("renders.empty_state")).toBeInTheDocument(),
    );
  });
});
