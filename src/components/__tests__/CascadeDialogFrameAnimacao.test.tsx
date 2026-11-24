import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';

/**
 * ============================================================================
 * A MOLDURA DAS JANELAS ANIMA DE VERDADE (não só "tem variants declaradas").
 *
 * Os testes de paridade (`AuditoriaEventoDialog`, `NineBoxQuadranteDialog`,
 * `PesquisasClimaJanelasCascata`) comparam VARIANTs. Este aqui roda o Framer
 * Motion REAL, mede o `style.transform` durante a abertura e prova o que o
 * usuário percebe: a caixa das janelas de Pesquisas de Clima & eNPS — que usa
 * esta mesma `CascadeDialogFrame` do popup "Pendências" — NASCE pequena e
 * cresce (`scaleX`/`scaleY` de 0 → 1) enquanto o véu escurece em fade. Se
 * alguém trocar a moldura por um `DialogContent` estático, este teste cai.
 * ============================================================================
 */

// Radix em duble: o que interessa aqui é a animação da moldura, não
// focus-trap/portal no jsdom (mesmo caminho de `NineBoxQuadranteDialog.test.tsx`).
vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children }: any) => <div>{children}</div>,
  Portal: ({ children }: any) => <div>{children}</div>,
  Overlay: ({ children }: any) => <div>{children}</div>,
  Content: ({ children }: any) => <div>{children}</div>,
  Close: ({ children }: any) => <button>{children}</button>,
  Title: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  Description: ({ children, ...props }: any) => <p {...props}>{children}</p>,
}));

import { motion } from 'framer-motion';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';

/** Espera `ms` deixando o React/Framer rodarem (medição dentro de `act`). */
async function esperar(ms: number) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

/** Lê o `scaleY(x)` que o Framer escreveu no `transform` (1 quando é `none`). */
function escalaY(el: HTMLElement): number {
  const transform = el.style.transform;
  if (!transform || transform === 'none') return 1;
  const casamento = /scaleY\(([\d.]+)\)/.exec(transform);
  return casamento ? Number(casamento[1]) : 1;
}

const JanelaDePesquisas = ({ open }: { open: boolean }) => (
  <CascadeDialogFrame open={open} onOpenChange={() => {}} blocks={3} className="max-w-md">
    <motion.div variants={cascadeItemVariants}>cabeçalho</motion.div>
    <motion.div variants={cascadeItemVariants}>corpo</motion.div>
    <motion.div variants={cascadeItemVariants}>rodapé</motion.div>
  </CascadeDialogFrame>
);

describe('CascadeDialogFrame — a janela abre e fecha animada (Framer real)', () => {
  it('a caixa cresce de zero e o véu escurece em fade na abertura', async () => {
    const { container, unmount } = render(<JanelaDePesquisas open />);

    const caixa = container.querySelector<HTMLElement>('div[style*="transform-origin"]')!;
    const veu = container.querySelector<HTMLElement>('.backdrop-blur-sm')!;
    expect(caixa).not.toBeNull();
    expect(veu).not.toBeNull();

    // Amostra a abertura: a caixa parte pequena (não é um modal estático).
    const escalas: number[] = [];
    const opacidades: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      await esperar(60);
      escalas.push(escalaY(caixa));
      opacidades.push(Number(veu.style.opacity || '1'));
    }

    expect(Math.min(...escalas)).toBeLessThan(0.9); // começou "fechada" (escala < 1)
    expect(escalas.at(-1)).toBeGreaterThan(Math.min(...escalas)); // cresceu
    expect(opacidades[0]).toBeLessThan(1); // véu entrou em fade (não apareceu seco)
    expect(opacidades.at(-1)).toBeGreaterThan(opacidades[0]);

    // E a abertura TERMINA: caixa em escala 1 (transform identidade).
    await esperar(900);
    expect(escalaY(caixa)).toBe(1);
    expect(Number(veu.style.opacity)).toBe(1);

    unmount();
  }, 15_000);

  it('no fechamento a caixa encolhe de novo antes de sair (exit animado)', async () => {
    const { container, rerender, unmount } = render(<JanelaDePesquisas open />);
    await esperar(1200); // deixa abrir por completo

    const caixa = container.querySelector<HTMLElement>('div[style*="transform-origin"]')!;
    expect(escalaY(caixa)).toBe(1);

    rerender(<JanelaDePesquisas open={false} />);

    // Durante o exit a caixa volta a encolher (a cascata some primeiro).
    const escalas: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      await esperar(80);
      const atual = container.querySelector<HTMLElement>('div[style*="transform-origin"]');
      if (!atual) break;
      escalas.push(escalaY(atual));
    }

    expect(escalas.length).toBeGreaterThan(0); // ainda estava montada (forceMount)
    expect(Math.min(...escalas)).toBeLessThan(1); // encolheu de verdade

    unmount();
  }, 15_000);
});
