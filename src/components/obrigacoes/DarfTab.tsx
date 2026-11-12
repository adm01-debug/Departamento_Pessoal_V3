import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle } from 'lucide-react';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

/** Por que não há valor de IRRF: sem folha, folha não calculada ou itens inacessíveis/vazios. */
export type DarfIrrfSituacao = 'sem_folha' | 'nao_calculada' | 'sem_itens';

const MENSAGEM_SEM_VALOR: Record<DarfIrrfSituacao, (competencia: string) => string> = {
  sem_folha: (c) => `Nenhuma folha mensal calculada para ${c}.`,
  nao_calculada: (c) => `A folha mensal de ${c} ainda não foi calculada.`,
  sem_itens: (c) =>
    `Itens da folha mensal de ${c} indisponíveis (sem permissão de acesso à folha ou folha sem colaboradores).`,
};

interface DarfTabProps {
  /** Soma de folha_itens.irrf_mes da folha mensal calculada da competência; null quando não há valor real. */
  totalIrrf: number | null;
  /** Motivo da ausência de valor quando totalIrrf é null (padrão: sem_folha). */
  situacao?: DarfIrrfSituacao;
  competencia: string;
  isLoading?: boolean;
  isError?: boolean;
}

export function DarfTab({ totalIrrf, situacao = 'sem_folha', competencia, isLoading, isError }: DarfTabProps) {
  const irrfValor = isLoading
    ? 'Carregando...'
    : isError
      ? 'Erro ao carregar'
      : totalIrrf === null
        ? '—'
        : formatCurrency(totalIrrf);
  const darfs = [
    { label: 'IRRF (Código 0561)', value: irrfValor, color: 'text-warning', venc: 'Venc. dia 20 do mês seguinte' },
  ];

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Shield className="h-4 w-4 text-warning" />
            DARF — Documento de Arrecadação de Receitas Federais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {darfs.map(({ label, value, color, venc }) => (
              <Card key={label} className="border-border/30 rounded-xl">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground font-body mb-1">{label}</p>
                  <p className={`text-xl font-bold font-display ${color}`}>{value}</p>
                  <p className="text-[10px] text-muted-foreground font-body mt-1">{venc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-4 p-3 bg-muted/30 rounded-xl">
            <p className="text-xs text-muted-foreground font-body flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-warning" />
              {!isLoading && !isError && totalIrrf === null
                ? MENSAGEM_SEM_VALOR[situacao](competencia)
                : `IRRF retido na folha mensal de ${competencia}.`}{' '}
              Consulte seu contador para valores exatos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
