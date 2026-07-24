import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, CheckCircle2, XCircle, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useSystemHealthHistory } from '@/hooks/useSystemHealthHistory';
import { bitrixBreaker, resendBreaker, genericBreaker } from '@/lib/circuitBreaker';

type Status = 'idle' | 'running' | 'ok' | 'warn' | 'fail';

interface Check {
  id: string;
  label: string;
  category: 'infra' | 'tabelas' | 'edge' | 'cron' | 'storage';
  status: Status;
  detail?: string;
}

const CRITICAL_TABLES = ['colaboradores', 'empresas', 'user_roles', 'folhas_pagamento', 'profiles'];
const EDGE_FUNCTIONS = ['healthcheck', 'metricas', 'external-db-bridge'];
const EXPECTED_BUCKETS = [
  'afastamentos', 'assinaturas', 'avatars', 'comprovantes-despesas',
  'contabilidade-anexos', 'contratacao', 'documentos', 'documentos-admissao',
  'documentos-colaboradores', 'ponto-biometria', 'recrutamento-curriculos',
  'relatorios-privados', 'sst-programas',
];
const EXPECTED_CRON_JOBS = [
  'audit-archive-retention-daily', 'audit-log-monthly-purge', 'check-idempotency-anomalies',
  'cleanup-govbr-states-daily', 'cleanup-logs-sistema-daily', 'cleanup-security-logs',
  'gerar-alertas-preditivos-ia', 'lgpd-cleanup-queue-daily', 'lgpd-retention-dry-run',
  'log-retention-daily', 'purge-idempotency-daily', 'purge-lock-conflicts-daily',
  'purge-security-data-hourly', 'status-anomalies-scan', 'weekly-analyze-critical',
];

const initialChecks = (): Check[] => [
  { id: 'env', label: 'VITE_SUPABASE_URL definida', category: 'infra', status: 'idle' },
  { id: 'auth', label: 'Sessão Auth acessível', category: 'infra', status: 'idle' },
  ...CRITICAL_TABLES.map<Check>((t) => ({
    id: `tab:${t}`, label: `Tabela ${t} acessível`, category: 'tabelas', status: 'idle',
  })),
  ...EDGE_FUNCTIONS.map<Check>((f) => ({
    id: `fn:${f}`, label: `Edge function ${f}`, category: 'edge', status: 'idle',
  })),
  { id: 'cron', label: `Cron jobs (${EXPECTED_CRON_JOBS.length} esperados)`, category: 'cron', status: 'idle' },
  { id: 'storage', label: `Buckets (${EXPECTED_BUCKETS.length} esperados)`, category: 'storage', status: 'idle' },
];

