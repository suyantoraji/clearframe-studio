import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Common "../types/common";
import Types "../types/projects";

module {
  public type ProjectId = Common.ProjectId;
  public type RenderId = Common.RenderId;
  public type Timestamp = Common.Timestamp;
  public type FileRef = Common.FileRef;
  public type Project = Types.Project;
  public type Render = Types.Render;
  public type ProjectView = Types.ProjectView;
  public type RenderView = Types.RenderView;
  public type DeletedFiles = Types.DeletedFiles;
  public type ProjectError = Types.ProjectError;

  /// Mutable counters shared with the actor.
  public type Counters = {
    var nextProjectId : Nat;
    var nextRenderId : Nat;
  };

  /// Trim surrounding whitespace and reject an empty result.
  func normalizeName(name : Text) : ?Text {
    let trimmed = name.trim(#predicate(func c = c == ' ' or c == '\t' or c == '\n' or c == '\r'));
    if (trimmed == "") { null } else { ?trimmed };
  };

  /// Convert an internal project record to its shared view.
  public func toProjectView(project : Project) : ProjectView {
    {
      id = project.id;
      name = project.name;
      sourceFilename = project.sourceFilename;
      durationMs = project.durationMs;
      thumbnail = project.thumbnail;
      sourceFile = project.sourceFile;
      createdAt = project.createdAt;
      updatedAt = project.updatedAt;
    };
  };

  /// Convert an internal render record to its shared view.
  public func toRenderView(render : Render) : RenderView {
    {
      id = render.id;
      projectId = render.projectId;
      outputFile = render.outputFile;
      format = render.format;
      resolution = render.resolution;
      settingsSummary = render.settingsSummary;
      createdAt = render.createdAt;
    };
  };

  /// Create a project owned by `owner` and return its shared view.
  public func createProject(
    projects : Map.Map<ProjectId, Project>,
    counters : Counters,
    owner : Principal,
    name : Text,
    sourceFilename : Text,
    durationMs : Nat,
    thumbnail : ?FileRef,
    sourceFile : FileRef,
    now : Timestamp,
  ) : ProjectView {
    let id = counters.nextProjectId;
    counters.nextProjectId := id + 1;
    let project : Project = {
      id;
      owner;
      name;
      sourceFilename;
      durationMs;
      thumbnail;
      sourceFile;
      createdAt = now;
      updatedAt = now;
    };
    projects.add(id, project);
    toProjectView(project);
  };

  /// List every project owned by `owner`, newest first.
  public func listProjects(
    projects : Map.Map<ProjectId, Project>,
    owner : Principal,
  ) : [ProjectView] {
    let owned = projects.values().filter(func p = Principal.equal(p.owner, owner));
    let views = owned.map(func p = toProjectView(p)).toArray();
    views.sort(func(a, b) = if (a.createdAt > b.createdAt) { #less } else if (a.createdAt < b.createdAt) { #greater } else { #equal });
  };

  /// Fetch one project owned by `owner`.
  public func getProject(
    projects : Map.Map<ProjectId, Project>,
    owner : Principal,
    id : ProjectId,
  ) : Result.Result<ProjectView, ProjectError> {
    switch (projects.get(id)) {
      case null { #err(#notFound) };
      case (?project) {
        if (Principal.equal(project.owner, owner)) {
          #ok(toProjectView(project));
        } else {
          #err(#notAuthorized);
        };
      };
    };
  };

  /// Rename a project owned by `owner`.
  public func renameProject(
    projects : Map.Map<ProjectId, Project>,
    owner : Principal,
    id : ProjectId,
    name : Text,
    now : Timestamp,
  ) : Result.Result<ProjectView, ProjectError> {
    switch (projects.get(id)) {
      case null { #err(#notFound) };
      case (?project) {
        if (not Principal.equal(project.owner, owner)) {
          #err(#notAuthorized);
        } else {
          switch (normalizeName(name)) {
            case null { #err(#invalidName) };
            case (?trimmed) {
              let updated : Project = {
                id = project.id;
                owner = project.owner;
                name = trimmed;
                sourceFilename = project.sourceFilename;
                durationMs = project.durationMs;
                thumbnail = project.thumbnail;
                sourceFile = project.sourceFile;
                createdAt = project.createdAt;
                updatedAt = now;
              };
              projects.add(id, updated);
              #ok(toProjectView(updated));
            };
          };
        };
      };
    };
  };

  /// Delete a project owned by `owner` together with its render records.
  ///
  /// Returns every file reference the caller must now delete from platform
  /// object storage: the project's source file, its thumbnail (when present),
  /// and the output file of every render belonging to the project.
  public func deleteProject(
    projects : Map.Map<ProjectId, Project>,
    renders : Map.Map<RenderId, Render>,
    owner : Principal,
    id : ProjectId,
  ) : Result.Result<DeletedFiles, ProjectError> {
    switch (projects.get(id)) {
      case null { #err(#notFound) };
      case (?project) {
        if (not Principal.equal(project.owner, owner)) {
          #err(#notAuthorized);
        } else {
          let doomed = renders.values().filter(func r = r.projectId == id).toArray();
          let files = List.empty<FileRef>();
          files.add(project.sourceFile);
          switch (project.thumbnail) {
            case (?thumb) { files.add(thumb) };
            case null {};
          };
          for (render in doomed.values()) {
            files.add(render.outputFile);
            renders.remove(render.id);
          };
          projects.remove(id);
          #ok({ files = files.toArray() });
        };
      };
    };
  };

  /// Save a render record for a project owned by `owner`.
  public func saveRender(
    projects : Map.Map<ProjectId, Project>,
    renders : Map.Map<RenderId, Render>,
    counters : Counters,
    owner : Principal,
    projectId : ProjectId,
    outputFile : FileRef,
    format : Text,
    resolution : Text,
    settingsSummary : Text,
    now : Timestamp,
  ) : Result.Result<RenderView, ProjectError> {
    switch (projects.get(projectId)) {
      case null { #err(#notFound) };
      case (?project) {
        if (not Principal.equal(project.owner, owner)) {
          #err(#notAuthorized);
        } else {
          let id = counters.nextRenderId;
          counters.nextRenderId := id + 1;
          let render : Render = {
            id;
            projectId;
            owner;
            outputFile;
            format;
            resolution;
            settingsSummary;
            createdAt = now;
          };
          renders.add(id, render);
          #ok(toRenderView(render));
        };
      };
    };
  };

  /// List every render belonging to a project owned by `owner`, newest first.
  public func listRenders(
    projects : Map.Map<ProjectId, Project>,
    renders : Map.Map<RenderId, Render>,
    owner : Principal,
    projectId : ProjectId,
  ) : Result.Result<[RenderView], ProjectError> {
    switch (projects.get(projectId)) {
      case null { #err(#notFound) };
      case (?project) {
        if (not Principal.equal(project.owner, owner)) {
          #err(#notAuthorized);
        } else {
          let owned = renders.values().filter(func r = r.projectId == projectId);
          let views = owned.map(func r = toRenderView(r)).toArray();
          #ok(views.sort(func(a, b) = if (a.createdAt > b.createdAt) { #less } else if (a.createdAt < b.createdAt) { #greater } else { #equal }));
        };
      };
    };
  };

  /// Delete a render owned by `owner`.
  public func deleteRender(
    renders : Map.Map<RenderId, Render>,
    owner : Principal,
    id : RenderId,
  ) : Result.Result<(), ProjectError> {
    switch (renders.get(id)) {
      case null { #err(#notFound) };
      case (?render) {
        if (Principal.equal(render.owner, owner)) {
          renders.remove(id);
          #ok(());
        } else {
          #err(#notAuthorized);
        };
      };
    };
  };
};
