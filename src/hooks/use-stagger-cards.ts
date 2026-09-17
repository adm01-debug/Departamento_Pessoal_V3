import { useEffect } from 'react';

const PROCESSED_ATTR = 'data-stagger-applied';
/** Acima do 9º card de um grupo, o atraso para de crescer — evita que uma
 * lista longa (ex.: uma tabela renderizada como cards) leve segundos
 * inteiros para terminar de entrar. */
const MAX_STAGGER_INDEX = 8;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Para cada card, acha o ancestral mais próximo que também é ancestral de
 * outro card — essa é a "chave" do grupo de stagger. Agrupar só pelo
 * `parentElement` direto (a versão ingênua/óbvia) quebra sempre que há
 * QUALQUER wrapper entre o card e o grid/flex que os organiza visualmente —
 * e isso é comum neste código: `FeriasKPIs` embrulha cada `Card` num
 * `motion.div` próprio, `DashboardPage` embrulha cards individuais em `div`s
 * de altura fixa, etc. Nesses casos, o `parentElement` de cada card é único
 * (o próprio wrapper), então uma versão "por parentElement" nunca vê mais de
 * 1 card por grupo e nunca aplica cascata nenhuma. Subir a cadeia de
 * ancestrais até achar o primeiro nó compartilhado por 2+ cards resolve isso
 * para qualquer profundidade de wrapper, sem precisar conhecer o layout de
 * cada página.
 */
function groupByNearestSharedAncestor(cards: HTMLElement[]): HTMLElement[][] {
  const chains = cards.map((card) => {
    const chain: HTMLElement[] = [];
    let node = card.parentElement;
    while (node && node !== document.body) {
      chain.push(node);
      node = node.parentElement;
    }
    return chain;
  });

  const counts = new Map<HTMLElement, number>();
  for (const chain of chains) {
    for (const ancestor of chain) counts.set(ancestor, (counts.get(ancestor) ?? 0) + 1);
  }

  const groups = new Map<HTMLElement, HTMLElement[]>();
  cards.forEach((card, i) => {
    const key = chains[i].find((a) => (counts.get(a) ?? 0) >= 2) ?? card;
    const group = groups.get(key);
    if (group) group.push(card);
    else groups.set(key, [card]);
  });

  return Array.from(groups.values());
}

function applyStagger(stepMs: number) {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.animate-squash'))
    .filter((card) => !card.hasAttribute(PROCESSED_ATTR));
  if (cards.length === 0) return;

  for (const siblings of groupByNearestSharedAncestor(cards)) {
    siblings.forEach((card, index) => {
      card.style.animationDelay = `${Math.min(index, MAX_STAGGER_INDEX) * stepMs}ms`;
      card.setAttribute(PROCESSED_ATTR, '');
    });
  }
}

/**
 * Escalona a entrada de qualquer `Card` (`.animate-squash` — o
 * squash-and-stretch já aplicado globalmente em
 * `src/components/ui/card.tsx`) em cascata, sem precisar editar página por
 * página.
 *
 * Chame uma única vez no componente raiz do app (`App.tsx`), fora de
 * qualquer coisa que desmonte durante a navegação.
 *
 * Por que MutationObserver, e não só um `requestAnimationFrame` único no
 * mount: este é um SPA com React Router — trocar de rota NÃO remonta o
 * componente raiz, só troca o conteúdo da rota. Um único passe no mount só
 * pegaria a primeira página carregada (ex.: um refresh em /dashboard) e
 * nunca mais rodaria — toda a navegação depois disso (Férias, Colaboradores,
 * Folha, modais, abas, listas filtradas) ficaria sem cascata nenhuma. O
 * observer cobre isso de graça, porque trocar de rota e abrir um modal/aba
 * são, no fim das contas, mutações no DOM — por isso não é preciso também
 * escutar `useLocation()`: seria redundante (o observer já vê a troca de
 * rota como mutação) e só custaria destruir/recriar o observer a cada
 * navegação à toa.
 */
export function useStaggerCards(stepMs: number = 60) {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    let pending = false;
    const schedule = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        applyStagger(stepMs);
      });
    };

    schedule(); // primeira pintura

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          schedule();
          break;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [stepMs]);
}
