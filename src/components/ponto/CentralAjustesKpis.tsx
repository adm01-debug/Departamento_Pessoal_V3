/**
 * ============================================================================
 * KPIs DA CENTRAL DE AJUSTES — quatro indicadores horizontais no topo da aba.
 *
 * Por que `MetricCard` e não um card próprio: o KPI do Dashboard é a peça
 * oficial do sistema (ícone em chip colorido, título, valor em destaque e linha
 * de apoio) e já traz a entrada em cascata (`entradaCardGlobal`) e o hover
 * `card-interacao`. Reimplementar o desenho aqui criaria uma segunda régua de
 * KPI — o que o design system proíbe. É a MESMA peça dos KPIs da Visão Geral e
 * do painel de Geofencing desta página.
 *
 * ── DE ONDE VÊM OS NÚMEROS ─────────────────────────────────────────────────
 * `indicadores` e `variacoes` chegam prontos do componente pai, calculados por
 * `resumoAjustes`/`variacoesAjustes` sobre a MESMA lista que a tabela mostra
 * (recortada pelo período). Nada é contado aqui.
 *
 * ── SELO DE VARIAÇÃO ───────────────────────────────────────────────────────
 * Mesma regra do painel de Geofencing: com variação `null` (sem base de
 * comparação) o selo NÃO aparece; com variação `0`, a linha de apoio diz "sem
 * variação" em vez de exibir "0%" — o card nunca inventa movimento.
 * ============================================================================
 */
import { CheckCircle2, Clock, ShieldAlert, XCircle, type LucideIcon } from 'lucide-react';
import { MetricCard, type MetricTone } from '@/components/dashboard/MetricCard';
import type { IndicadoresAjustes, VariacoesAjustes } from './centralAjustes';

interface CentralAjustesKpisProps {
  indicadores: IndicadoresAjustes;
  variacoes: VariacoesAjustes;
  /** Rótulo do período ativo (ex.: "Últimos 30 dias"), usado no tooltip. */
  rotuloPeriodo: string;
}

interface CartaoKpi {
  chave: keyof VariacoesAjustes;
  titulo: string;
  valor: number;
  descricao: string;
  icone: LucideIcon;
  tone: MetricTone;
  tooltip: string;
}

export function CentralAjustesKpis({ indicadores, variacoes, rotuloPeriodo }: CentralAjustesKpisProps) {
  const periodo = rotuloPeriodo.toLowerCase();

  const cartoes: CartaoKpi[] = [
    {
      chave: 'pendentes',
      titulo: 'Pendentes',
      valor: indicadores.pendentes,
      descricao: 'aguardando análise do RH',
      icone: Clock,
      tone: 'primary',
      tooltip: `Solicitações de ajuste ainda sem decisão em ${periodo}.`,
    },
    {
      chave: 'aprovadas',
      titulo: 'Aprovadas',
      valor: indicadores.aprovadas,
      descricao: 'ajustes aceitos',
      icone: CheckCircle2,
      tone: 'success',
      tooltip: `Solicitações aprovadas pelo RH em ${periodo}.`,
    },
    {
      chave: 'rejeitadas',
      titulo: 'Rejeitadas',
      valor: indicadores.rejeitadas,
      descricao: 'sem comprovação aceita',
      icone: XCircle,
      tone: 'destructive',
      tooltip: `Solicitações recusadas pelo RH em ${periodo}.`,
    },
    {
      chave: 'riscoElevado',
      titulo: 'Risco elevado',
      valor: indicadores.riscoElevado,
      descricao: 'apontadas pela análise IA',
      icone: ShieldAlert,
      tone: 'warning',
      tooltip: 'Solicitações cujo parecer da análise de risco é ALTO — confira o comprovante antes de aprovar.',
    },
  ];

  return (
    // QUATRO COLUNAS dentro da coluna esquerda (que é ~70% da tela): os KPIs
    // NUNCA atravessam a página inteira — quem manda na largura é a área do
    // grid onde este componente é montado, não o viewport.
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {cartoes.map(({ chave, titulo, valor, descricao, icone, tone, tooltip }, indice) => {
        const variacao = variacoes[chave];
        // `variacao !== null && variacao !== 0` dentro da própria expressão: é o
        // que estreita o tipo para `number` (um booleano intermediário não
        // estreita nada para o TypeScript).
        const trend =
          variacao !== null && variacao !== 0 ? { value: variacao, label: 'vs. período anterior' } : undefined;
        return (
          <MetricCard
            key={chave}
            title={titulo}
            value={valor}
            description={variacao === 0 ? `${descricao} · sem variação` : descricao}
            icon={icone}
            tone={tone}
            trend={trend}
            tooltip={tooltip}
            index={indice}
            // Faixa compacta (58–68 px): a tabela de solicitações começa logo
            // abaixo dos KPIs nesta tela — ver `compact` no `MetricCard`.
            compact
          />
        );
      })}
    </div>
  );
}
