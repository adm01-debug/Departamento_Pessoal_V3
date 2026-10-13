/**
 * ENTRADA DE CARD DO MÓDULO DE GESTÃO DE DESEMPENHO — ponte para o mecanismo
 * compartilhado (mesmo padrão de `components/desligamentos/entradaCards.tsx`).
 *
 * O conteúdo REAL (`MotionCard`, `entradaCard`, `EntradaPresenca`,
 * `MAX_ENTRADA_INDEX` e toda a documentação de por que cada peça existe) mora em
 * `src/components/ui/entrada-cards.tsx`, que por sua vez reutiliza o
 * `cardVariants` exportado por `src/components/dashboard/MetricCard.tsx` — a
 * MESMA animação de entrada dos KPI Cards do Dashboard Executivo (fade +
 * subida de 20px, stagger de 0.08s por índice, 0.4s, ease
 * `[0.25, 0.46, 0.45, 0.94]`).
 *
 * Este arquivo NÃO inventa animação nem recalcula número nenhum: é reexportação
 * pura, para o módulo de Desempenho importar do seu próprio diretório sem tocar
 * em componentes globais.
 */
// eslint-disable-next-line react-refresh/only-export-components
export { MotionCard, MAX_ENTRADA_INDEX, entradaCard, EntradaPresenca } from '@/components/ui/entrada-cards';