export default function AdminDiagnosticoMigracaoPage() {
  const [checks, setChecks] = useState<Check[]>(initialChecks());
  const [running, setRunning] = useState(false);
  const [breakers, setBreakers] = useState(() => ({
    bitrix: bitrixBreaker.snapshot(),
    resend: resendBreaker.snapshot(),
    generic: genericBreaker.snapshot(),
  }));
  const health = useSystemHealthHistory(60_000, 20);

  const refreshBreakers = () =>
    setBreakers({
      bitrix: bitrixBreaker.snapshot(),
      resend: resendBreaker.snapshot(),
      generic: genericBreaker.snapshot(),
    });

  const update = (id: string, patch: Partial<Check>) =>
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const run = async () => {
    setRunning(true);
    setChecks(initialChecks().map((c) => ({ ...c, status: 'running' as Status })));

    // 1. env
    const url = import.meta.env.VITE_SUPABASE_URL;
    update('env', url
      ? { status: 'ok', detail: String(url) }
      : { status: 'fail', detail: 'não definida' });

    // 2. auth session
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) update('auth', { status: 'fail', detail: error.message });
      else update('auth', { status: 'ok', detail: data.session ? 'logado' : 'sem sessão (esperado se anônimo)' });
    } catch (e) {
      update('auth', { status: 'fail', detail: (e as Error).message });
    }

    // 3. tabelas críticas — head + count + latência
    await Promise.all(CRITICAL_TABLES.map(async (t) => {
      const start = performance.now();
      try {
        const { error, count } = await (supabase.from(t) as any)
          .select('*', { count: 'exact', head: true })
          .limit(1);
        const ms = Math.round(performance.now() - start);
        if (error) update(`tab:${t}`, { status: 'fail', detail: error.message });
        else update(`tab:${t}`, { status: 'ok', detail: `${count ?? 0} regs • ${ms}ms` });
      } catch (e) {
        update(`tab:${t}`, { status: 'fail', detail: (e as Error).message });
      }
    }));

    // 4. edge functions (com latência)
    await Promise.all(EDGE_FUNCTIONS.map(async (fn) => {
      const start = performance.now();
      try {
        const { data, error } = await supabase.functions.invoke(fn, { body: {} });
        const ms = Math.round(performance.now() - start);
        if (error) {
          const status = /404|not found/i.test(error.message) ? 'fail' : 'warn';
          update(`fn:${fn}`, { status, detail: `${ms}ms · ${error.message}` });
        } else {
          update(`fn:${fn}`, { status: 'ok', detail: `${ms}ms · ${typeof data === 'object' ? 'resposta ok' : String(data).slice(0, 40)}` });
        }
      } catch (e) {
        update(`fn:${fn}`, { status: 'fail', detail: (e as Error).message });
      }
    }));

    // 5. cron jobs — comparar com allowlist esperada
    try {
      const { data, error } = await (supabase as any).rpc('cron_job_list_diag', {});
      if (error) {
        update('cron', { status: 'warn', detail: 'RPC cron_job_list_diag ausente (opcional)' });
      } else {
        const names = new Set<string>(
          Array.isArray(data)
            ? data.map((j: any) => String(j.jobname || j.name || '').trim()).filter(Boolean)
            : [],
        );
        const missing = EXPECTED_CRON_JOBS.filter((j) => !names.has(j));
        if (missing.length === 0) {
          update('cron', { status: 'ok', detail: `${names.size} jobs (todos esperados presentes)` });
        } else {
          update('cron', {
            status: missing.length === EXPECTED_CRON_JOBS.length ? 'fail' : 'warn',
            detail: `faltando: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ` (+${missing.length - 3})` : ''}`,
          });
        }
      }
    } catch (e) {
      update('cron', { status: 'warn', detail: (e as Error).message });
    }

    // 6. storage buckets — comparar com allowlist esperada
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) {
        update('storage', { status: 'fail', detail: error.message });
      } else {
        const names = new Set((data || []).map((b: any) => b.name));
        const missing = EXPECTED_BUCKETS.filter((b) => !names.has(b));
        if (missing.length === 0) {
          update('storage', { status: 'ok', detail: `${names.size} buckets (todos presentes)` });
        } else {
          update('storage', {
            status: 'warn',
            detail: `faltando: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ` (+${missing.length - 3})` : ''}`,
          });
        }
      }
    } catch (e) {
      update('storage', { status: 'fail', detail: (e as Error).message });
    }

    refreshBreakers();
    setRunning(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- diagnóstico dispara uma vez no mount; run() é assíncrono
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- executar apenas no mount
  }, []);

  const grouped = {
    infra: checks.filter((c) => c.category === 'infra'),
    tabelas: checks.filter((c) => c.category === 'tabelas'),
    edge: checks.filter((c) => c.category === 'edge'),
    cron: checks.filter((c) => c.category === 'cron'),
    storage: checks.filter((c) => c.category === 'storage'),
  };

  const counts = checks.reduce(
    (acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }),
    {} as Record<Status, number>,
  );

  return (
    <>
      <PageTitle title="Diagnóstico da Migração" description="Sanity-check pós-cutover Supabase" />
      <PageLayout
        title="Diagnóstico da Migração"
        description="Valida se o novo projeto responde a queries, edge functions, cron jobs, storage e integrações"
        icon={<Activity className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-primary/60"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <Badge variant="outline" className="text-emerald-600 border-emerald-600/40">
              OK {counts.ok ?? 0}
            </Badge>
            <Badge variant="outline" className="text-amber-600 border-amber-600/40">
              Alerta {counts.warn ?? 0}
            </Badge>
            <Badge variant="outline" className="text-destructive border-destructive/40">
              Falha {counts.fail ?? 0}
            </Badge>
          </div>
          <Button onClick={run} disabled={running} size="sm">
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Rodar novamente
          </Button>
        </div>

        {/* Health monitor persistente */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Monitor de saúde contínuo (últimas {health.samples.length}/20 amostras)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
              <Stat label="Status atual" value={health.last?.status ?? '—'} tone={health.last?.status === 'online' ? 'ok' : health.last?.status === 'slow' ? 'warn' : 'fail'} />
              <Stat label="Última latência" value={health.last?.latencyMs != null ? `${health.last.latencyMs}ms` : '—'} />
              <Stat label="p95" value={health.p95 != null ? `${health.p95}ms` : '—'} />
              <Stat label="Taxa de falha" value={`${Math.round(health.failRate * 100)}%`} tone={health.failRate > 0.1 ? 'fail' : health.failRate > 0 ? 'warn' : 'ok'} />
            </div>
            {/* Sparkline em barras — sem depender de lib */}
            <div className="flex items-end gap-1 h-12">
              {health.samples.map((s, i) => {
                const h = s.latencyMs ? Math.min(100, (s.latencyMs / 1000) * 100) : 100;
                const color = s.status === 'online' ? 'bg-emerald-500'
                  : s.status === 'slow' ? 'bg-amber-500' : 'bg-destructive';
                return <div key={i} className={`flex-1 rounded-t ${color}`} style={{ height: `${h}%` }} title={`${new Date(s.at).toLocaleTimeString()} • ${s.latencyMs ?? '—'}ms • ${s.status}`} />;
              })}
              {health.samples.length === 0 && (
                <p className="text-xs text-muted-foreground">aguardando primeira amostra…</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {(['infra', 'tabelas', 'edge', 'cron', 'storage'] as const).map((cat) => (
            <Card key={cat}>
              <CardHeader>
                <CardTitle className="capitalize text-base">{cat}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {grouped[cat].map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
                    <div className="flex items-start gap-2 min-w-0">
                      <StatusIcon status={c.status} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.label}</p>
                        {c.detail && (
                          <p className="text-xs text-muted-foreground truncate">{c.detail}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {/* Circuit breakers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Circuit breakers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(['bitrix', 'resend', 'generic'] as const).map((k) => {
                const b = breakers[k];
                const tone = b.state === 'CLOSED' ? 'ok' : b.state === 'HALF_OPEN' ? 'warn' : 'fail';
                return (
                  <div key={k} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={tone as Status} />
                      <p className="text-sm font-medium capitalize">{k}Breaker</p>
                      <Badge variant="outline" className="text-xs">{b.state}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {b.failureCount}/{b.threshold} falhas
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (k === 'bitrix') bitrixBreaker.reset();
                          if (k === 'resend') resendBreaker.reset();
                          if (k === 'generic') genericBreaker.reset();
                          refreshBreakers();
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6 text-sm space-y-2">
            <p className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Como usar este diagnóstico
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Falhas em <strong>tabelas</strong> → schema/dados não restaurados no novo projeto.</li>
              <li>Falhas em <strong>edge functions</strong> → rode <code>scripts/deploy-functions-novo-projeto.sh</code>.</li>
              <li>Alerta em <strong>cron</strong> → aplique <code>03_cron_jobs.sql</code> no SQL Editor.</li>
              <li>Alerta em <strong>storage</strong> → aplique <code>01_storage_buckets.sql</code> + <code>02_storage_policies.sql</code>.</li>
              <li>Rollback rápido: veja <code>docs/ROLLBACK_DRILL.md</code>.</li>
            </ul>
          </CardContent>
        </Card>
      </PageLayout>
    </>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === 'ok') return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />;
  if (status === 'fail') return <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />;
  if (status === 'warn') return <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />;
  if (status === 'running') return <Loader2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 animate-spin" />;
  return <div className="h-4 w-4 rounded-full bg-muted shrink-0 mt-0.5" />;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' | 'fail' }) {
  const color = tone === 'ok' ? 'text-emerald-600'
    : tone === 'warn' ? 'text-amber-600'
    : tone === 'fail' ? 'text-destructive' : '';
  return (
    <div className="rounded-lg border border-border/40 p-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
