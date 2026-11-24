// Runtime validation for the service-role RPC consumed before password auth.
// A malformed or absent response must never turn into a lockout bypass.

export interface LockoutState {
  isLocked: boolean;
  lockedUntil: string | null;
}

export function parseLockoutState(value: unknown): LockoutState | null {
  if (!Array.isArray(value) || value.length !== 1) return null;

  const row = value[0];
  if (typeof row !== 'object' || row === null) return null;
  const record = row as Record<string, unknown>;
  const isLocked = record.is_locked;
  const lockedUntil = record.locked_until;

  if (typeof isLocked !== 'boolean') return null;
  if (lockedUntil !== null && typeof lockedUntil !== 'string') return null;
  // The lockout function returns no timestamp for an unlocked account. Treat
  // any contradictory state as unavailable rather than allowing an attempt.
  if (!isLocked && lockedUntil !== null) return null;

  return { isLocked, lockedUntil: lockedUntil as string | null };
}
