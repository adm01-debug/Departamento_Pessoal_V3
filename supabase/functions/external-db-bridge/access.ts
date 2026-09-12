// Pure authorization decisions for the bridge. Keeping these separate from
// the HTTP handler lets the security boundary be tested without live secrets.

export const PUBLIC_RPCS = new Set<string>([
  // Public workflows are RPC-only and validate an unguessable, expiring (or
  // one-time) token inside the database routine.  Never add a plain table
  // operation here: the bridge would otherwise turn a public route into a
  // generic data-access primitive.
  "get_admissao_por_token",
  "contrato_consultar_por_token",
  "contrato_preview_url_por_token",
  "contrato_assinar_por_token",
  "contrato_verificar_autenticidade_v2",
  "medida_consultar_por_token",
  "medida_registrar_ciencia_publica",
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

/** Detect keys that must never be used by an unauthenticated bridge call. */
export function isPrivilegedSupabaseKey(key: string | null | undefined): boolean {
  if (!key) return false;
  if (key.startsWith('sb_secret_')) return true;

  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded)) as { role?: unknown };
    return payload.role === 'service_role' || payload.role === 'supabase_admin';
  } catch {
    // An opaque publishable key is expected to be non-JWT. Unknown malformed
    // values are not elevated merely because they cannot be decoded.
    return false;
  }
}

export interface ExternalPublicKeyInput {
  configuredPublicKey?: string | null;
  externalKey?: string | null;
  incomingApiKey?: string | null;
  sameProject: boolean;
}

/**
 * Resolve a least-privilege key for public token RPCs.
 *
 * A configured external publishable key wins. If the bridge targets the same
 * Supabase project, the browser's publishable `apikey` is also valid. As a
 * backwards-compatible last resort, EXTERNAL_DB_KEY may be used only when it
 * is demonstrably non-privileged. Privileged candidates fail closed.
 */
export function resolveExternalPublicKey(input: ExternalPublicKeyInput): string | null {
  const candidates = [
    input.configuredPublicKey,
    input.sameProject ? input.incomingApiKey : null,
    input.externalKey,
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && !isPrivilegedSupabaseKey(value)) return value;
  }
  return null;
}
