import AccessControl "mo:caffeineai-authorization/access-control";
import Map "mo:core/Map";

module {
  type ProjectId = Nat;
  type RenderId = Nat;
  type Timestamp = Nat;
  type FileRef = Text;

  type Project = {
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

  type Render = {
    id : RenderId;
    projectId : ProjectId;
    owner : Principal;
    outputFile : FileRef;
    format : Text;
    resolution : Text;
    settingsSummary : Text;
    createdAt : Timestamp;
  };

  type Counters = {
    var nextProjectId : Nat;
    var nextRenderId : Nat;
  };

  type OldActor = {};

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    projects : Map.Map<ProjectId, Project>;
    renders : Map.Map<RenderId, Render>;
    counters : Counters;
  };

  public func migration(_ : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      projects = Map.empty();
      renders = Map.empty();
      counters = { var nextProjectId = 0; var nextRenderId = 0 };
    };
  };
};
