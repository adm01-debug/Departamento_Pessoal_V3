/**
 * Ordem da cascata de entrada do CABEÇALHO do Organograma.
 *
 * A animação em si NÃO é recriada aqui: é a RÉGUA GLOBAL de entrada de card —
 * o objeto `cardVariants` exportado por
 * `src/components/dashboard/MetricCard.tsx`, que hoje É literalmente
 * `entradaCardGlobal` de `ui/entradaGlobal.ts` (fade + subida de 14px,
 * `delay = índice × 120ms`, 520ms de duração e easing
 * `cubic-bezier(0, 0, 0.58, 1)`). Os dois componentes do cabeçalho importam
 * aquele `cardVariants` e só passam o `custom` com o índice, exatamente como
 * `DashboardExecutivoPage.tsx` faz nos KPIs
 * (`custom={i} variants={cardVariants} initial="hidden" animate="visible"`).
 *
 * O que este arquivo resolve é o ÍNDICE de cada item. Os seis itens do cabeçalho
 * são renderizados por dois componentes diferentes (`OrganogramaStats` e
 * `OrganogramaToolbar`), então a fila fica declarada num lugar só, na mesma
 * ordem em que o olho os encontra — da esquerda para a direita:
 *
 *   | slot | item                      | atraso | termina em |
 *   |------|---------------------------|--------|------------|
 *   |  0   | card Departamentos        | 0.00s  |   0.52s    |
 *   |  1   | card Colaboradores        | 0.12s  |   0.64s    |
 *   |  2   | card Níveis hierárquicos  | 0.24s  |   0.76s    |
 *   |  3   | campo de busca            | 0.36s  |   0.88s    |
 *   |  4   | botão Expandir tudo       | 0.48s  |   1.00s    |
 *   |  5   | botão Recolher tudo       | 0.60s  |   1.12s    |
 *
 * (`termina em` = atraso + 0.52s de duração: a última peça do cabeçalho é a
 * última a entrar, no mesmo compasso dos cards do resto do sistema.)
 *
 * Regras:
 *   - os índices são únicos e sem buraco (0..5) e a ORDEM de declaração abaixo é
 *     a ordem visual — `OrganogramaHeaderReveal.test.tsx` trava as duas coisas;
 *   - ao acrescentar, remover ou mover um item do cabeçalho, renumere AQUI: cada
 *     componente lê apenas o próprio slot (`HEADER_REVEAL.busca`, etc.);
 *   - a árvore do Organograma não passa por aqui: ela tem as suas próprias
 *     animações em `organogramaReveal.ts` / `organogramaCascade.ts`, intocadas;
 *   - quem renderiza o cabeçalho precisa de um `<AnimatePresence>` local (mesmo
 *     contorno documentado em `OrganogramaTree.tsx` e
 *     `HistoricoColaborador.tsx`) para a cascata realmente tocar — o contexto de
 *     presença `initial={false}` do app faz a Motion pular o keyframe inicial de
 *     qualquer `motion.*` descendente. Ver `OrganogramaPage.tsx`.
 */
export const HEADER_REVEAL = {
  departamentos: 0,
  colaboradores: 1,
  niveis: 2,
  busca: 3,
  expandirTudo: 4,
  recolherTudo: 5,
} as const;
