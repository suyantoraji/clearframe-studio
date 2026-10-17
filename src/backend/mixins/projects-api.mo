import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Time "mo:core/Time";
import Common "../types/common";
import Types "../types/projects";
import ProjectsLib "../lib/projects";

mixin (
  projects : Map.Map<Common.ProjectId, Types.Project>,
  renders : Map.Map<Common.RenderId, Types.Render>,
  counters : ProjectsLib.Counters,
) {
  /// Create a project owned by the caller.
  public shared ({ caller }) func createProject(
    name : Text,
    sourceFilename : Text,
    durationMs : Nat,
    thumbnail : ?Common.FileRef,
    sourceFile : Common.FileRef,
  ) : async Result.Result<Types.ProjectView, Types.ProjectError> {
    let trimmed = name.trim(#predicate(func c = c == ' ' or c == '\t' or c == '\n' or c == '\r'));
    if (trimmed == "") {
      return #err(#invalidName);
    };
    #ok(ProjectsLib.createProject(projects, counters, caller, trimmed, sourceFilename, durationMs, thumbnail, sourceFile, Time.now().toNat()));
  };

  /// List the caller's projects.
  public query ({ caller }) func listProjects() : async [Types.ProjectView] {
    ProjectsLib.listProjects(projects, caller);
  };

  /// Fetch one of the caller's projects.
  public query ({ caller }) func getProject(id : Common.ProjectId) : async Result.Result<Types.ProjectView, Types.ProjectError> {
    ProjectsLib.getProject(projects, caller, id);
  };

  /// Rename one of the caller's projects.
  public shared ({ caller }) func renameProject(id : Common.ProjectId, name : Text) : async Result.Result<Types.ProjectView, Types.ProjectError> {
    ProjectsLib.renameProject(projects, caller, id, name, Time.now().toNat());
  };

  /// Delete one of the caller's projects and its render records. Returns the
  /// file references the caller must delete from platform object storage.
  public shared ({ caller }) func deleteProject(id : Common.ProjectId) : async Result.Result<Types.DeletedFiles, Types.ProjectError> {
    ProjectsLib.deleteProject(projects, renders, caller, id);
  };

  /// Save a render record for one of the caller's projects.
  public shared ({ caller }) func saveRender(
    projectId : Common.ProjectId,
    outputFile : Common.FileRef,
    format : Text,
    resolution : Text,
    settingsSummary : Text,
  ) : async Result.Result<Types.RenderView, Types.ProjectError> {
    ProjectsLib.saveRender(projects, renders, counters, caller, projectId, outputFile, format, resolution, settingsSummary, Time.now().toNat());
  };

  /// List the renders of one of the caller's projects.
  public query ({ caller }) func listRenders(projectId : Common.ProjectId) : async Result.Result<[Types.RenderView], Types.ProjectError> {
    ProjectsLib.listRenders(projects, renders, caller, projectId);
  };

  /// Delete one of the caller's renders.
  public shared ({ caller }) func deleteRender(id : Common.RenderId) : async Result.Result<(), Types.ProjectError> {
    ProjectsLib.deleteRender(renders, caller, id);
  };
};
