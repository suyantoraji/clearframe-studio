import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Cell {
    value: Value;
    name: string;
}
export interface DeletedFiles {
    files: Array<FileRef>;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export type FileRef = string;
export type ProjectId = bigint;
export interface ProjectView {
    id: ProjectId;
    sourceFilename: string;
    thumbnail?: FileRef;
    name: string;
    createdAt: Timestamp;
    sourceFile: FileRef;
    updatedAt: Timestamp;
    durationMs: bigint;
}
export type RenderId = bigint;
export interface RenderView {
    id: RenderId;
    createdAt: Timestamp;
    resolution: string;
    settingsSummary: string;
    projectId: ProjectId;
    outputFile: FileRef;
    format: string;
}
export type Result = {
    __kind__: "ok";
    ok: RenderView;
} | {
    __kind__: "err";
    err: ProjectError;
};
export type Result_1 = {
    __kind__: "ok";
    ok: ProjectView;
} | {
    __kind__: "err";
    err: ProjectError;
};
export type Result_2 = {
    __kind__: "ok";
    ok: Array<RenderView>;
} | {
    __kind__: "err";
    err: ProjectError;
};
export type Result_3 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: ProjectError;
};
export type Result_4 = {
    __kind__: "ok";
    ok: DeletedFiles;
} | {
    __kind__: "err";
    err: ProjectError;
};
export type Result_5 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface Result__1 {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Timestamp = bigint;
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum ProjectError {
    notAuthorized = "notAuthorized",
    notFound = "notFound",
    invalidName = "invalidName"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    /**
     * / Create a project owned by the caller.
     */
    createProject(name: string, sourceFilename: string, durationMs: bigint, thumbnail: FileRef | null, sourceFile: FileRef): Promise<Result_1>;
    /**
     * / Delete one of the caller's projects and its render records. Returns the
     * / file references the caller must delete from platform object storage.
     */
    deleteProject(id: ProjectId): Promise<Result_4>;
    /**
     * / Delete one of the caller's renders.
     */
    deleteRender(id: RenderId): Promise<Result_3>;
    execute(qJson: string): Promise<Result__1>;
    /**
     * / Return the backend API documentation as Markdown.
     */
    getApiDoc(): Promise<string>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Fetch one of the caller's projects.
     */
    getProject(id: ProjectId): Promise<Result_1>;
    isCallerAdmin(): Promise<boolean>;
    /**
     * / List the caller's projects.
     */
    listProjects(): Promise<Array<ProjectView>>;
    /**
     * / List the renders of one of the caller's projects.
     */
    listRenders(projectId: ProjectId): Promise<Result_2>;
    /**
     * / Rename one of the caller's projects.
     */
    renameProject(id: ProjectId, name: string): Promise<Result_1>;
    /**
     * / Save a render record for one of the caller's projects.
     */
    saveRender(projectId: ProjectId, outputFile: FileRef, format: string, resolution: string, settingsSummary: string): Promise<Result>;
    schema(): Promise<string>;
}
