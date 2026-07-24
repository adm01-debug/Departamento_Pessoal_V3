/**
 * FeriasReconciliacaoHistoricoCard — observabilidade do cron self-healing
 * `reconciliar_ferias_folha_batch` (03:15 BRT). Exibe as últimas execuções,
 * KPIs de SLA e alerta visual quando o SLA cai abaixo de 80%.
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { History, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useReconciliacaoLogs } from '@/hooks/ferias/useReconciliacaoLogs';

const SLA_ALERT_THRESHOLD = 80;

export function FeriasReconciliacaoHistoricoCard() {
  const { data, isLoading } = useReconciliacaoLogs(10);

  const resumo = useMemo(() => {
    if (!data || data.length === 0) return null;
    const total = data.length;
    const consistentes = data.filter((l) => l.restantes === 0).length;
    const corrigidas = data.reduce((s, l) => s + (l.corrigidas ?? 0), 0);
    const duracaoMedia = Math.round(
      data.reduce((s, l) => s + (l.duracao_ms ?? 0), 0) / total,
    );
    const sla = Math.round((consistentes / total) * 100);
    return { total, consistentes, corrigidas, duracaoMedia, sla };
  }, [data]);

  const slaCritico = resumo !== null && resumo.sla < SLA_ALERT_THRESHOLD;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" aria-hidden />
          Reconciliação Automática — Histórico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aguardando a primeira execução do cron diário (03:15 BRT).
          </p>
        ) : (
          <>
            {slaCritico && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" aria-hidden />
                <AlertTitle>SLA de reconciliação abaixo do alvo</AlertTitle>
                <AlertDescription>
                  Últimas {resumo!.total} execuções fecharam em {resumo!.sla}% (alvo ≥ {SLA_ALERT_THRESHOLD}%).
                  Investigue os logs com pendências e valide o cron `reconciliar_ferias_folha_batch`.
                </AlertDescription>
              </Alert>
            )}
            <ul className="divide-y">
              {data.slice(0, 5).map((log) => {
                const ok = log.restantes === 0;
                const Icon = ok ? CheckCircle2 : AlertTriangle;
                return (
                  <li key={log.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon
                          className={`w-4 h-4 ${ok ? 'text-emerald-500' : 'text-amber-500'}`}
                          aria-hidden
                        />
                        <Badge variant={ok ? 'secondary' : 'destructive'}>
                          {ok ? 'Consistente' : `${log.restantes} pendente(s)`}
                        </Badge>
                        <span className="text-sm font-medium">
                          {new Date(log.executado_em).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Verificadas {log.verificadas} · Corrigidas {log.corrigidas} · Duração {log.duracao_ms} ms
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {resumo && (
              <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">SLA (últ. {resumo.total})</p>
                  <p className={`font-semibold text-sm ${slaCritico ? 'text-destructive' : ''}`}>
                    {resumo.sla}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Consistentes</p>
                  <p className="font-semibold text-sm">{resumo.consistentes}/{resumo.total}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Auto-corrigidas</p>
                  <p className="font-semibold text-sm">{resumo.corrigidas}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duração média</p>
                  <p className="font-semibold text-sm">{resumo.duracaoMedia} ms</p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
