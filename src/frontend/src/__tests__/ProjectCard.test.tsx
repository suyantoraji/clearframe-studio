import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { ProjectGrid } from "@/components/dashboard/ProjectGrid";
import type { ProjectSummary } from "@/types";
import { renderWithRouter } from "./helpers";

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
    thumbnail: undefined,
    ...overrides,
  };
}

describe("ProjectCard", () => {
  it("shows the name, source filename, duration, and last-edited time", async () => {
    await renderWithRouter(
      <ProjectCard
        project={project()}
        index={1}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Beach clip")).toBeInTheDocument();
    expect(screen.getByText("beach.mp4")).toBeInTheDocument();
    expect(screen.getByText("1:05")).toBeInTheDocument();
    expect(screen.getByText(/Edited just now/)).toBeInTheDocument();
  });

  it("links the tile to the project workspace", async () => {
    await renderWithRouter(
      <ProjectCard
        project={project({ id: 7n })}
        index={1}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const link = screen.getByTestId("dashboard.project_open_link.1");
    expect(link).toHaveAttribute("href", "/workspace/7");
  });

  it("renames a project through the inline editor", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    await renderWithRouter(
      <ProjectCard
        project={project()}
        index={1}
        onRename={onRename}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("dashboard.rename_button.1"));
    const input = screen.getByLabelText("Project name");
    await user.clear(input);
    await user.type(input, "Sunset clip");
    await user.click(screen.getByTestId("dashboard.rename_save_button.1"));

    expect(onRename).toHaveBeenCalledWith(1n, "Sunset clip");
  });

  it("cancels a rename without calling back", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    await renderWithRouter(
      <ProjectCard
        project={project()}
        index={1}
        onRename={onRename}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("dashboard.rename_button.1"));
    await user.type(screen.getByLabelText("Project name"), "x");
    await user.click(screen.getByTestId("dashboard.rename_cancel_button.1"));

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText("Beach clip")).toBeInTheDocument();
  });

  it("requests deletion of the project", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const target = project();
    await renderWithRouter(
      <ProjectCard
        project={target}
        index={1}
        onRename={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByTestId("dashboard.delete_button.1"));
    expect(onDelete).toHaveBeenCalledWith(target);
  });
});

describe("ProjectGrid", () => {
  it("renders one card per project", async () => {
    await renderWithRouter(
      <ProjectGrid
        projects={[
          project({ id: 1n, name: "One" }),
          project({ id: 2n, name: "Two" }),
        ]}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard.project_card.1")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard.project_card.2")).toBeInTheDocument();
  });
});
