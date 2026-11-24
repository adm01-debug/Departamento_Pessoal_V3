import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { useStaggerCards } from '../use-stagger-cards';

/**
 * O hook escreve `animationDelay` direto no DOM via MutationObserver + rAF.
 * Nos testes o rAF é síncrono e o observer entrega em microtask, então cada
 * asserção vem depois de um `await act(...)`.
 */
function Sonda({ step = 60 }: { step?: number }) {
  useStaggerCards(step);
  return null;
}

function matchMedia(reduzido: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches: reduzido,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

const delays = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.animate-squash')).map((c) => c.style.animationDelay);

async function assentar() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useStaggerCards', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', ((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    }) as typeof requestAnimationFrame);
    window.matchMedia = matchMedia(false);
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('escalona os cards de um mesmo grupo em passos do tamanho pedido', async () => {
    const grid = document.createElement('div');
    grid.innerHTML = '<div class="animate-squash"></div>'.repeat(3);
    document.body.appendChild(grid);

    render(<Sonda step={60} />);
    await assentar();

    expect(delays()).toEqual(['0ms', '60ms', '120ms']);
  });

  it('agrupa pelo ancestral compartilhado mais próximo, atravessando wrappers', async () => {
    // Cada card dentro do seu próprio wrapper: agrupar por parentElement veria
    // 1 card por grupo e não aplicaria cascata nenhuma.
    const grid = document.createElement('div');
    grid.innerHTML = '<div><div class="animate-squash"></div></div>'.repeat(3);
    document.body.appendChild(grid);

    render(<Sonda step={50} />);
    await assentar();

    expect(delays()).toEqual(['0ms', '50ms', '100ms']);
  });

  it('para de crescer o atraso depois do 9º card', async () => {
    const grid = document.createElement('div');
    grid.innerHTML = '<div class="animate-squash"></div>'.repeat(12);
    document.body.appendChild(grid);

    render(<Sonda step={60} />);
    await assentar();

    // índices 0..8 crescem; de 8 em diante fica preso em 8 * 60ms
    expect(delays().slice(8)).toEqual(['480ms', '480ms', '480ms', '480ms']);
  });

  it('não escreve atraso quando o sistema pede menos animação', async () => {
    window.matchMedia = matchMedia(true);
    const grid = document.createElement('div');
    grid.innerHTML = '<div class="animate-squash"></div>'.repeat(3);
    document.body.appendChild(grid);

    render(<Sonda />);
    await assentar();

    expect(delays()).toEqual(['', '', '']);
  });

  it('pega os cards que entram depois (troca de rota, modal, aba)', async () => {
    const grid = document.createElement('div');
    grid.innerHTML = '<div class="animate-squash"></div>'.repeat(2);
    document.body.appendChild(grid);

    render(<Sonda step={60} />);
    await assentar();
    expect(delays()).toEqual(['0ms', '60ms']);

    const novo = document.createElement('div');
    novo.innerHTML = '<div class="animate-squash"></div>'.repeat(2);
    await act(async () => {
      document.body.appendChild(novo);
      await Promise.resolve();
    });

    // O grupo novo recomeça do zero e os antigos não são reescritos.
    expect(delays()).toEqual(['0ms', '60ms', '0ms', '60ms']);
  });
});
