/**
 * @fileoverview KPI Cards do "Meu Ponto" — os quatro indicadores da semana como
 * CARDS INDEPENDENTES, no mesmo padrão do Dashboard Principal.
 *
 * Por que `MetricCard` e não um card próprio: o KPI do Dashboard é a rota de
 * referência do sistema (ícone em chip colorido à esquerda, título, valor em
 * destaque e linha de apoio) e já carrega as duas animações que a página tem de
 * herdar, sem cópia de números:
 *  - ENTRADA: `cardVariants` (= `entradaCardGlobal`: 14px / 520ms / 120ms,
 *    ease-out), aplicada pelo próprio MotionCard com `custom={index}`;
 *  - HOVER: `CARD_INTERACAO` (`card-interacao`) + `CARD_INTERACAO_ICONE`
 *    (elevação de −2px, borda para `primary/40` e chip em 1.05).
 * Reimplementar o desenho aqui criaria uma segunda régua de KPI e de hover — o
 * que o design system proíbe.
 *
 * Os números vêm de `calcularIndicadoresPonto` (módulo puro, testável), sobre os
 * `registros_ponto` dos últimos 7 dias do colaborador logado.
 */
import { useMemo } from 'react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { calcularIndicadoresPonto, type RegistroIndicador } from './indicadoresPonto';

interface PontoIndicadoresKpiProps {
  registrosSemana?: RegistroIndicador[];
}

export function PontoIndicadoresKpi({ registrosSemana = [] }: PontoIndicadoresKpiProps) {
  const indicadores = useMemo(() => calcularIndicadoresPonto(registrosSemana), [registrosSemana]);

  return (
    /* Quatro colunas no desktop (`xl`), duas no tablet e uma no mobile — o mesmo
       intervalo de `gap` da página (12px reais) e altura uniforme por linha,
       porque o `MetricCard` é `h-full`. */
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {indicadores.map(({ chave, titulo, valor, descricao, icone, tone, vividRed }, indice) => (
        <MetricCard
          key={chave}
          title={titulo}
          value={valor}
          description={descricao}
          icon={icone}
          tone={tone}
          vividRed={vividRed}
          index={indice}
        />
      ))}
    </div>
  );
}
