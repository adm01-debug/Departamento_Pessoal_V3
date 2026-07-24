import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HealthSample {
  at: number;
  latencyMs: number | null;
  status: 'online' | 'slow' | 'offline';
}

/**
 * Polling health monitor com histórico das últimas N amostras em memória.
 * Não persiste em DB — só serve para o operador humano ver tendência.
 */
export function useSystemHealthHistory(pollMs = 60_000, keep = 20) {
  const [samples, setSamples] = useState<HealthSample[]>([]);
  const running = useRef(false);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      if (running.current) return;
      running.current = true;
      const start = performance.now();
      let sample: HealthSample = { at: Date.now(), latencyMs: null, status: 'offline' };
      try {
        const { error } = await supabase
          .from('versao_banco')
          .select('versao')
          .limit(1)
          .maybeSingle();
        const dur = Math.round(performance.now() - start);
        if (error) sample = { at: Date.now(), latencyMs: dur, status: 'offline' };
        else if (dur > 800) sample = { at: Date.now(), latencyMs: dur, status: 'slow' };
        else sample = { at: Date.now(), latencyMs: dur, status: 'online' };
      } catch {
        sample = { at: Date.now(), latencyMs: null, status: 'offline' };
      } finally {
        running.current = false;
      }
      if (mounted) {
        setSamples((prev) => [...prev, sample].slice(-keep));
      }
    };
    tick();
    const id = setInterval(tick, pollMs);
    return () => { mounted = false; clearInterval(id); };
  }, [pollMs, keep]);

  const last = samples[samples.length - 1];
  const valid = samples.filter((s) => s.latencyMs != null);
  const p95 = (() => {
    if (!valid.length) return null;
    const arr = valid.map((s) => s.latencyMs as number).sort((a, b) => a - b);
    return arr[Math.floor(arr.length * 0.95)];
  })();
  const avg = valid.length
    ? Math.round(valid.reduce((s, x) => s + (x.latencyMs as number), 0) / valid.length)
    : null;
  const failRate = samples.length
    ? samples.filter((s) => s.status === 'offline').length / samples.length
    : 0;

  return { samples, last, p95, avg, failRate };
}
