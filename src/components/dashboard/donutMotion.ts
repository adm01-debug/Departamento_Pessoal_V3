/**
 * ============================================================================
 * ROSCAS DE CARD — RÉGUA DO TRAÇADO (fonte única em JS).
 *
 * Os dois gráficos de distribuição do produto desenham o arco com
 * `components/dashboard/DonutChart.tsx`:
 *
 *   • "Departamentos"      → `DepartmentsCard.tsx` (Dashboard principal)
 *   • "Tipo de Vínculo"    → aba Estrutura do Dashboard Executivo
 *                            (`pages/DashboardExecutivoPage.tsx`)
 *
 * Antes cada tela passava o seu próprio número (ou nenhum, caindo nos 600 ms do
 * default) e os dois gráficos pareciam animações diferentes. Aqui ficam os
 * MESMOS valores para os dois: efeito de desenho do arco, curva e tempo de
 * execução idênticos por construção — para divergirem seria preciso mudar um
 * dos números abaixo.
 *
 * Equivalência com libs de gráfico (ApexCharts/Recharts/Chart.js): `1.8` é o
 * `animation.duration` (em SEGUNDOS, unidade das props do Framer Motion),
 * `0.2` o atraso inicial e `0.15` o intervalo entre o início dos segmentos.
 *
 * O que NÃO é padronizado aqui: o atraso/cascata das LEGENDAS de cada card (são
 * coreografias aprovadas, cada uma no seu arquivo) e o `size`/`strokeWidth`.
 *
 * Este módulo é separado do componente de propósito: exportar constante de um
 * arquivo de componente quebra o Fast Refresh (`react-refresh/only-export-components`).
 * ============================================================================
 */
import type { Transition } from 'framer-motion';

/**
 * Props de animação da rosca — espalhe no `DonutChart`:
 * `<DonutChart segments={...} {...ANIMACAO_DONUT_CARD} />`.
 *
 * Aqui está só a RÉGUA VISUAL. O gate de CICLO DE VIDA (só desenhar depois do
 * fim do loading) não é prop nenhuma: cada card monta o gráfico apenas quando
 * os dados chegam (renderização condicional estrita), então a própria montagem
 * é o gatilho do traçado.
 */
export const ANIMACAO_DONUT_CARD = {
  /** Traçado de CADA segmento — 1,8 s. */
  animationDuration: 1.8,
  /** Atraso antes do primeiro segmento — 200 ms. */
  animationDelay: 0.2,
  /** Intervalo entre o início dos segmentos — 150 ms. */
  segmentStagger: 0.15,
  /** Desaceleração — a mesma curva nos dois gráficos. */
  animationEase: 'easeOut' as Transition['ease'],
};
