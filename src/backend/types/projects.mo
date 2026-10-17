import Common "../types/common";

module {
  public type ProjectId = Common.ProjectId;
  public type RenderId = Common.RenderId;
  public type Timestamp = Common.Timestamp;
  public type FileRef = Common.FileRef;

  /// A video project owned by a single caller.
  public type Project = {
    id : ProjectId;
    owner : Principal;
    name : Text;
    sourceFilename : Text;
    durationMs : Nat;
    thumbnail : ?FileRef;
    sourceFile : FileRef;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  /// A completed render output belonging to a project.
  public type Render = {
    id : RenderId;
    projectId : ProjectId;
    owner : Principal;
    outputFile : FileRef;
    format : Text;
    resolution : Text;
    settingsSummary : Text;
    createdAt : Timestamp;
  };

  /// Shared view of a project returned across the API boundary.
  public type ProjectView = {
    id : ProjectId;
    name : Text;
    sourceFilename : Text;
    durationMs : Nat;
    thumbnail : ?FileRef;
    sourceFile : FileRef;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  /// Shared view of a render returned across the API boundary.
  public type RenderView = {
    id : RenderId;
    projectId : ProjectId;
    outputFile : FileRef;
    format : Text;
    resolution : Text;
    settingsSummary : Text;
    createdAt : Timestamp;
  };

  /// File references removed from the canister's records by a delete
  /// operation. The caller is responsible for deleting these files from
  /// platform object storage; the backend cannot delete stored blobs itself.
  public type DeletedFiles = {
    files : [FileRef];
  };

  /// Caller-visible failure modes for project and render operations.
  public type ProjectError = {
    #notFound;
    #notAuthorized;
    #invalidName;
  };
};
