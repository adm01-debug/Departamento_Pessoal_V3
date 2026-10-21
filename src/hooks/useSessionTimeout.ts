import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';
import { IDLE_ACTIVITY_KEY, limparSessaoLocal } from '@/lib/sessaoLocal';

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL_MS = 60 * 1000; // check every minute
const ACTIVITY_PERSIST_INTERVAL_MS = 2_000;
const SIGN_OUT_TIMEOUT_MS = 3_000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;

function lerAtividadePersistida(): number {
  try {
    const valor = Number(localStorage.getItem(IDLE_ACTIVITY_KEY) ?? 0);
    return Number.isFinite(valor) && valor > 0 ? valor : 0;
  } catch {
    return 0;
  }
}

export function useSessionTimeout() {
  // eslint-disable-next-line react-hooks/purity
  const lastActivityRef = useRef(Date.now());
  const lastPersistRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logoutInProgressRef = useRef(false);

  const resetActivity = useCallback(() => {
    const agora = Date.now();
    lastActivityRef.current = agora;
    // Persistir com throttle permite que OUTRAS ABAS também contem a atividade
    // sem escrever no localStorage a cada evento de scroll/mouse.
    if (agora - lastPersistRef.current < ACTIVITY_PERSIST_INTERVAL_MS) return;
    lastPersistRef.current = agora;
    try {
      localStorage.setItem(IDLE_ACTIVITY_KEY, String(agora));
    } catch {
      /* private browsing / storage indisponível */
    }
  }, []);

  useEffect(() => {
    // Uma aba não pode considerar o usuário inativo se ele está trabalhando em
    // outra aba do mesmo app. O evento `storage` só chega nas outras abas.
    const sincronizarAtividadeEntreAbas = (event: StorageEvent) => {
      if (event.key !== IDLE_ACTIVITY_KEY || !event.newValue) return;
      const valor = Number(event.newValue);
      if (!Number.isFinite(valor) || valor <= 0) return;
      lastActivityRef.current = Math.max(lastActivityRef.current, Math.min(valor, Date.now()));
    };

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, resetActivity, { passive: true });
    }
    window.addEventListener('storage', sincronizarAtividadeEntreAbas);

    // Se outra aba registrou atividade recente antes desta montar, respeita o
    // timestamp (limitado a agora para não sofrer com relógio adiantado).
    const persistida = lerAtividadePersistida();
    if (persistida > 0) {
      lastActivityRef.current = Math.max(lastActivityRef.current, Math.min(persistida, Date.now()));
    }

    intervalRef.current = setInterval(async () => {
      if (logoutInProgressRef.current) return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed < INACTIVITY_LIMIT_MS) return;

      let session;
      try {
        ({
          data: { session },
        } = await supabase.auth.getSession());
      } catch {
        // Falha transitória ao ler a sessão não deve deslogar o usuário.
        return;
      }
      if (!session) return;

      logoutInProgressRef.current = true;
      queryClient.clear();

      // Tenta revogar a sessão no servidor, mas não deixa uma falha de rede
      // impedir a saída local: após 3s segue com a limpeza local.
      await Promise.race([
        supabase.auth.signOut().catch(() => undefined),
        new Promise<void>((resolve) => window.setTimeout(resolve, SIGN_OUT_TIMEOUT_MS)),
      ]);

      // Remove somente token/verifier do Supabase e fingerprint — nunca
      // localStorage.clear(), que apagaria rascunhos e a fila offline do ponto.
      limparSessaoLocal();
      window.location.replace('/login?reason=idle_timeout');
    }, CHECK_INTERVAL_MS);

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, resetActivity);
      }
      window.removeEventListener('storage', sincronizarAtividadeEntreAbas);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [resetActivity]);
}
