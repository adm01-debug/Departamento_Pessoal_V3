/**
 * ============================================================================
 * MOCK VISUAL — série do card "Fluxo de Entradas por Horário"
 * (Controle de Ponto → Gestão da Equipe → Visão Geral).
 *
 * ESCOPO: SOMENTE a série DESENHADA nas 15 colunas do gráfico (06:00 → 20:00).
 * O componente continua recebendo os registros reais por prop e calculando com
 * eles a rosca "Distribuição de Status", a previsão mensal, a conformidade e o
 * monitor de riscos trabalhistas — nenhum número daqui entra em indicador, KPI,
 * banco de horas, espelho, exportação ou gravação. A única grandeza DERIVADA
 * desta série é o selo "Pico" do próprio card, que é calculado a partir do que
 * está sendo exibido (premissa do layout) e não é indicador oficial.
 *
 * POR QUE A SÉRIE É SUBSTITUÍDA (e não somada): o painel é uma vitrine. As
 * linhas reais de `registros_ponto` de uma única pessoa rendem uma ou duas
 * colunas no expediente inteiro e a leitura do gráfico fica vazia. Aqui a série
 * demonstrativa OCUPA O LUGAR da real — nunca soma com ela: ou o gráfico mostra
 * a vitrine, ou mostra os registros, jamais uma mistura dos dois.
 *
 * GATE (mesmo padrão de src/mocks/*Mock.ts): liga somente com as DUAS condições
 * abaixo — logo, nunca em produção:
 *   1. `import.meta.env.DEV` (build de desenvolvimento);
 *   2. `VITE_PONTO_MOCK=true` no `.env`/`.env.local`.
 * A guarda `MODE !== 'test'` é essencial: o Vitest carrega o mesmo `.env` do
 * `vite dev` — sem ela os testes receberiam estes dados fictícios em vez das
 * fixtures que cada teste monta.
 *
 * PARA DESATIVAR: defina `VITE_PONTO_MOCK=false` no `.env` e reinicie o
 * `vite dev` — o gráfico volta a desenhar só as entradas reais da semana.
 * PARA REMOVER DE VEZ: apague este arquivo e o trecho marcado com
 * "MOCK VISUAL — ver src/mocks/pontoFluxoMock.ts" em
 * `src/components/ponto/GestaoPontoAnalytics.tsx`.
 * ============================================================================
 */

/** Uma coluna do gráfico: a hora cheia e quantas entradas ela acumulou. */
export interface EntradaFluxoHora {
  hour: string;
  count: number;
}

/**
 * Janela fixa do gráfico — a MESMA faixa usada pelo cálculo real (06:00 →
 * 20:00). Fica aqui para que a série demonstrativa e os registros reais não
 * possam divergir de janela (as duas leem esta constante).
 */
export const HORARIOS_FLUXO_ENTRADAS: readonly string[] = Array.from(
  { length: 15 },
  (_, indice) => `${String(indice + 6).padStart(2, '0')}:00`
);

/**
 * Movimentação fictícia de um dia de expediente: 24 entradas distribuídas entre
 * 06:00 e 17:00, com a chegada forte das 08:00 (6 = 25% do total, o pico).
 * As horas sem movimento continuam existindo, zeradas, para a leitura do
 * expediente inteiro — o mesmo contrato da série real.
 */
export const FLUXO_ENTRADAS_DEMONSTRATIVO: readonly EntradaFluxoHora[] = [
  { hour: '06:00', count: 1 },
  { hour: '07:00', count: 3 },
  { hour: '08:00', count: 6 },
  { hour: '09:00', count: 4 },
  { hour: '10:00', count: 2 },
  { hour: '11:00', count: 1 },
  { hour: '12:00', count: 0 },
  { hour: '13:00', count: 3 },
  { hour: '14:00', count: 2 },
  { hour: '15:00', count: 1 },
  { hour: '16:00', count: 0 },
  { hour: '17:00', count: 1 },
  { hour: '18:00', count: 0 },
  { hour: '19:00', count: 0 },
  { hour: '20:00', count: 0 },
];

/** Só liga em dev e com opt-in explícito; nunca em produção nem no Vitest. */
export function isPontoFluxoMockEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_PONTO_MOCK === 'true';
}

/**
 * Série a DESENHAR no gráfico: a vitrine quando o mock está ligado, `null` no
 * modo real (aí o componente usa os registros da semana, sem mistura).
 *
 * Devolve uma cópia: quem consome pode ordenar/filtrar sem tocar na constante.
 */
export function serieFluxoEntradasDemonstrativa(): EntradaFluxoHora[] | null {
  if (!isPontoFluxoMockEnabled()) return null;
  return FLUXO_ENTRADAS_DEMONSTRATIVO.map(({ hour, count }) => ({ hour, count }));
}
