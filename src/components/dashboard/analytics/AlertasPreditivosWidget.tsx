/**
 * AlertasPreditivosWidget — tela para a edge `alertas-preditivos`.
 *
 * A edge analisa turnover e absenteismo por heuristica sobre o historico
 * (faltas, afastamentos, ponto, desligamentos) e estava publicada sem nenhuma
 * porta de entrada na UI. Este widget e essa porta.
 *
 * Nao dispara sozinho: a edge grava em `notificacoes`, entao o usuario clica.
 * Exige papel de RH ou admin, o mesmo que a edge cobra via `requireRh`.
 */
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Brain, TrendingDown, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaStore } from '@/hooks/useEmpresas';
import { useAlertasPreditivos, type AlertaPreditivo, type NivelAlertaPreditivo } from '@/hooks/useAlertasPreditivos';

const ESTILO_NIVEL: Record<NivelAlertaPreditivo, string> = {
  critica: 'bg-destructive/10 text-destructive border-destructive/30',
  alta: 'bg-warning/10 text-warning border-warning/30',
  media: 'bg-muted text-muted-foreground border-border',
};

const ROTULO_NIVEL: Record<NivelAlertaPreditivo, string> = {
  critica: 'Crítico',
  alta: 'Alto',
  media: 'Médio',
};

function Linha({ alerta, origem }: { alerta: AlertaPreditivo; origem: 'turnover' | 'absenteismo' }) {
  const Icone = origem === 'turnover' ? UserMinus : TrendingDown;
  return (
    <li className="flex items-start gap-2.5 py-2 border-b border-border/30 last:border-0">
      <Icone className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{alerta.nome}</span>
          <Badge variant="outline" className={cn('text-[11px] px-1.5 py-0', ESTILO_NIVEL[alerta.nivel])}>
            {ROTULO_NIVEL[alerta.nivel]}
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {origem === 'turnover' ? 'risco de saída' : 'risco de absenteísmo'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{alerta.justificativa}</p>
      </div>
    </li>
  );
}

export function AlertasPreditivosWidget() {
  const { hasRole, isAdmin } = useAuth();
  const { empresaAtualId, modo } = useEmpresaStore();
  const analise = useAlertasPreditivos();

  const podeAnalisar = isAdmin || hasRole('rh');

  const resultado = analise.data;
  const listas = useMemo(() => {
    const turnover = resultado?.alertasTurnover ?? [];
    const absenteismo = resultado?.alertasAbsenteismo ?? [];
    const ordem: Record<NivelAlertaPreditivo, number> = { critica: 0, alta: 1, media: 2 };
    return {
      turnover: [...turnover].sort((a, b) => ordem[a.nivel] - ordem[b.nivel]),
      absenteismo: [...absenteismo].sort((a, b) => ordem[a.nivel] - ordem[b.nivel]),
    };
  }, [resultado]);

  if (!podeAnalisar) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="preditivos-sem-permissao">
        A análise preditiva é restrita a RH e administradores.
      </p>
    );
  }

  if (modo === 'consolidado' || !empresaAtualId) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="preditivos-sem-empresa">
        Selecione uma empresa específica para analisar. A previsão compara o histórico de uma empresa por vez.
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="alertas-preditivos">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Cruza faltas, afastamentos, ponto e desligamentos para apontar quem corre risco de sair ou de faltar.
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={analise.isPending}
          onClick={() => analise.mutate({ empresaId: empresaAtualId })}
          className="shrink-0"
        >
          <Brain className="h-4 w-4 mr-1.5" aria-hidden="true" />
          {analise.isPending ? 'Analisando…' : resultado ? 'Analisar de novo' : 'Analisar'}
        </Button>
      </div>

      {analise.isPending && (
        <div className="space-y-2" data-testid="preditivos-carregando">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}

      {analise.isError && (
        <Alert variant="destructive" data-testid="preditivos-erro">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>Não foi possível concluir a análise: {analise.error.message}</AlertDescription>
        </Alert>
      )}

      {resultado && !analise.isPending && (
        <>
          {resultado.status === 'sem_colaboradores' ? (
            <p className="text-sm text-muted-foreground" data-testid="preditivos-sem-colaboradores">
              Nenhum colaborador ativo nesta empresa para analisar.
            </p>
          ) : listas.turnover.length === 0 && listas.absenteismo.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="preditivos-vazio">
              Nenhum sinal de risco encontrado em {resultado.totalColaboradores ?? 0} colaborador(es) ativo(s).
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span data-testid="preditivos-total">
                  <strong className="text-foreground">{resultado.totalAlertas ?? 0}</strong> sinais
                </span>
                <span data-testid="preditivos-criticos">
                  <strong className="text-destructive">{resultado.alertasCriticos ?? 0}</strong> urgentes
                </span>
                {typeof resultado.turnoverRate3m === 'number' && (
                  <span data-testid="preditivos-turnover-rate">
                    rotatividade 3m: <strong className="text-foreground">{resultado.turnoverRate3m}%</strong>
                  </span>
                )}
              </div>

              {resultado.iaResumo && (
                <p className="text-xs leading-relaxed bg-muted/50 rounded-lg p-2.5" data-testid="preditivos-resumo-ia">
                  {resultado.iaResumo}
                </p>
              )}

              <ul className="max-h-72 overflow-y-auto pr-1">
                {listas.turnover.map((a) => (
                  <Linha key={`t-${a.colaboradorId}-${a.sinal}`} alerta={a} origem="turnover" />
                ))}
                {listas.absenteismo.map((a) => (
                  <Linha key={`a-${a.colaboradorId}-${a.sinal}`} alerta={a} origem="absenteismo" />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
