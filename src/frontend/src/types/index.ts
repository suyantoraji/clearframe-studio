import type {
  ProjectError,
  ProjectId,
  ProjectView,
  RenderId,
  RenderView,
  Timestamp,
} from "@/backend";

export type {
  ProjectError,
  ProjectId,
  ProjectView,
  RenderId,
  RenderView,
  Timestamp,
};

/** A project as rendered in the dashboard grid. */
export interface ProjectSummary {
  id: ProjectId;
  name: string;
  sourceFilename: string;
  durationMs: bigint;
  updatedAt: Timestamp;
  createdAt: Timestamp;
  thumbnail?: string;
}

/** A saved render record shown in render history. */
export interface RenderRecord {
  id: RenderId;
  projectId: ProjectId;
  format: string;
  resolution: string;
  settingsSummary: string;
  outputFile: string;
  createdAt: Timestamp;
}

/** A render queued in the current temporary (signed-out) session. */
export interface SessionRender {
  id: string;
  projectName: string;
  format: string;
  resolution: string;
  settingsSummary: string;
  createdAt: number;
}

export function toProjectSummary(project: ProjectView): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    sourceFilename: project.sourceFilename,
    durationMs: project.durationMs,
    updatedAt: project.updatedAt,
    createdAt: project.createdAt,
    thumbnail: project.thumbnail,
  };
}

export function toRenderRecord(render: RenderView): RenderRecord {
  return {
    id: render.id,
    projectId: render.projectId,
    format: render.format,
    resolution: render.resolution,
    settingsSummary: render.settingsSummary,
    outputFile: render.outputFile,
    createdAt: render.createdAt,
  };
}
