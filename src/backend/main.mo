import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Expose "mo:caffeineai-oql/Expose";
import MapEntity "mo:caffeineai-oql/MapEntity";
import Entity "mo:caffeineai-oql/Entity";
import RecordValue "mo:caffeineai-oql/RecordValue";
import NatValue "mo:caffeineai-oql/NatValue";
import TextValue "mo:caffeineai-oql/TextValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import Common "types/common";
import Types "types/projects";
import ProjectsLib "lib/projects";
import ProjectsApi "mixins/projects-api";
import ApiDocMixin "mixins/api-doc";

actor {
  let accessControlState : AccessControl.AccessControlState;
  let projects : Map.Map<Common.ProjectId, Types.Project>;
  let renders : Map.Map<Common.RenderId, Types.Render>;
  let counters : ProjectsLib.Counters;

  include MixinAuthorization(accessControlState, null);
  include ProjectsApi(projects, renders, counters);
  include ApiDocMixin();
  include Expose({
    entities = [
      projects.toEntity("project", "Project", "id")
        .sample({
          id = 0;
          owner = Principal.fromText("aaaaa-aa");
          name = "";
          sourceFilename = "";
          durationMs = 0;
          thumbnail = ?"";
          sourceFile = "";
          createdAt = 0;
          updatedAt = 0;
        })
        .ownedBy("owner")
        .controllerOrScoped()
        .build(),
      renders.toEntity("render", "Render", "id")
        .sample({
          id = 0;
          projectId = 0;
          owner = Principal.fromText("aaaaa-aa");
          outputFile = "";
          format = "";
          resolution = "";
          settingsSummary = "";
          createdAt = 0;
        })
        .ownedBy("owner")
        .controllerOrScoped()
        .build(),
    ];
  });
};
