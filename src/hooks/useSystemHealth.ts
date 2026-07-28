import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from './useEmpresas';

export function useSystemHealth() {
  const [latency, setLatency] = useState<number | null>(null);
  const [status, setStatus] = useState<'online' | 'slow' | 'offline'>('online');
  const [metrics, setMetrics] = useState<{
    success_rate: number;
    avg_latency: number;
    recent_failures: number;
  } | null>(null);

  const { empresaAtual } = useEmpresas();

  useEffect(() => {
    const checkHealth = async () => {
      const start = performance.now();
      try {
        // 1. Basic Ping for DB Latency
        const { error: pingError } = await supabase.from('versao_banco').select('versao').limit(1).maybeSingle();
        const end = performance.now();
        const duration = Math.round(end - start);

        setLatency(duration);

        // 2. Advanced Metrics from Edge Function
        // Only attempt if authenticated AND has empresaAtual (empresaId required by metricas)
        const { data: { session } } = await supabase.auth.getSession();

        if (session && empresaAtual?.id) {
          try {
            const { data, error: metricsError } = await supabase.functions.invoke('metricas', {
              body: { empresaId: empresaAtual.id }
            });

            if (!metricsError && data?.monitoring) {
              setMetrics(data.monitoring);

              if (data.monitoring.success_rate < 90) setStatus('slow');
              else if (duration > 500) setStatus('slow');
              else setStatus('online');
            } else {
              // metricas failed (400/403/500) — degrade gracefully, ping is enough
              if (pingError) setStatus('offline');
              else if (duration > 500) setStatus('slow');
              else setStatus('online');
            }
          } catch {
            // Network-level failure of metricas — ping is authoritative
            if (pingError) setStatus('offline');
            else if (duration > 500) setStatus('slow');
            else setStatus('online');
          }
        } else {
          // Unauthenticated or no empresa — fallback only to ping
          if (pingError) setStatus('offline');
          else if (duration > 500) setStatus('slow');
          else setStatus('online');
        }

      } catch (e) {
        setStatus('offline');
        setLatency(null);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, [empresaAtual?.id]);

  return { latency, status, metrics };
}

