# Project Guidance

## User Preferences

- Watermark removal must handle horizontal, vertical, and diagonal watermarks
- Video enhancement is a required feature
- Background removal is a required feature and should feel powerful and advanced
- Processing happens on the user's own device in the browser; footage is not uploaded for processing

## Verified Commands

- **typecheck**: `pnpm typecheck`
- **fix**: `pnpm fix`
- **build**: `pnpm build`

## Learnings

- Platform object storage has no public upload method on ExternalBlob: build a StorageClient from loadConfig() plus HttpAgent.create({ host, identity }) and call putFile(bytes, onProgress, contentType, filename), then store client.getDirectURL(hash) as the FileRef string so fileRefToUrl(ref) resolves it.
- The Caffeine storage gateway exposes no per-blob DELETE route (only host-gated DELETE /v1/owner); per-blob reclamation is a backend-canister operation via MixinObjectStorage, so a frontend cannot delete an individual stored blob. A delete endpoint should return the FileRef values it removed so the caller can attempt cleanup.
- A MediaElementAudioSourceNode can only be created once per media element: cache it in a WeakMap plus a shared AudioContext, or a second createMediaElementSource throws InvalidStateError and silently drops audio on re-render.
- For frame-accurate canvas capture, seek the video to each frame's timestamp and await the 'seeked' event before drawing; a paused video otherwise yields one repeated frame for the whole export.
- Enhanced Migration with check-limit=1: fold every stable-state change into the single latest pending migration and delete any earlier pending one, or the stable-compatibility check fails.
- caffeineai-oql 0.7.1 cannot auto-derive entities with optional fields (M0230 _toRow); upgrade to 0.8.0.
- A PocketIC failure where a Result decodes as a bare { err: {...} } without __kind__ means the installed wasm predates the current source: run a clean mops build plus pnpm bindgen rather than changing source.
- Iter.map returns an Iter, not an array — call .toArray() before .sort(); Time.now() returns Int in mo:core, so convert with .toNat() when the target type is Nat.
- Headless loader components that call an onLoaded callback must be mounted in every render branch, not only the loaded branch, or the loading state deadlocks.
- pnpm check (biome) lints src/__tests__/ as well as production source; test-file format/import-order errors are tester-owned and must not be fixed by production check lanes.
