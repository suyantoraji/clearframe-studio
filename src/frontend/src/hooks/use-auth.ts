import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Current user / identity.
 *
 * `isAuthenticated` covers both a fresh interactive login and a session
 * restored on page reload, so it is the only flag used to gate authenticated
 * UI. Signed-out visitors remain fully able to process a video in a temporary
 * session; only saving requires sign-in.
 */
export function useAuth() {
  const {
    identity,
    login,
    clear,
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    isLoginError,
    isSessionExpired,
    loginError,
  } = useInternetIdentity();
  const queryClient = useQueryClient();

  const signIn = useCallback(() => {
    login();
  }, [login]);

  const signOut = useCallback(() => {
    clear();
    queryClient.clear();
  }, [clear, queryClient]);

  const principal = identity ? identity.getPrincipal().toString() : null;

  return {
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    isLoginError,
    isSessionExpired,
    loginError,
    principal,
    signIn,
    signOut,
  };
}
