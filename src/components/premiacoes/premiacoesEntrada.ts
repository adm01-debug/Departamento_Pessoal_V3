/**
 * ============================================================================
 * HUB DE PREMIAÇÕES — ENTRADA DE BLOCO = A MESMA ANIMAÇÃO DO SISTEMA.
 *
 * Este arquivo já foi uma cadência PRÓPRIA ("um pouco mais lenta": 0,55s e passo
 * de 0,10s por índice). A referência do sistema — a lista de Processos de
 * Desligamentos — não usa números próprios: usa `ui/entrada-cards.entradaCard`,
 * que aponta para `cardVariants` do Dashboard Executivo:
 *
 *     fade + subida de 20px · 0,40s · passo de 0,08s por índice ·
 *     ease [0.25, 0.46, 0.45, 0.94] · teto no 9º item
 *
 * Para que Campanhas e Pagamentos tenham EXATAMENTE essa animação — em duração,
 * deslocamento, opacidade, suavização e intervalo entre elementos — o Hub deixou
 * de manter número próprio: o `entradaCard` exportado aqui é o MESMO objeto de
 * `ui/entrada-cards` (nenhuma variante nova, nenhum valor recopiado). Os ~8 call
 * sites do módulo continuam importando deste caminho.
 *
 * O que cada bloco anima continua igual: entrada por montagem, uma vez por
 * apresentação (`animate` constante + `key` estável), com o fade e o `y` da
 * referência; com "reduzir movimento" ligado, o `MotionConfig` da página mantém
 * o fade e desliga o deslocamento.
 * ============================================================================
 */
export { entradaCard, EntradaPresenca } from '@/components/ui/entrada-cards';
