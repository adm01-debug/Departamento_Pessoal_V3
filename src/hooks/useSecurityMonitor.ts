import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';

const SESSION_FP_KEY = 'dp_session_fp';

function computeSessionFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency?.toString() || '',
  ];
  let hash = 0;
  const str = components.join('|');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

function forceLogout(reason: string) {
  queryClient.clear();
  try { localStorage.clear(); } catch { /* private browsing */ }
  try { sessionStorage.clear(); } catch { /* private browsing */ }
  try { indexedDB.deleteDatabase('ponto-offline-db'); } catch { /* ignore */ }
  if ('caches' in window) {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).catch(() => {});
  }
  (supabase as any).auth.signOut().catch(() => {});
  window.location.href = `/login?reason=${encodeURIComponent(reason)}`;
}

export function useSecurityMonitor() {
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = (supabase as any).auth.onAuthStateChange(
      (_event: string, session: any) => {
        if (!session?.user?.id) {
          lastUserId.current = null;
          return;
        }

        const currentId = session.user.id;

        // Detect unexpected user change mid-session (potential session fixation)
        if (lastUserId.current && lastUserId.current !== currentId) {
          forceLogout('session_anomaly');
          return;
        }

        lastUserId.current = currentId;

        // Session fingerprint binding — detect token theft across browsers
        const currentFp = computeSessionFingerprint();
        const storedFp = sessionStorage.getItem(SESSION_FP_KEY);

        if (!storedFp) {
          sessionStorage.setItem(SESSION_FP_KEY, currentFp);
        } else if (storedFp !== currentFp) {
          forceLogout('session_anomaly');
          return;
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);
}
