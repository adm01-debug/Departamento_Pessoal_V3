/**
 * ============================================================================
 * TURNOS & ESCALAS — SUPERFÍCIES DOS CARDS (fundo translúcido + cobertura opaca).
 * ============================================================================
 *
 * O card da grade semanal e o da lista usam `bg-card/40` (o mesmo vidro fosco
 * discreto do resto da tela). Isso cria um problema para as CÉLULAS FIXAS: a
 * primeira coluna é `sticky` (o nome não pode sair de vista na rolagem
 * horizontal) e o cabeçalho da lista fica `sticky` no topo da rolagem vertical.
 * Célula fixa precisa de fundo OPACO — com alfa, o conteúdo que passa por
 * baixo aparece através dela.
 *
 * Pintar essas células com `bg-card` (opaco) resolvia o vazamento, mas o tom
 * ficava ~2,4 níveis de luminosidade mais claro que o card real: era a origem
 * do "retângulo" atrás de "Colaborador" no cabeçalho da semana. A cobertura
 * opaca certa é a COR APARENTE do card, ou seja o próprio `bg-card/40`
 * composto sobre o `--background` da página (o `<main>` do layout é
 * `bg-background`, então a composição é exata, sem gradiente no meio).
 *
 * `color-mix` em `srgb` reproduz exatamente a composição alfa do CSS (mesma
 * matemática de canal), e a mistura de duas cores opacas é opaca — o resultado
 * serve tanto de pintura quanto de máscara. É a mesma técnica já usada em
 * `PassivoTrabalhistaPage` para o `th` fixo daquela tabela.
 *
 * Regra de convivência: quem pinta uma célula fixa sobre estes cards usa
 * `FUNDO_CARD_OPACO`; quem pinta o card usa `FUNDO_CARD`. Mudar um sem o outro
 * devolve a emenda visível.
 * ============================================================================
 */

/** Fundo do card (vidro fosco do Design System). */
export const FUNDO_CARD = 'bg-card/40';

/**
 * A MESMA cor acima, porém opaca — para células `sticky` (primeira coluna da
 * grade semanal e cabeçalho da lista). Pinta sem emenda e cobre a rolagem.
 */
export const FUNDO_CARD_OPACO = 'bg-[color-mix(in_srgb,hsl(var(--card))_40%,hsl(var(--background)))]';
