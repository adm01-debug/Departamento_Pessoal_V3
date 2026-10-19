/**
 * ============================================================================
 * ABA PAGAMENTOS — OS QUATRO INDICADORES FINANCEIROS (IMAGEM 4).
 *
 *  1 · Total Aprovado          verde    · R$ somado dos valores aprovados
 *  2 · Aguardando Aprovação    âmbar    · R$ em cálculo aguardando alguém aprovar
 *  3 · Divergências Identific. vermelho · R$ da DIFERENÇA entre folha e aprovado
 *  4 · Total Pago no Período   azul     · R$ efetivamente liquidado
 *
 * TODOS os números vêm de `pagamentosComum.montarKpisPagamentos` (função pura,
 * sobre os pagamentos já carregados) — nada é copiado da referência visual e
 * nenhum percentual é inventado: o comparativo com "mês anterior" só existiria
 * se houvesse período comparável, e não há, então a linha de apoio traz apenas a
 * CONTAGEM de pagamentos de cada indicador.
 *
 * O cartão é o `Indicador` compartilhado do hub (mesmas dimensões, padding,
 * tipografia e alinhamento da faixa de KPIs de Campanhas/Desligamentos); o
 * indicador crítico (divergências) usa o `destaque` que pinta o card inteiro com
 * a tinta vermelho-escura translúcida.
 * ============================================================================
 */
import { AlertTriangle, Clock, DollarSign, Layers } from 'lucide-react';
import { Indicador } from './IndicadorPremiacoes';
import { indiceEntrada } from './premiacoesComum';
import { formatCurrency } from '@/utils/format';
import type { KpisPagamentos } from './pagamentosComum';

/** "6 pagamentos" / "1 pagamento" — a contagem real de cada indicador. */
function contagem(n: number): string {
  return `${n} ${n === 1 ? 'pagamento' : 'pagamentos'}`;
}

interface PagamentosKpisProps {
  kpis: KpisPagamentos;
}

export function PagamentosKpis({ kpis }: PagamentosKpisProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 min-[640px]:grid-cols-2 min-[1280px]:grid-cols-4">
      <Indicador
        indice={indiceEntrada('kpis', 0)}
        titulo="Total Aprovado"
        valor={formatCurrency(kpis.aprovado.valor)}
        icone={DollarSign}
        caixa="bg-success/15 text-success"
        rodape={contagem(kpis.aprovado.quantidade)}
      />

      <Indicador
        indice={indiceEntrada('kpis', 1)}
        titulo="Aguardando Aprovação"
        valor={formatCurrency(kpis.aguardando.valor)}
        icone={Clock}
        caixa="bg-warning/15 text-warning"
        rodape={contagem(kpis.aguardando.quantidade)}
      />

      <Indicador
        indice={indiceEntrada('kpis', 2)}
        titulo="Divergências Identificadas"
        valor={formatCurrency(kpis.divergencias.valor)}
        icone={AlertTriangle}
        caixa="bg-destructive/20 text-destructive"
        rodapeClasse={kpis.divergencias.quantidade > 0 ? 'font-medium text-destructive' : 'text-muted-foreground'}
        rodape={
          kpis.divergencias.quantidade > 0
            ? `${contagem(kpis.divergencias.quantidade)} · requer conciliação`
            : 'Nenhuma divergência na conciliação'
        }
        destaque={kpis.divergencias.quantidade > 0}
      />

      <Indicador
        indice={indiceEntrada('kpis', 3)}
        titulo="Total Pago no Período"
        valor={formatCurrency(kpis.pago.valor)}
        icone={Layers}
        caixa="bg-info/15 text-info"
        rodape={contagem(kpis.pago.quantidade)}
      />
    </div>
  );
}
