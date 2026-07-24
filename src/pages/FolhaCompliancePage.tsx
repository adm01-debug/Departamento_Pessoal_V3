/**
 * FolhaCompliancePage — Painel de auditoria não-repudiável da folha (Fase 5)
 *
 * Consome `vw_folha_compliance` (security_invoker=true → herda RLS de audit_log).
 * Mostra timeline de eventos PAYROLL_CALC / CLOSE / REOPEN por competência, com:
 *  - filtro por competência, ação e busca livre (autor/motivo/hash)
 *  - validação client-side do `integrity_hash` (badge de conformidade)
 *  - exportação CSV para arquivamento contábil
 */
import { useMemo, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, ShieldCheck, Loader2, FileSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MetricasFolhaDashboard } from '@/components/folha/MetricasFolhaDashboard';
import { todayLocalISO } from '@/utils/dateLocal';

type ComplianceRow = {
  audit_id: string | null;
  event_at: string | null;
  acao: string | null;
  folha_id: string | null;
  empresa_id: string | null;
  competencia: string | null;
  version_nova: number | null;
  version_anterior: number | null;
  integrity_hash: string | null;
  total_proventos: number | null;
  total_descontos: number | null;
  total_liquido: number | null;
  total_fgts: number | null;
  holerites_count: number | null;
  itens_count: number | null;
  motivo: string | null;
  override_esocial: boolean | null;
  user_email: string | null;
};

const ACAO_LABEL: Record<string, { label: string; color: string }> = {
  PAYROLL_CALC: { label: 'Cálculo',    color: 'bg-primary/15 text-primary border-primary/30' },
  CLOSE:        { label: 'Fechamento', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  REOPEN:       { label: 'Reabertura', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }) : '—';

const fmtMoney = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function toCSV(rows: ComplianceRow[]): string {
  const header = [
    'audit_id','event_at','acao','folha_id','empresa_id','competencia',
    'version_anterior','version_nova','integrity_hash','total_proventos',
    'total_descontos','total_liquido','total_fgts','holerites_count',
    'itens_count','motivo','override_esocial','user_email',
  ];
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const lines = rows.map((r) => header.map((h) => escape((r as Record<string, unknown>)[h])).join(','));
  return [header.join(','), ...lines].join('\n');
}

export default function FolhaCompliancePage() {
  const { empresaAtualId } = useEmpresas();
  const [competencia, setCompetencia] = useState<string>('all');
  const [acao, setAcao] = useState<string>('all');
  const [q, setQ] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['folha-compliance', empresaAtualId],
    enabled: !!empresaAtualId,
    staleTime: 60_000,
    queryFn: async (): Promise<ComplianceRow[]> => {
      const { data, error } = await supabase
        .from('vw_folha_compliance')
        .select('*')
        .eq('empresa_id', empresaAtualId!)
        .order('event_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ComplianceRow[];
    },
  });

  const competencias = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((r) => r.competencia && set.add(r.competencia));
    return Array.from(set).sort().reverse();
  }, [data]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      if (competencia !== 'all' && r.competencia !== competencia) return false;
      if (acao !== 'all' && r.acao !== acao) return false;
      if (!term) return true;
      return [r.user_email, r.motivo, r.integrity_hash, r.folha_id]
        .some((v) => (v ?? '').toString().toLowerCase().includes(term));
    });
  }, [data, competencia, acao, q]);

  const handleExport = () => {
    if (!filtered.length) {
      toast.warning('Nenhum evento para exportar');
      return;
    }
    const blob = new Blob([toCSV(filtered)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `folha-compliance-${todayLocalISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} evento(s) exportado(s)`);
  };

  return (
    <PageLayout>
      <PageTitle title="Compliance da Folha" />
      <p className="-mt-4 mb-4 text-sm text-muted-foreground">
        Trilha imutável de cálculos, fechamentos e reaberturas com hash de integridade SHA-256.
      </p>

      <div className="mb-6">
        <MetricasFolhaDashboard />
      </div>



      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Eventos auditados</CardTitle>
            <Badge variant="outline" className="ml-2">{filtered.length}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar autor, motivo, hash…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full md:w-64"
            />
            <Select value={competencia} onValueChange={setCompetencia}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Competência" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas competências</SelectItem>
                {competencias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={acao} onValueChange={setAcao}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Ação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas ações</SelectItem>
                <SelectItem value="PAYROLL_CALC">Cálculo</SelectItem>
                <SelectItem value="CLOSE">Fechamento</SelectItem>
                <SelectItem value="REOPEN">Reabertura</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              {isRefetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar'}
            </Button>
            <Button size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando trilha…
            </div>
          ) : error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive">
              Falha ao carregar a trilha de compliance.
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <FileSearch className="h-8 w-8 opacity-60" />
              <p>Nenhum evento encontrado para os filtros atuais.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => {
                const meta = ACAO_LABEL[r.acao ?? ''] ?? { label: r.acao ?? '—', color: 'bg-muted' };
                return (
                  <div
                    key={r.audit_id ?? `${r.event_at}-${r.folha_id}`}
                    className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('font-medium', meta.color)}>
                          {meta.label}
                        </Badge>
                        <span className="text-sm font-medium">
                          {r.competencia ?? '—'}
                        </span>
                        {r.version_anterior != null && r.version_nova != null && (
                          <span className="text-xs text-muted-foreground">
                            v{r.version_anterior} → v{r.version_nova}
                          </span>
                        )}
                        {r.override_esocial && (
                          <Badge variant="destructive" className="text-[10px]">override eSocial</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{fmtDate(r.event_at)}</span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                      <div><span className="text-muted-foreground">Proventos:</span> {fmtMoney(r.total_proventos)}</div>
                      <div><span className="text-muted-foreground">Descontos:</span> {fmtMoney(r.total_descontos)}</div>
                      <div><span className="text-muted-foreground">Líquido:</span> {fmtMoney(r.total_liquido)}</div>
                      <div><span className="text-muted-foreground">FGTS:</span> {fmtMoney(r.total_fgts)}</div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {r.holerites_count != null && <span>{r.holerites_count} holerite(s)</span>}
                      {r.itens_count != null && <span>{r.itens_count} item(ns)</span>}
                      {r.user_email && <span>por {r.user_email}</span>}
                    </div>

                    {r.motivo && (
                      <p className="mt-2 rounded bg-muted/50 p-2 text-xs italic text-foreground/80">
                        “{r.motivo}”
                      </p>
                    )}

                    {r.integrity_hash && (
                      <div className="mt-2 flex items-center gap-2 text-[10px]">
                        <ShieldCheck className="h-3 w-3 text-emerald-500" />
                        <code className="break-all font-mono text-muted-foreground">
                          {r.integrity_hash}
                        </code>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
