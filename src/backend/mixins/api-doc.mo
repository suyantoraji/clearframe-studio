/// Static, human-readable documentation of the backend's public API.
///
/// This mixin declares exactly one method, `getApiDoc`, and reads no actor
/// state. The Markdown it returns is authored from the current backend source
/// and must be kept in sync whenever the public API changes.
mixin () {
  /// Return the backend API documentation as Markdown.
  public query func getApiDoc() : async Text {
    "# Video Watermark Studio — Backend API\n" #
    "\n" #
    "This canister stores video projects and their render history for the\n" #
    "Video Watermark Studio app. Video processing (watermark removal, video\n" #
    "enhancement, background removal) happens entirely in the user's browser;\n" #
    "the backend only persists project metadata and references to files held\n" #
    "in platform object storage.\n" #
    "\n" #
    "## Authentication and identity\n" #
    "\n" #
    "Every method below is a `shared` function that reads the caller's\n" #
    "principal from the message. There is no anonymous access: a signed-out\n" #
    "visitor can process a video in a temporary browser session, but cannot\n" #
    "call any of these methods to persist data.\n" #
    "\n" #
    "The frontend pins an Internet Identity derivation origin, published at\n" #
    "`/.well-known/ii-derivation-origin` when available. An agent that already\n" #
    "holds the user's Internet Identity authorization derives the correct\n" #
    "per-app principal against that origin (for example\n" #
    "`icp identity link web <name> --app <host>`). Such a delegation acts with\n" #
    "the user's full authority in this app until it expires.\n" #
    "\n" #
    "Ownership is per-record: a project is owned by the principal that created\n" #
    "it, and a render is owned by the principal that saved it. Every read and\n" #
    "write is scoped to the caller's own records. A caller that never signed in\n" #
    "through this app's frontend is a different principal than the one that\n" #
    "registered the data, so it sees nothing.\n" #
    "\n" #
    "## Units and encodings\n" #
    "\n" #
    "- `Timestamp` values (`createdAt`, `updatedAt`) are **nanoseconds** since\n" #
    "  the Unix epoch, as returned by the IC system clock (`Time.now()`).\n" #
    "- `durationMs` is the source video duration in **milliseconds**.\n" #
    "- `ProjectId` and `RenderId` are `Nat` counters, unique and monotonically\n" #
    "  increasing across the canister's lifetime.\n" #
    "- `FileRef` is a `Text` reference to a file in platform object storage\n" #
    "  (the storage key/URL), not the file bytes themselves.\n" #
    "- `thumbnail` is an optional `FileRef`; `null` means no thumbnail was\n" #
    "  supplied.\n" #
    "\n" #
    "## Methods\n" #
    "\n" #
    "### createProject\n" #
    "\n" #
    "`createProject(name, sourceFilename, durationMs, thumbnail, sourceFile)`\n" #
    "→ `Result<ProjectView, ProjectError>`\n" #
    "\n" #
    "Creates a project owned by the caller and returns its view. `name` is\n" #
    "trimmed of surrounding whitespace; an empty result yields `#invalidName`.\n" #
    "`sourceFile` must already reference an uploaded source video. The new\n" #
    "project's `createdAt` and `updatedAt` are set to the current time.\n" #
    "\n" #
    "### listProjects\n" #
    "\n" #
    "`listProjects()` → `[ProjectView]`\n" #
    "\n" #
    "Returns every project owned by the caller, newest first by `createdAt`.\n" #
    "Returns an empty array when the caller owns none. This is a query call.\n" #
    "\n" #
    "### getProject\n" #
    "\n" #
    "`getProject(id)` → `Result<ProjectView, ProjectError>`\n" #
    "\n" #
    "Returns one project owned by the caller. `#notFound` when no project has\n" #
    "that id; `#notAuthorized` when the project exists but belongs to another\n" #
    "principal. This is a query call.\n" #
    "\n" #
    "### renameProject\n" #
    "\n" #
    "`renameProject(id, name)` → `Result<ProjectView, ProjectError>`\n" #
    "\n" #
    "Renames a project owned by the caller. `name` is trimmed; an empty result\n" #
    "yields `#invalidName`. On success `updatedAt` is refreshed to the current\n" #
    "time. `#notFound` / `#notAuthorized` as for `getProject`.\n" #
    "\n" #
    "### deleteProject\n" #
    "\n" #
    "`deleteProject(id)` → `Result<DeletedFiles, ProjectError>`\n" #
    "\n" #
    "Deletes a project owned by the caller **and every render record belonging\n" #
    "to it**. This is destructive and not recoverable. `#notFound` /\n" #
    "`#notAuthorized` as for `getProject`.\n" #
    "\n" #
    "On success it returns `DeletedFiles`, whose `files` array lists every file\n" #
    "reference that was removed from the canister's records: the project's\n" #
    "`sourceFile`, its `thumbnail` when present, and the `outputFile` of every\n" #
    "render that belonged to the project. The backend cannot delete blobs from\n" #
    "platform object storage itself, so the caller is responsible for deleting\n" #
    "each returned reference from object storage. The array is empty only when\n" #
    "the project had no source file, thumbnail, or renders to report.\n" #
    "\n" #
    "### saveRender\n" #
    "\n" #
    "`saveRender(projectId, outputFile, format, resolution, settingsSummary)`\n" #
    "→ `Result<RenderView, ProjectError>`\n" #
    "\n" #
    "Records a completed render for a project owned by the caller.\n" #
    "`outputFile` must already reference the exported file in object storage.\n" #
    "`format` and `resolution` are free-form labels (for example `\"mp4\"`,\n" #
    "`\"1920x1080\"`); `settingsSummary` is a human-readable description of the\n" #
    "processing settings. `#notFound` when the project does not exist;\n" #
    "`#notAuthorized` when it belongs to another principal.\n" #
    "\n" #
    "### listRenders\n" #
    "\n" #
    "`listRenders(projectId)` → `Result<[RenderView], ProjectError>`\n" #
    "\n" #
    "Returns every render belonging to a project owned by the caller, newest\n" #
    "first by `createdAt`. `#notFound` / `#notAuthorized` as for `getProject`.\n" #
    "This is a query call.\n" #
    "\n" #
    "### deleteRender\n" #
    "\n" #
    "`deleteRender(id)` → `Result<(), ProjectError>`\n" #
    "\n" #
    "Deletes a render owned by the caller. Destructive and not recoverable.\n" #
    "`#notFound` when no render has that id; `#notAuthorized` when it belongs\n" #
    "to another principal.\n" #
    "\n" #
    "### getApiDoc\n" #
    "\n" #
    "`getApiDoc()` → `Text`\n" #
    "\n" #
    "Returns this document. Static; reads no state. This is a query call.\n" #
    "\n" #
    "## Errors\n" #
    "\n" #
    "Fallible methods return `Result<Ok, ProjectError>` where `ProjectError` is\n" #
    "one of:\n" #
    "\n" #
    "- `#notFound` — no record with the given id.\n" #
    "- `#notAuthorized` — the record exists but is owned by another principal.\n" #
    "- `#invalidName` — the supplied name is empty after trimming.\n" #
    "\n" #
    "These are returned as values, not traps, so callers can branch on them.\n" #
    "\n" #
    "## Lifecycle, polling, and retry safety\n" #
    "\n" #
    "- `createProject` and `saveRender` are **not idempotent**: each successful\n" #
    "  call allocates a new id and creates a new record. Retrying after a\n" #
    "  timeout can create duplicates; confirm the result before retrying.\n" #
    "- `renameProject` is idempotent for the same name (it overwrites), but it\n" #
    "  refreshes `updatedAt` on every call.\n" #
    "- `deleteProject` and `deleteRender` are idempotent in effect: a second\n" #
    "  call returns `#notFound` because the record is already gone.\n" #
    "- Reads (`listProjects`, `getProject`, `listRenders`, `getApiDoc`) are\n" #
    "  query calls and safe to poll. There is no server-side job queue: a\n" #
    "  render is \"complete\" once the browser finishes processing and calls\n" #
    "  `saveRender`. Poll `listRenders` to observe new renders.\n" #
    "\n" #
    "## Non-obvious gotchas\n" #
    "\n" #
    "- Deleting a project cascades to its renders; deleting a render does not\n" #
    "  affect its project.\n" #
    "- `FileRef` values are opaque storage references. The backend does not\n" #
    "  verify that the referenced file exists. `deleteProject` returns the file\n" #
    "  references it removed so the caller can delete them from object storage;\n" #
    "  `deleteRender` does not return the render's output file, so a caller that\n" #
    "  deletes a single render must delete its `outputFile` from object storage\n" #
    "  separately.\n" #
    "- Timestamps are nanoseconds; divide by 1,000,000 for milliseconds and by\n" #
    "  1,000,000,000 for seconds when displaying them.\n" #
    "- The OQL data-intelligence surface (`schema` / `execute`) is separate\n" #
    "  from this API and is authorized per table; it is not part of the\n" #
    "  application's public contract."
  };
};
