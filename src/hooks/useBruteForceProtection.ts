import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { loggerService } from '@/services/loggerService';

interface LockState {
  isLocked: boolean;
  remainingSeconds: number;
  attempts: number;
}

const INITIAL: LockState = { isLocked: false, remainingSeconds: 0, attempts: 0 };

// Client-side fallback: if the server RPC is unreachable, block after this many
// local failures to prevent unlimited brute-force during a DB outage.
const LOCAL_MAX_ATTEMPTS = 5;
const LOCAL_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

const LOCAL_KEY = (email: string) =>
  `__bf_${btoa(email.toLowerCase()).replace(/=/g, '')}`;

interface LocalCounter {
  count: number;
  lockedUntil: number; // epoch ms, 0 = not locked
}

function readLocal(email: string): LocalCounter {
  try {
    const raw = sessionStorage.getItem(LOCAL_KEY(email));
    if (!raw) return { count: 0, lockedUntil: 0 };
    return JSON.parse(raw) as LocalCounter;
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function writeLocal(email: string, counter: LocalCounter): void {
  try {
    sessionStorage.setItem(LOCAL_KEY(email), JSON.stringify(counter));
  } catch { /* storage full — silently skip */ }
}

function clearLocal(email: string): void {
  try {
    sessionStorage.removeItem(LOCAL_KEY(email));
  } catch { /* ignore */ }
}

/**
 * Proteção anti-brute-force baseada nas RPCs:
 *  - check_login_lock(p_identifier, p_identifier_type)
 *  - record_failed_login(p_identifier, p_identifier_type)
 *  - reset_login_attempts(p_identifier, p_identifier_type)
 *
 * Regras (server-side): a partir de 5 falhas o identificador é bloqueado
 * por 5 minutos; 7 => 15 min; 10+ => 60 min.
 *
 * Fallback (H20): se o RPC falhar (DB inacessível / timeout), o contador
 * local em sessionStorage impede tentativas ilimitadas enquanto o servidor
 * estiver indisponível — evita que um ataque DoS ao RPC funcione como bypass.
 */
export function useBruteForceProtection() {
  const [lockState, setLockState] = useState<LockState>(INITIAL);

  const checkLock = useCallback(async (email: string): Promise<boolean> => {
    if (!email) return false;

    // Always enforce local fallback first — fast, no network needed.
    const local = readLocal(email);
    if (local.lockedUntil > Date.now()) {
      const remaining = Math.ceil((local.lockedUntil - Date.now()) / 1000);
      setLockState({ isLocked: true, remainingSeconds: remaining, attempts: local.count });
      return true;
    }

    try {
      const { data, error } = await supabase.rpc('check_login_lock', {
        p_identifier: email.toLowerCase(),
        p_identifier_type: 'email',
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const locked = Boolean(row?.is_locked);
      const remaining = Number(row?.remaining_seconds ?? 0);
      setLockState((s) => ({ ...s, isLocked: locked, remainingSeconds: remaining }));
      if (locked) {
        // Mirror server lock into local counter so offline check stays consistent.
        writeLocal(email, { count: local.count, lockedUntil: Date.now() + remaining * 1000 });
      }
      return locked;
    } catch (e) {
      // Server unreachable — fall back to local counter (already checked above).
      // A security warning is emitted so the event appears in the audit trail.
      void loggerService.warn('[bruteForce] checkLock RPC unavailable — using local counter', {
        localAttempts: local.count,
      });
      // If local count already at threshold, treat as locked (fail-closed on RPC failure).
      if (local.count >= LOCAL_MAX_ATTEMPTS) {
        const lockedUntil = Date.now() + LOCAL_LOCKOUT_MS;
        writeLocal(email, { count: local.count, lockedUntil });
        setLockState({ isLocked: true, remainingSeconds: LOCAL_LOCKOUT_MS / 1000, attempts: local.count });
        return true;
      }
      // Below threshold — allow attempt but do NOT silently discard the error.
      return false;
    }
  }, []);

  const recordFailedAttempt = useCallback(async (email: string) => {
    if (!email) return;

    // Always increment local counter immediately (before RPC) so failures during
    // network errors are still counted.
    const local = readLocal(email);
    const newCount = local.count + 1;
    const lockedUntil = newCount >= LOCAL_MAX_ATTEMPTS ? Date.now() + LOCAL_LOCKOUT_MS : 0;
    writeLocal(email, { count: newCount, lockedUntil });

    try {
      const { data, error } = await supabase.rpc('record_failed_login', {
        p_identifier: email.toLowerCase(),
        p_identifier_type: 'email',
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const serverLocked = Boolean(row?.is_locked);
      const serverRemaining = Number(row?.lockout_minutes ?? 0) * 60;
      setLockState({
        attempts: Number(row?.attempts ?? newCount),
        isLocked: serverLocked || lockedUntil > 0,
        remainingSeconds: serverLocked ? serverRemaining : lockedUntil > 0 ? LOCAL_LOCKOUT_MS / 1000 : 0,
      });
    } catch (e) {
      // RPC unavailable — local counter already updated above; reflect in UI state.
      void loggerService.warn('[bruteForce] recordFailedAttempt RPC unavailable', {
        localCount: newCount,
      });
      setLockState({
        attempts: newCount,
        isLocked: lockedUntil > 0,
        remainingSeconds: lockedUntil > 0 ? LOCAL_LOCKOUT_MS / 1000 : 0,
      });
    }
  }, []);

  const resetAttempts = useCallback(async (email: string) => {
    if (!email) return;
    clearLocal(email);
    try {
      const { error } = await supabase.rpc('reset_login_attempts', {
        p_identifier: email.toLowerCase(),
        p_identifier_type: 'email',
      });
      if (error) throw error;
      setLockState(INITIAL);
    } catch (e) {
      // Local counter already cleared; best-effort server reset.
      void loggerService.warn('[bruteForce] resetAttempts RPC unavailable', {});
      setLockState(INITIAL);
    }
  }, []);

  return { lockState, checkLock, recordFailedAttempt, resetAttempts };
}
