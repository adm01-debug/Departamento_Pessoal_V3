import { useMemo } from 'react';
import { UserMinus, Clock, CheckCircle2, CalendarDays, DollarSign } from 'lucide-react';
import { MetricCard, type MetricTone } from '@/components/dashboard/MetricCard';
import {
  concluido,
  emAberto,
  formatCurrencyBRL,
  pendente,
  variacaoRecente,
  dataValida,
  type DesligamentoLike,
} from './desligamentosDerivacoes';

interface KPIProps {
  desligamentos: DesligamentoLike[];
}

/**
 * Faixa de 5 KPIs do módulo — MESMO `MetricCard` do Dashboard
 * Executivo/Admissões (ícone circular, título, valor e linha de apoio com
 * tendência), porém na variante `dense` (`MetricCard` com `dense`): ícone, valor
 * e padding ficam no TAMANHO PADRÃO (mesma altura dos KPIs do Dashboard
 * Executivo) e só a linha de apoio encolhe o suficiente para caber em UMA linha
 * — sem isso "vs. período anterior" quebra e o card passa da altura da faixa
 * Executiva. A entrada em cascata vem do próprio card (`cardVariants`), com o
 * `index` do `.map` alimentando o `custom`. Nenhum dado é inventado: a tendência
 * só aparece quando há base real de comparação (30 dias vs. 30 anteriores).
 */
export function DesligamentoKPIs({ desligamentos }: KPIProps) {
  const kpis = useMemo(() => {
    const agora = new Date();
    const referencia = agora.getTime();
    const mes = agora.getMonth();
    const ano = agora.getFullYear();

    const pendentes = desligamentos.filter(pendente);
    const concluidos = desligamentos.filter(concluido);
    const esteMes = desligamentos.filter((d) => {
      const dt = dataValida(d.data_desligamento);
      return dt ? dt.getMonth() === mes && dt.getFullYear() === ano : false;
    });
    const valorTotal = desligamentos.reduce((acc, d) => acc + (d.valor_liquido || 0), 0);

    return [
      {
        label: 'Total Desligamentos',
        value: String(desligamentos.length),
        rawValue: desligamentos.length,
        moeda: false,
        icon: UserMinus,
        tone: 'destructive' as MetricTone,
        amostra: desligamentos,
        descricao: 'processos no período',
      },
      {
        label: 'Pendentes',
        value: String(pendentes.length),
        rawValue: pendentes.length,
        moeda: false,
        icon: Clock,
        tone: 'warning' as MetricTone,
        amostra: pendentes,
        descricao: 'aguardando tratativa',
      },
      {
        label: 'Concluídos',
        value: String(concluidos.length),
        rawValue: concluidos.length,
        moeda: false,
        icon: CheckCircle2,
        tone: 'success' as MetricTone,
        amostra: concluidos,
        descricao: 'processos encerrados',
      },
      {
        label: 'Este Mês',
        value: String(esteMes.length),
        rawValue: esteMes.length,
        moeda: false,
        icon: CalendarDays,
        tone: 'info' as MetricTone,
        amostra: esteMes,
        descricao: 'desligamentos no mês',
      },
      {
        label: 'Valor Total Rescisões',
        value: formatCurrencyBRL(valorTotal),
        rawValue: valorTotal,
        moeda: true,
        icon: DollarSign,
        tone: 'primary' as MetricTone,
        amostra: [],
        descricao: `${desligamentos.filter(emAberto).length} em aberto`,
      },
    ].map((kpi) => ({ ...kpi, trend: variacaoRecente(kpi.amostra, referencia) }));
  }, [desligamentos]);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {kpis.map((kpi, index) => (
        <MetricCard
          key={kpi.label}
          index={index}
          title={kpi.label}
          value={kpi.value}
          rawValue={kpi.rawValue}
          formatFn={kpi.moeda ? formatCurrencyBRL : undefined}
          decimals={kpi.moeda ? 2 : 0}
          icon={kpi.icon}
          tone={kpi.tone}
          vividRed
          trend={kpi.trend}
          description={kpi.trend ? undefined : kpi.descricao}
          dense
          className="rounded-2xl border-border/40 shadow-elevated"
        />
      ))}
    </div>
  );
}
