import { useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSystemHealthHistory, type HealthSample } from '@/hooks/useSystemHealthHistory';
import { toast } from 'sonner';

const STORAGE_KEY = 'health-trend-samples-v1';
const KEEP = 20;

/**
 * Etapa 10 — observabilidade contínua no dashboard admin.
 * Reutiliza `useSystemHealthHistory` e persiste em sessionStorage para
 * sobreviver a HMR/refresh curto. Alerta via toast quando failRate > 20%
 * em janela de 5 amostras.
 *
 * Tokens semânticos apenas — cores de status ficam confinadas ao sparkline
 * (bg-emerald-500/amber-500/destructive) por serem semanticamente indicativas.
 */
export function HealthTrendCard() {
  const { samples, last, p95, avg, failRate } = useSystemHealthHistory(60_000, KEEP);
  const warnedRef = useRef(false);

  // Persistência sessionStorage — melhor esforço, silencia falhas de storage.
  useEffect(() => {
    if (!samples.length) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(samples.slice(-KEEP)));
    } catch {
      /* storage indisponível — ignore */
    }
  }, [samples]);

  // Alerta ao operador se janela recente estiver degradada.
  useEffect(() => {
    const recent = samples.slice(-5);
    if (recent.length < 5) return;
    const bad = recent.filter((s) => s.status === 'offline').length;
    const rate = bad / recent.length;
    if (rate > 0.2 && !warnedRef.current) {
      warnedRef.current = true;
      toast.error('Bridge instável', {
        description: `${Math.round(rate * 100)}% de falhas nas últimas 5 amostras`,
      });
    } else if (rate === 0) {
      warnedRef.current = false;
    }
  }, [samples]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Saúde da bridge — últimas {samples.length}/{KEEP} amostras
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
          <Stat label="Status" value={last?.status ?? '—'} tone={statusTone(last)} />
          <Stat
            label="Latência"
            value={last?.latencyMs != null ? `${last.latencyMs}ms` : '—'}
          />
          <Stat label="p95" value={p95 != null ? `${p95}ms` : '—'} />
          <Stat
            label="Falhas"
            value={`${Math.round(failRate * 100)}%`}
            tone={failRate > 0.1 ? 'fail' : failRate > 0 ? 'warn' : 'ok'}
          />
        </div>
        <Sparkline samples={samples} />
        {avg != null && (
          <p className="text-xs text-muted-foreground mt-2">
            Média: {avg}ms · polling a cada 60s
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function statusTone(s: HealthSample | undefined): 'ok' | 'warn' | 'fail' | undefined {
  if (!s) return undefined;
  if (s.status === 'online') return 'ok';
  if (s.status === 'slow') return 'warn';
  return 'fail';
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'ok' | 'warn' | 'fail';
}) {
  const toneClass =
    tone === 'ok'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'warn'
        ? 'text-amber-600 dark:text-amber-400'
        : tone === 'fail'
          ? 'text-destructive'
          : 'text-foreground';
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function Sparkline({ samples }: { samples: HealthSample[] }) {
  if (!samples.length) {
    return (
      <div className="flex items-center justify-center h-12 text-xs text-muted-foreground">
        Aguardando primeira amostra…
      </div>
    );
  }
  return (
    <div className="flex items-end gap-1 h-12">
      {samples.map((s, i) => {
        const h = s.latencyMs ? Math.min(100, (s.latencyMs / 1000) * 100) : 100;
        const color =
          s.status === 'online'
            ? 'bg-emerald-500'
            : s.status === 'slow'
              ? 'bg-amber-500'
              : 'bg-destructive';
        return (
          <div
            key={i}
            className={`flex-1 rounded-t ${color}`}
            style={{ height: `${Math.max(6, h)}%` }}
            title={`${new Date(s.at).toLocaleTimeString()} • ${s.latencyMs ?? '—'}ms • ${s.status}`}
          />
        );
      })}
    </div>
  );
}
