import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL_MS = 60 * 1000; // check every minute
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;

export function useSessionTimeout() {
  // eslint-disable-next-line react-hooks/purity
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logoutInProgressRef = useRef(false);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, resetActivity, { passive: true });
    }

    intervalRef.current = setInterval(async () => {
      if (logoutInProgressRef.current) return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_LIMIT_MS) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          logoutInProgressRef.current = true;
          queryClient.clear();
          try { localStorage.clear(); } catch { /* private browsing */ }
          try { sessionStorage.clear(); } catch { /* private browsing */ }
          try { indexedDB.deleteDatabase('ponto-offline-db'); } catch { /* ignore */ }
          try {
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            }
          } catch { /* caches API unavailable */ }
          await supabase.auth.signOut().catch(() => {});
          window.location.href = '/login?reason=idle_timeout';
        }
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, resetActivity);
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [resetActivity]);
}
