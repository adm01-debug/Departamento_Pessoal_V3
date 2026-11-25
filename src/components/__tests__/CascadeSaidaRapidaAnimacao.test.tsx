import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';

/**
 * ============================================================================
 * A JANELA DE LISTA FECHA EM ~0,6 s — MEDIDO, não só calculado.
 *
 * `CascadeSaidaPerfis.test.ts` prova a aritmética dos perfis (0,62 s × 1,67 s).
 * Este teste roda o Framer Motion REAL, cronometra do "fechar" até a janela sair
 * do DOM, com a mesma composição da janela "Talentos em destaque" (8 blocos) e
 * prova o que o usuário percebe: o perfil rápido some em ~0,6 s e o padrão leva
 * ~1,67 s — o "demora muito pra fechar" relatado. Medição de referência nesta
 * máquina: `SAIDA_RAPIDA = 602 ms` / `SAIDA_PADRAO = 1668 ms`.
 *
 * Margens largas de propósito (o alvo é pegar regressão de ORDEM DE GRANDEZA —
 * alguém remover `perfilSaida` da moldura, ou a moldura ignorar o perfil).
 * ============================================================================
 */

import type { ReactNode } from 'react';

type RadixChildren = { children?: ReactNode };

vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children }: RadixChildren) => <div>{children}</div>,
  Trigger: ({ children }: RadixChildren) => <div>{children}</div>,
  Portal: ({ children }: RadixChildren) => <div>{children}</div>,
  Overlay: ({ children }: RadixChildren) => <div>{children}</div>,
  Content: ({ children }: RadixChildren) => <div>{children}</div>,
  Close: ({ children }: RadixChildren) => <button>{children}</button>,
  Title: ({ children, ...props }: RadixChildren) => <h2 {...props}>{children}</h2>,
  Description: ({ children, ...props }: RadixChildren) => <p {...props}>{children}</p>,
}));

import { motion } from 'framer-motion';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import {
  CASCADE_SAIDA_PADRAO,
  CASCADE_SAIDA_RAPIDA,
  cascadeItemVariants,
  type PerfilSaidaCascata,
} from '@/components/ui/cascade-motion';

/** Espera `ms` deixando o React/Framer rodarem (medição dentro de `act`). */
async function esperar(ms: number) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

/** A janela relatada: título + 7 linhas = os 8 blocos de "Talentos em destaque". */
const JanelaDeLista = ({ open, perfil }: { open: boolean; perfil: PerfilSaidaCascata }) => (
  <CascadeDialogFrame open={open} onOpenChange={() => {}} blocks={8} perfilSaida={perfil}>
    <motion.div variants={cascadeItemVariants}>título</motion.div>
    {Array.from({ length: 7 }).map((_, i) => (
      <motion.div key={i} variants={cascadeItemVariants}>
        linha {i}
      </motion.div>
    ))}
  </CascadeDialogFrame>
);

/** Cronometra: manda fechar → espera a caixa sair do DOM (`AnimatePresence`). */
async function medirFechamento(perfil: PerfilSaidaCascata): Promise<number> {
  const { container, rerender, unmount } = render(<JanelaDeLista open perfil={perfil} />);
  await esperar(1600); // abertura completa (0,9 s de caixa + cascata)
  expect(container.querySelector('div[style*="transform-origin"]')).toBeTruthy();

  const inicio = Date.now();
  rerender(<JanelaDeLista open={false} perfil={perfil} />);

  let decorrido = Number.POSITIVE_INFINITY;
  for (let i = 0; i < 160; i += 1) {
    await esperar(25);
    if (!container.querySelector('div[style*="transform-origin"]')) {
      decorrido = Date.now() - inicio;
      break;
    }
  }
  unmount();
  return decorrido;
}

describe('Fechamento da janela de lista — perfil rápido vs padrão (Framer real)', () => {
  it('o perfil rápido fecha bem abaixo de 1 s e o padrão continua em 1,67 s', async () => {
    const rapido = await medirFechamento(CASCADE_SAIDA_RAPIDA);
    const padrao = await medirFechamento(CASCADE_SAIDA_PADRAO);

    expect(rapido).toBeLessThan(1200); // era 1668 ms antes da correção
    expect(padrao).toBeGreaterThan(1400); // o padrão (histórico) não mudou
    expect(rapido).toBeLessThan(padrao / 2);
  }, 30_000);
});
