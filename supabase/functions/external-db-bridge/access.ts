// Pure authorization decisions for the bridge. Keeping these separate from
// the HTTP handler lets the security boundary be tested without live secrets.

export const PUBLIC_RPCS = new Set<string>([
  // Candidate onboarding is guarded by an unguessable, expiring token inside
  // the function itself and is the only intentionally public bridge route.
  "get_admissao_por_token",
]);

/** Generic reads/writes and all non-public RPCs require a verified user JWT. */
export function requiresAuthenticatedBridgeSession(action: string, rpcName?: string): boolean {
  return action !== "rpc" || !rpcName || !PUBLIC_RPCS.has(rpcName);
}

/**
 * Generic bridge operations must always run with the caller JWT at the
 * external database. `EXTERNAL_DB_KEY` may be privileged, so using it for a
 * data operation would silently bypass external RLS and any role checks
 * expressed there.
 *
 * The sole exception is the explicitly public onboarding lookup. Its
 * SECURITY DEFINER function validates the unguessable onboarding token and
 * is intentionally callable before a session exists.
 */
export function requiresCallerScopedExternalClient(action: string, rpcName?: string): boolean {
  return requiresAuthenticatedBridgeSession(action, rpcName);
}
