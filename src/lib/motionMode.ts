/**
 * ============================================================================
 * MODO DE MOVIMENTO REDUZIDO — FONTE ÚNICA de todo o sistema.
 *
 * Este arquivo é o ÚNICO lugar que decide se as animações devem ser reduzidas.
 * TODA verificação de movimento reduzido passa por aqui — nenhuma parte do app
 * lê `prefers-reduced-motion` por conta própria:
 *
 *   1. Framer Motion  → `reducedMotion` do `<MotionConfig>` (via `MOTION_REDUCED_MODE`)
 *   2. Hooks/componentes → `useMovimentoReduzido()` (substitui `useReducedMotion()`)
 *   3. Efeitos/medições sem React → `deveReduzirMovimento()`
 *   4. CSS puro (`@media (prefers-reduced-motion: reduce)` em `index.css`)
 *      → guardado por `html:not(.dp-force-motion)`, classe publicada por
 *      `sincronizarModoMovimentoDocumento()`.
 *
 * O padrão do sistema (e o de PRODUÇÃO) é `'user'`: respeita a preferência de
 * acessibilidade do sistema operacional. Com "reduzir movimento" ligado, o
 * Framer Motion mantém os fades e desliga os deslocamentos.
 *
 * Em DESENVOLVIMENTO, porém, essa preferência ATÉ esconde a cascata/contagem/
 * desenho de linhas de quem a tem ligada na máquina — e é justamente esse o
 * caso que impedia INSPECIONAR a animação de referência (ex.: um Windows com
 * "reduzir movimento" ativo). Por isso existe UMA configuração centralizada de
 * teste: no dev o movimento COMPLETO é habilitado por padrão, SEM depender de
 * nenhuma configuração do Windows e SEM tocar em produção:
 *
 *     localStorage.setItem('dp-force-motion', 'off')  // e recarregue a página
 *       → volta a respeitar a preferência do SO no dev (para testar a
 *         acessibilidade); qualquer outro valor (ou ausência da chave)
 *         mantém o movimento completo.
 *
 * Em produção `import.meta.env.DEV === false` e o modo é SEMPRE `'user'`: a
 * preferência de acessibilidade do usuário final é preservada integralmente.
 * ============================================================================
 */
import { useReducedMotion } from 'framer-motion';

export type MotionReducedMode = 'user' | 'never';

/** Chave do override de desenvolvimento (documentada no topo do arquivo). */
export const FORCE_MOTION_KEY = 'dp-force-motion';

/**
 * Classe publicada no `<html>` quando o modo completo está forçado (dev). É o
 * gancho que faz o CSS de `index.css` voltar a animar — ver
 * `sincronizarModoMovimentoDocumento`.
 */
export const FORCE_MOTION_CLASS = 'dp-force-motion';

/**
 * Resolvido UMA vez, no import do módulo: o override exige recarregar a página
 * (é uma preferência de inspeção, não um toggle vivo por render).
 *
 * - Produção → `'user'` (respeita a preferência de acessibilidade).
 * - Dev → `'never'` por padrão (movimento completo), salvo quando o override é
 *   explicitamente desligado com `dp-force-motion = 'off'`.
 */
export const MOTION_REDUCED_MODE: MotionReducedMode = (() => {
  if (!import.meta.env.DEV) return 'user';
  try {
    return localStorage.getItem(FORCE_MOTION_KEY) === 'off' ? 'user' : 'never';
  } catch {
    // `localStorage` indisponível (contexto privado / SSR): dev mantém o
    // movimento completo (é o ambiente de inspeção).
    return 'never';
  }
})();

/**
 * Decisão pura (sem React) — para efeitos, medições e qualquer verificação
 * explícita fora de um componente. Substitui os `window.matchMedia(...)`
 * espalhados (ex.: `use-stagger-cards` e `KanbanColumn`).
 */
export function deveReduzirMovimento(): boolean {
  if (MOTION_REDUCED_MODE === 'never') return false;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Hook — SUBSTITUTO do `useReducedMotion()` do Framer Motion em TODO o app
 * (`PageTransition`, `Select`, `DropdownMenu`, `Popover`, `Command`). O hook
 * nativo lê a preferência do SO direto e IGNORA o `<MotionConfig>` — por isso
 * configurar só o `reducedMotion="never"` não bastava: os componentes que
 * zeravam a duração explicitamente continuavam bloqueando os efeitos. Este hook
 * é o ponto único que honra o modo centralizado.
 *
 * Chama `useReducedMotion()` incondicionalmente (regra dos hooks) e só então
 * aplica o override de desenvolvimento.
 */
export function useMovimentoReduzido(): boolean {
  const sistema = useReducedMotion();
  if (MOTION_REDUCED_MODE === 'never') return false;
  return sistema ?? false;
}

/**
 * Publica/remove a classe `dp-force-motion` no `<html>`, que faz o CSS puro de
 * `index.css` (`@media (prefers-reduced-motion: reduce)`) voltar a animar. Sem
 * isso, Cards (`.animate-squash`), overlays e o Kanban continuariam desligados
 * só pelo CSS mesmo com o Motion liberado. Não faz nada em produção. Chame uma
 * única vez no boot (`main.tsx`).
 */
export function sincronizarModoMovimentoDocumento(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (MOTION_REDUCED_MODE === 'never') root.classList.add(FORCE_MOTION_CLASS);
  else root.classList.remove(FORCE_MOTION_CLASS);
}
