import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, CheckCircle2, Link2, RefreshCw, Inbox } from 'lucide-react';
import { useContratosVencendo, type SeveridadeContrato } from '@/hooks/useContratosVencendo';
import { TIPO_CONTRATO_LABELS, type TipoContrato } from '@/services/contratoTemplateService';

const SEV_BADGE: Record<SeveridadeContrato, { label: string; variant: 'destructive' | 'secondary' | 'outline' | 'default' }> = {
  vencido: { label: 'Vencido', variant: 'destructive' },
  critico: { label: 'Crítico', variant: 'destructive' },
  atencao: { label: 'Atenção', variant: 'secondary' },
  ok: { label: 'Em dia', variant: 'outline' },
};

function fmtDias(d: number): string {
  if (d < 0) return `Vencido há ${Math.abs(d)} dia(s)`;
  if (d === 0) return 'Vence hoje';
  if (d === 1) return 'Vence amanhã';
  return `Vence em ${d} dias`;
}

export function ContratosVencendoPanel() {
  const { contratos, resumo, isLoading, isError, refetch, gerarLink } = useContratosVencendo();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Contratos vencendo</CardTitle>
          </div>
          <CardDescription>
            CLT Art. 445 — contratos por prazo determinado convertem em indeterminados se ultrapassarem o fim previsto.
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading}
          aria-label="Atualizar lista"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPIs de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <ResumoCard label="Vencidos" value={resumo.vencido} tone="destructive" icon={<AlertTriangle className="h-4 w-4" />} />
          <ResumoCard label="Críticos (≤3d)" value={resumo.critico} tone="destructive" icon={<AlertTriangle className="h-4 w-4" />} />
          <ResumoCard label="Atenção (≤7d)" value={resumo.atencao} tone="secondary" icon={<Clock className="h-4 w-4" />} />
          <ResumoCard label="Em dia" value={resumo.ok} tone="muted" icon={<CheckCircle2 className="h-4 w-4" />} />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : isError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Não foi possível carregar a lista de contratos.
          </div>
        ) : contratos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Inbox className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">Nenhum contrato com prazo cadastrado.</p>
            <p className="text-xs">Contratos indeterminados não aparecem aqui.</p>
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {contratos.map((c) => {
              const sev = SEV_BADGE[c.severidade];
              const tipoLabel = TIPO_CONTRATO_LABELS[c.tipo_contrato as TipoContrato] ?? c.tipo_contrato;
              const podeGerarLink = c.status !== 'assinado' && c.status !== 'cancelado';
              return (
                <li key={c.id} className="p-3 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={sev.variant}>{sev.label}</Badge>
                      {c.prorrogado && <Badge variant="outline">Prorrogado</Badge>}
                      <span className="text-sm font-medium truncate">{c.template_nome}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tipoLabel} · Fim: {new Date(c.data_fim).toLocaleDateString('pt-BR')} ·{' '}
                      <span className={c.severidade === 'vencido' || c.severidade === 'critico' ? 'text-destructive font-medium' : ''}>
                        {fmtDias(c.dias_para_vencer)}
                      </span>
                    </p>
                  </div>
                  {podeGerarLink && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => gerarLink.mutate(c.id)}
                      disabled={gerarLink.isPending}
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      Link de assinatura
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ResumoCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: 'destructive' | 'secondary' | 'muted';
  icon: React.ReactNode;
}) {
  const toneClass =
    tone === 'destructive'
      ? 'border-destructive/40 bg-destructive/5 text-destructive'
      : tone === 'secondary'
        ? 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400'
        : 'border-border bg-muted/40 text-muted-foreground';
  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs">{icon}<span>{label}</span></div>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
