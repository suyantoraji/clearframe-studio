import { createActor } from "@/backend";
import type { Backend } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";

/**
 * Typed wrapper around the generated backend actor.
 *
 * `useBackendActor` is the single entry point every query and mutation hook
 * uses, so the generated `createActor` binding is referenced in exactly one
 * place. The actor is created by the platform's `useActor` hook, which wires
 * the canister id, agent, and object-storage upload/download plumbing.
 */
export function useBackendActor(): { actor: Backend | null; isFetching: boolean } {
  return useActor(createActor);
}

/** Narrow a backend `Result` variant into its success payload, or throw the error. */
export function unwrapResult<T, E>(result: { __kind__: "ok"; ok: T } | { __kind__: "err"; err: E }): T {
  if (result.__kind__ === "ok") return result.ok;
  throw new Error(String(result.err));
}

/** Human-readable message for a backend `ProjectError`. */
export function projectErrorMessage(error: string): string {
  switch (error) {
    case "notAuthorized":
      return "You do not have access to this project.";
    case "notFound":
      return "That project could not be found.";
    case "invalidName":
      return "Enter a project name between 1 and 80 characters.";
    default:
      return "Something went wrong. Please try again.";
  }
}
