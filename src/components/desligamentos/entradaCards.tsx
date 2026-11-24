/**
 * ENTRADA DE CARD DO MÓDULO DE DESLIGAMENTOS — ponte para o mecanismo
 * compartilhado.
 *
 * O conteúdo REAL (`MotionCard`, `entradaCard`, `EntradaPresenca`,
 * `MAX_ENTRADA_INDEX` e toda a documentação de por que cada peça existe) mora em
 * `src/components/ui/entrada-cards.tsx`: o mecanismo é o MESMO do Dashboard
 * Executivo (`cardVariants` de `components/dashboard/MetricCard.tsx`) e passou a
 * ser usado também por Recrutamento — deixá-lo dentro desta pasta obrigaria os
 * outros módulos a importar de Desligamentos.
 *
 * Este arquivo continua existindo só para não mexer nos call sites do módulo
 * (`DesligamentosPage`, `GestaoDesligamentos`, `TrilhaAuditoriaDesligamentos`,
 * `TurnoverChart`, `DesligamentoDetailSheet`, `DesligamentoAtencaoBanner`…): é
 * reexportação pura, sem nenhuma lógica nova, então o comportamento (valores,
 * durações, stagger e contexto de presença) é exatamente o de antes.
 */
// eslint-disable-next-line react-refresh/only-export-components
export { MotionCard, MAX_ENTRADA_INDEX, entradaCard, EntradaPresenca } from '@/components/ui/entrada-cards';

