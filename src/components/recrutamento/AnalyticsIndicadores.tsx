import { CircleCheck, Gauge, Timer, UserMinus, Users, type LucideIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { IndicadorGeral } from './analyticsComum';
import { AnalyticsPainel, ChipContagem } from './AnalyticsPainel';
import { VariacaoKpi } from './AnalyticsVariacao';
import { SUPERFICIE_INTERNA } from './analyticsVisual';
import { MotionCard, entradaCard } from '@/components/ui/entrada-cards';
import { CARD_INTERACAO_ESTATICO, CARD_INTERACAO_ICONE_ESTATICO } from '@/components/ui/interacao-cards';
import { cn } from '@/lib/utils';

/**
 * PRINCIPAIS INDICADORES — quatro cards dentro de UM painel com título próprio.
 *
 * Aqui está a única diferença de ESTRUTURA em relação à referência: ela desenha
 * esta última linha como um cabeçalho solto + quatro cards sobre a página. No
 * produto, os quatro cards ficam DENTRO de um painel — o mesmo `AnalyticsPainel`
 * das outras seis faixas. O motivo é a hierarquia de superfícies: cards soltos
 * sobre `--background` enquanto todo o resto da aba mora sobre `--card` faziam o
 * rodapé parecer outro produto colado embaixo. Dentro do painel, os cards usam a
 * camada 3 (`SUPERFICIE_INTERNA`), a mesma do funil, dos ladrilhos de tempo e
 * das linhas de vaga.
 *
 * O desenho de cada card é o MESMO dos quatro KPIs do topo (ícone à esquerda,
 * valor grande com a variação à direita e o apoio embaixo): a tela começa e
 * termina com a mesma peça.
 *
 * A variação "vs. período anterior" vem de `analyticsComum.construirIndicadores`,
 * que mede a MESMA régua na janela de 45 dias e na janela anterior. Sem base de
 * um dos lados, `tendencia` é `null` e a coluna simplesmente não aparece —
 * nenhum percentual é inventado.
 */
const META: Record<IndicadorGeral['id'], { icone: LucideIcon; classe: string; dica: string }> = {
  'tempo-contratacao': {
    icone: Timer,
    classe: 'border-info/25 bg-info/10 text-info',
    dica: 'Dias entre a entrada na base e a data de referência para os processos em Contratado.',
  },
  'candidatos-vaga': {
    icone: Users,
    classe: 'border-[hsl(var(--chart-4)/0.28)] bg-[hsl(var(--chart-4)/0.12)] text-[hsl(var(--chart-4))]',
    dica: 'Candidatos únicos divididos pelas vagas com status aberta.',
  },
  desistencia: {
    icone: UserMinus,
    classe: 'border-warning/25 bg-warning/10 text-warning',
    dica: 'Processos com status de desistência ou cancelamento divididos pelo total de candidaturas.',
  },
  aceitacao: {
    icone: CircleCheck,
    classe: 'border-success/25 bg-success/10 text-success',
    dica: 'Contratados divididos pelo total de propostas emitidas (Proposta + Contratado).',
  },
};

export function AnalyticsIndicadores({
  indicadores,
  referencia,
  index,
}: {
  indicadores: IndicadorGeral[];
  referencia: Date;
  index: number;
}) {
  return (
    <AnalyticsPainel
      icon={Gauge}
      title="Principais indicadores"
      subtitle="Métricas gerais do recrutamento na base atual"
      index={index}
      action={<ChipContagem>Base: {format(referencia, 'dd MMM yyyy', { locale: ptBR })}</ChipContagem>}
    >
      {/* Quatro colunas só com ≥1060px úteis no `main`, mesma régua da faixa de
          KPIs do topo: em 1280 o card fica com ~205px e até "Candidatos por
          vaga" (159px numa caixa de 119px) truncava. Abaixo disso, 2×2.
          `data-analytics-indicadores` fica no grid (o painel já expõe
          `data-analytics-painel`): é nele que a sonda de layout mede a faixa. */}
      <div
        data-analytics-indicadores
        className="grid min-w-0 gap-2.5 @min-[520px]:grid-cols-2 @min-[1060px]:grid-cols-4"
      >
        {indicadores.map((indicador, indice) => {
          const meta = META[indicador.id];
          const Icone = meta.icone;
          return (
            <MotionCard
              key={indicador.id}
              {...entradaCard(index + indice)}
              // Opt-out da entrada por CSS (ver `AnalyticsPainel`): são quatro
              // cards DENTRO de um painel que já é Motion — com as duas
              // entradas ligadas, cada um subia, descia 14px e subia de novo.
              data-entrada="cascata"
              data-analytics-indicador={indicador.id}
              title={meta.dica}
              className={cn(
                'flex min-h-[60px] min-w-0 items-center gap-2 rounded-xl px-2 py-1.5',
                CARD_INTERACAO_ESTATICO,
                SUPERFICIE_INTERNA
              )}
            >
              {/* Container do ícone com 40px reais: o mesmo degrau dos KPIs
                  do topo (que usam 55px), um pouco menor para o rótulo caber.
                  SEM hover — como os KPIs do topo e o painel que o hospeda
                  (`CARD_INTERACAO_ICONE_ESTATICO`): o card da faixa é estático
                  e a dica do indicador continua no `title` do card. */}
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border',
                  CARD_INTERACAO_ICONE_ESTATICO,
                  meta.classe
                )}
              >
                <Icone className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                {/* Rótulo em UMA linha (`truncate`, com o completo no `title`): em
                    duas linhas ele somava 28px e o card pedia 120px de altura. A
                    coluna de texto tem ~176px em 1440 e os dois rótulos longos
                    ("Tempo médio de contratação" 167px, "Taxa de aceitação de
                    proposta" 173px) cabem inteiros nessa caixa com 9.5px. */}
                <p className="truncate text-[9.5px] leading-tight text-muted-foreground" title={indicador.label}>
                  {indicador.label}
                </p>
                <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
                  <p className="font-display text-[18px] font-semibold leading-none tabular-nums text-foreground 2xl:text-[20px]">
                    {indicador.valor}
                  </p>
                  <VariacaoKpi tendencia={indicador.tendencia} />
                </div>
                {/* Apoio também em UMA linha: o texto completo continua no `title`. */}
                <p
                  className="mt-0.5 truncate text-[8px] leading-tight text-muted-foreground/80"
                  title={indicador.apoio}
                >
                  {indicador.apoio}
                </p>
              </div>
            </MotionCard>
          );
        })}
      </div>
    </AnalyticsPainel>
  );
}
