import { PocketIc, createIdentity } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";
// Set only on a converted project: the last pre-EM revision, whose schema this
// app's migration chain replays from. Installing the current wasm onto an empty
// canister there traps IC0503 before any test runs.
const BASELINE_WASM = process.env.BACKEND_WASM_BASELINE;

let pic: PocketIc | undefined;
let actor: Actor<_SERVICE>;
let canisterId: CanisterFixture<_SERVICE>["canisterId"];

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  if (BASELINE_WASM === undefined) {
    ({ actor, canisterId } = await pic.setupCanister<_SERVICE>({ idlFactory, wasm: BACKEND_WASM }));
    return;
  }
  // `[baseline, current]`, the same install contract the hosted deploy uses for
  // a converted project. The upgrade replays the chain from the legacy schema.
  const installed = await pic.setupCanister<_SERVICE>({ idlFactory, wasm: BASELINE_WASM });
  await pic.upgradeCanister({ canisterId: installed.canisterId, wasm: BACKEND_WASM, arg: new Uint8Array() });
  ({ actor, canisterId } = installed);
});

afterAll(async () => {
  // `?.` because `beforeAll` may not have got that far. A failed
  // `PocketIc.create` otherwise stacks "Cannot read properties of undefined"
  // on top of the real error and buries the one line that explains the run.
  await pic?.tearDown();
});

// The lane speaks the agent-js declarations' Candid shapes, NOT the
// TypeScript-native wrapper's: a variant is `{ variantName: null }` and an
// optional is `[] | [T]`. `__kind__` belongs to `src/frontend/src/backend.ts`
// and never appears on a value returned through `idlFactory`.

it("answers an empty-state read instead of trapping", async () => {
  await expect(actor.listProjects()).resolves.toEqual([]);
});

it("round-trips a project through the real canister", async () => {
  const created = await actor.createProject("Clip", "clip.mp4", 1000n, [], "file-ref");
  expect("ok" in created).toBe(true);
  if (!("ok" in created)) return;
  const id = created.ok.id;
  const listed = await actor.listProjects();
  expect(listed).toContainEqual(expect.objectContaining({ id, name: "Clip" }));
});

it("rejects an empty project name", async () => {
  const result = await actor.createProject("   ", "clip.mp4", 1000n, [], "file-ref");
  expect(result).toEqual({ err: { invalidName: null } });
});

it("round-trips a render record through the real canister", async () => {
  const created = await actor.createProject("Clip", "clip.mp4", 1000n, [], "file-ref");
  if (!("ok" in created)) throw new Error("project creation failed");
  const projectId = created.ok.id;

  const saved = await actor.saveRender(projectId, "out-ref", "MP4", "1920 × 1080", "Watermark mask");
  expect("ok" in saved).toBe(true);
  if (!("ok" in saved)) return;

  const renders = await actor.listRenders(projectId);
  expect("ok" in renders).toBe(true);
  if (!("ok" in renders)) return;
  expect(renders.ok).toContainEqual(expect.objectContaining({ id: saved.ok.id, format: "MP4" }));
});

it("renames and deletes a project through the real canister", async () => {
  const created = await actor.createProject("Old", "clip.mp4", 1000n, [], "file-ref");
  if (!("ok" in created)) throw new Error("project creation failed");
  const id = created.ok.id;

  const renamed = await actor.renameProject(id, "New");
  expect("ok" in renamed).toBe(true);
  if ("ok" in renamed) {
    expect(renamed.ok.name).toBe("New");
  }

  const deleted = await actor.deleteProject(id);
  expect("ok" in deleted).toBe(true);
  const after = await actor.getProject(id);
  expect(after).toEqual({ err: { notFound: null } });
});

it("deletes a render record through the real canister", async () => {
  const created = await actor.createProject("Clip", "clip.mp4", 1000n, [], "file-ref");
  if (!("ok" in created)) throw new Error("project creation failed");
  const projectId = created.ok.id;

  const saved = await actor.saveRender(projectId, "out-ref", "MP4", "1920 × 1080", "Watermark mask");
  if (!("ok" in saved)) throw new Error("render save failed");
  const renderId = saved.ok.id;

  // A unit-returning method decodes to `null` through the agent-js bindings.
  await expect(actor.deleteRender(renderId)).resolves.toEqual({ ok: null });

  const renders = await actor.listRenders(projectId);
  expect("ok" in renders).toBe(true);
  if ("ok" in renders) {
    expect(renders.ok).toHaveLength(0);
  }
});

it("reports a missing render as notFound instead of trapping", async () => {
  await expect(actor.deleteRender(999_999n)).resolves.toEqual({
    err: { notFound: null },
  });
});

it("keeps one caller's projects out of another caller's list", async () => {
  const alice = createIdentity("alice");
  const bob = createIdentity("bob");

  actor.setIdentity(alice);
  const created = await actor.createProject("Alice clip", "alice.mp4", 1000n, [], "alice-ref");
  if (!("ok" in created)) throw new Error("project creation failed");
  const aliceProjectId = created.ok.id;

  // Bob sees none of Alice's projects and cannot read hers by id.
  actor.setIdentity(bob);
  const bobProjects = await actor.listProjects();
  expect(bobProjects.some((project) => project.id === aliceProjectId)).toBe(false);
  await expect(actor.getProject(aliceProjectId)).resolves.toEqual({
    err: { notAuthorized: null },
  });

  // Alice still sees her own project.
  actor.setIdentity(alice);
  const aliceProjects = await actor.listProjects();
  expect(aliceProjects.some((project) => project.id === aliceProjectId)).toBe(true);
});
