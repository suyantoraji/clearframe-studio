import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectSummary } from "@/types";

export interface ProjectGridProps {
  projects: ProjectSummary[];
  onRename: (id: ProjectSummary["id"], name: string) => void;
  onDelete: (project: ProjectSummary) => void;
  renamingId?: ProjectSummary["id"] | null;
  deletingId?: ProjectSummary["id"] | null;
}

const SKELETON_IDS = Array.from(
  { length: 6 },
  (_, index) => `project-skeleton-${index}`,
);

/** Responsive grid of project tiles. */
export function ProjectGrid({
  projects,
  onRename,
  onDelete,
  renamingId = null,
  deletingId = null,
}: ProjectGridProps) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-ocid="dashboard.project_grid"
    >
      {projects.map((project, index) => (
        <ProjectCard
          key={project.id.toString()}
          project={project}
          index={index + 1}
          onRename={onRename}
          onDelete={onDelete}
          isRenaming={renamingId === project.id}
          isDeleting={deletingId === project.id}
        />
      ))}
    </div>
  );
}

/** Layout-matched loading placeholder for the project grid. */
export function ProjectGridSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-ocid="dashboard.project_grid.loading_state"
    >
      {SKELETON_IDS.map((id) => (
        <div
          key={id}
          className="overflow-hidden rounded-lg border border-border bg-card"
        >
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
