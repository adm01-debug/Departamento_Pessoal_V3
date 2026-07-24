import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp, FileSignature, Clock, XCircle, CheckCircle2, Mail, RefreshCw, Ban, CalendarPlus, History,
} from 'lucide-react';
import { useContratosAssinaturaKPI } from '@/hooks/useContratosAssinaturaKPI';
import { ContratoTokenTimelineDialog } from './ContratoTokenTimelineDialog';

function fmtHoras(h: number | null): string {
  if (h == null) return '—';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
}

export function ContratosAssinaturaKPICard() {
  const { kpi, pendentes, revogar, reenviar, estender } = useContratosAssinaturaKPI();
  const [timelineTokenId, setTimelineTokenId] = useState<string | null>(null);


  if (kpi.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversão de assinaturas</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const k = kpi.data;
  const tokensPendentes = pendentes.data ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>Conversão de assinaturas</CardTitle>
        </div>
        <CardDescription>
          KPIs de tokens de assinatura de contratos e follow-up automático (D+2, D+5, D-1).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileSignature className="h-3.5 w-3.5" /> Gerados
            </div>
            <div className="mt-1 text-2xl font-semibold">{k?.tokens_gerados ?? 0}</div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Assinados
            </div>
            <div className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {k?.tokens_assinados ?? 0}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5" /> Pendentes
            </div>
            <div className="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-400">
              {k?.tokens_pendentes ?? 0}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <XCircle className="h-3.5 w-3.5" /> Expirados
            </div>
            <div className="mt-1 text-2xl font-semibold text-destructive">
              {k?.tokens_expirados ?? 0}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Conversão
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {k?.taxa_conversao_pct != null ? `${k.taxa_conversao_pct}%` : '—'}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Tempo médio: {fmtHoras(k?.tempo_medio_assinatura_h ?? null)}
            </div>
          </div>
        </div>

        {tokensPendentes.length > 0 && (
          <div className="rounded-lg border">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <div className="text-sm font-medium">Pendentes aguardando assinatura</div>
              <Badge variant="secondary">{tokensPendentes.length}</Badge>
            </div>
            <ul className="max-h-64 divide-y overflow-y-auto">
              {tokensPendentes.slice(0, 15).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {t.colaborador_nome ?? 'Colaborador'}
                      {t.tipo_contrato && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          · {t.tipo_contrato.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Enviado há {t.dias_desde_geracao}d</span>
                      <span>·</span>
                      <span>Expira em {t.dias_para_expirar}d</span>
                      {t.reminders_enviados > 0 && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {t.reminders_enviados} lembrete(s)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={t.dias_para_expirar <= 1 ? 'destructive' : t.dias_para_expirar <= 3 ? 'secondary' : 'outline'}
                    >
                      {t.dias_para_expirar <= 1 ? 'Urgente' : t.dias_para_expirar <= 3 ? 'Crítico' : 'Ativo'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => setTimelineTokenId(t.id)}
                      title="Ver trilha de auditoria"
                    >
                      <History className="h-3 w-3" /> Histórico
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 px-2 text-xs"
                      disabled={reenviar.isPending}
                      onClick={() => reenviar.mutate({ contratoId: t.contrato_id, tokenIdAntigo: t.id })}
                      title="Revoga o link atual e gera um novo"
                    >
                      <RefreshCw className="h-3 w-3" /> Reenviar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 px-2 text-xs"
                      disabled={estender.isPending}
                      onClick={() => {
                        const raw = window.prompt('Estender prazo em quantos dias? (1 a 30)', '7');
                        if (raw === null) return;
                        const dias = Number.parseInt(raw, 10);
                        if (!Number.isFinite(dias) || dias < 1 || dias > 30) {
                          return;
                        }
                        estender.mutate({ tokenId: t.id, dias });
                      }}
                      title="Estende a validade do link atual"
                    >
                      <CalendarPlus className="h-3 w-3" /> Estender
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                      disabled={revogar.isPending}
                      onClick={() => {
                        const motivo = window.prompt('Motivo da revogação (opcional):') ?? undefined;
                        if (motivo === null) return;
                        revogar.mutate({ tokenId: t.id, motivo });
                      }}
                    >
                      <Ban className="h-3 w-3" /> Revogar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      <ContratoTokenTimelineDialog
        tokenId={timelineTokenId}
        open={!!timelineTokenId}
        onOpenChange={(o) => !o && setTimelineTokenId(null)}
      />
    </Card>
  );
}

