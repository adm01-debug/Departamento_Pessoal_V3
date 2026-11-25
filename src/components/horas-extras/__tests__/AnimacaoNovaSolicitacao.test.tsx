import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

/**
 * ============================================================================
 * A MODAL "NOVA SOLICITAÇÃO" ABRE E FECHA COMO O POPUP DE PENDÊNCIAS.
 *
 * A referência (`PendenciasDialog`) usa a moldura animada do sistema
 * (`CascadeDialogFrame` → `ui/cascade-motion.ts`). Este teste roda o Framer
 * Motion REAL (sem mock) e mede o que o usuário percebe:
 *
 *   • abertura — a caixa NASCE pequena e cresce (`scaleX`/`scaleY` de 0 → 1,
 *     0,9 s, `easeInOut`) enquanto o véu escurece em fade;
 *   • fechamento — o conteúdo continua MONTADO até o fim da transição e a caixa
 *     encolhe antes de sair; o rascunho NÃO é esvaziado na frente do usuário.
 *
 * Se alguém trocar a moldura por um `DialogContent` estático (ou voltar a limpar
 * o formulário no fechamento), estes testes caem.
 * ============================================================================
 */

import { NovaSolicitacaoDialog } from '../NovaSolicitacaoDialog';

/** O Radix chama `scrollIntoView` ao abrir o select, e o jsdom não tem a API. */
Element.prototype.scrollIntoView = () => {};

const COLABORADORES = [{ id: 'c1', nome_completo: 'Ana Souza' }];

/** Espera `ms` deixando o React/Framer rodarem (medição dentro de `act`). */
async function esperar(ms: number) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

/** A CASCA da janela — a única do documento com `transform-origin`. */
const casca = () => document.querySelector<HTMLElement>('div[style*="transform-origin"]');

/** Lê o `scaleY(x)` escrito pelo Framer (1 quando o transform é identidade). */
function escalaY(el: HTMLElement): number {
  const transform = el.style.transform;
  if (!transform || transform === 'none') return 1;
  const casamento = /scaleY\(([\d.]+)\)/.exec(transform);
  return casamento ? Number(casamento[1]) : 1;
}

const janela = (open: boolean, onOpenChange = vi.fn()) => (
  <NovaSolicitacaoDialog
    open={open}
    onOpenChange={onOpenChange}
    colaboradores={COLABORADORES}
    onCriar={async () => {}}
  />
);

describe('Nova solicitação de hora extra — moldura do popup de Pendências', () => {
  it('abre crescendo de dentro para fora, com o véu escurecendo em fade', async () => {
    const { unmount } = render(janela(true));

    const caixa = casca();
    expect(caixa).not.toBeNull();
    // A mesma âncora da moldura compartilhada: `top center`. O jsdom grava a
    // forma curta na ordem canônica (`center top`), então o literal do atributo
    // depende do parser — o que o teste cobra é a âncora, não a ordem.
    expect(['top center', 'center top']).toContain(caixa!.style.transformOrigin);

    const veu = document.querySelector<HTMLElement>('.backdrop-blur-sm');
    expect(veu).not.toBeNull();

    // Amostra a abertura: a caixa parte pequena (não é um modal estático).
    const escalas: number[] = [];
    const opacidades: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      await esperar(70);
      escalas.push(escalaY(casca()!));
      opacidades.push(Number(veu!.style.opacity || '1'));
    }

    expect(Math.min(...escalas)).toBeLessThan(0.9); // começou pequena
    expect(escalas.at(-1)).toBeGreaterThan(Math.min(...escalas)); // e cresceu
    expect(opacidades[0]).toBeLessThan(1); // o véu entrou em fade
    expect(opacidades.at(-1)).toBeGreaterThan(opacidades[0]);

    // E a abertura TERMINA: caixa em escala 1 e véu opaco.
    await esperar(900);
    expect(escalaY(casca()!)).toBe(1);
    expect(Number(veu!.style.opacity)).toBe(1);

    unmount();
  }, 15_000);

  it('fecha encolhendo, com o conteúdo montado até o fim da transição', async () => {
    const onOpenChange = vi.fn();
    const { rerender, unmount } = render(janela(true, onOpenChange));
    await esperar(1200); // deixa abrir por completo
    expect(escalaY(casca()!)).toBe(1);

    // Preenche um campo para provar que o rascunho continua à vista na saída.
    const motivo = screen.getByLabelText('Motivo *');
    fireEvent.change(motivo, { target: { value: 'Inventário de estoque' } });

    rerender(janela(false, onOpenChange));

    // Durante o exit: a caixa ainda está montada (forceMount), encolhendo, e o
    // formulário continua com o texto do usuário — nada de campo esvaziando.
    const escalas: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      await esperar(80);
      const atual = casca();
      if (!atual) break;
      escalas.push(escalaY(atual));
      expect(screen.getByLabelText('Motivo *')).toHaveValue('Inventário de estoque');
    }

    expect(escalas.length).toBeGreaterThan(0); // seguiu montada durante a saída
    expect(Math.min(...escalas)).toBeLessThan(1); // e encolheu de verdade

    // Só DEPOIS da transição o conteúdo é desmontado.
    await esperar(1400);
    expect(casca()).toBeNull();
    expect(screen.queryByLabelText('Motivo *')).not.toBeInTheDocument();

    unmount();
  }, 15_000);

  it('o X da moldura avisa o dono do estado (o fechamento animado continua)', async () => {
    const onOpenChange = vi.fn();
    const { unmount } = render(janela(true, onOpenChange));

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    unmount();
  }, 15_000);
});
