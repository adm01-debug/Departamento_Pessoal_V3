import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSecureVisibility() {
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const { data: { session } } = await (supabase as any).auth.getSession();
        if (session) {
          const expiresAt = session.expires_at ?? 0;
          const now = Math.floor(Date.now() / 1000);
          if (expiresAt - now < 300) {
            await (supabase as any).auth.refreshSession();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
}
