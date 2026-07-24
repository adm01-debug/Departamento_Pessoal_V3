/**
 * FeriasReconciliacaoCard — divergências Férias ↔ Folha.
 *
 * Lista férias aprovadas cujas rubricas em `eventos_variaveis` não
 * batem com o esperado (ou ainda não foram enviadas à contabilidade),
 * permitindo ao RH agir antes do fechamento da folha do mês do gozo.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GitCompareArrows, AlertCircle, MailWarning } from 'lucide-react';
import { useReconciliacaoFolha, type SituacaoReconciliacao } from '@/hooks/ferias/useReconciliacaoFolha';

const meta: Record<SituacaoReconciliacao, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; Icon: typeof AlertCircle }> = {
  ok: { label: 'OK', variant: 'secondary', Icon: GitCompareArrows },
  divergente: { label: 'Divergente', variant: 'destructive', Icon: AlertCircle },
  pendente_envio: { label: 'Pendente envio à contabilidade', variant: 'outline', Icon: MailWarning },
};

export function FeriasReconciliacaoCard() {
  const { data, isLoading } = useReconciliacaoFolha();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompareArrows className="w-5 h-5 text-primary" aria-hidden />
          Reconciliação Férias ↔ Folha
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todas as férias aprovadas estão com rubricas devidamente lançadas na folha.
          </p>
        ) : (
          <ul className="divide-y">
            {data.map((row) => {
              const m = meta[row.situacao];
              return (
                <li key={row.ferias_id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <m.Icon className="w-4 h-4" aria-hidden />
                      <Badge variant={m.variant}>{m.label}</Badge>
                      <span className="text-sm font-medium truncate">
                        {row.colaborador_nome ?? row.colaborador_id}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Competência {new Date(row.competencia).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}
                      {' · '}
                      {row.rubricas_geradas}/{row.rubricas_esperadas} rubricas
                      {' · '}
                      Início {new Date(row.data_inicio).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
