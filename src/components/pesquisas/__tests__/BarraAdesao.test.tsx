import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarraAdesao } from '../BarraAdesao';

/**
 * Barra de adesão com a Motion REAL (sem mock): é o único teste que prova o
 * estado do PRIMEIRO quadro — o preenchimento monta fora da área visível
 * (`translateX(-100%)`) e só depois cresce até o valor. Sem isso o cartão
 * abriria com a barra já cheia, que era o defeito original.
 */
const TRILHO = 'h-1.5 bg-muted/50';
const PREENCHIMENTO = 'rounded-full bg-gradient-to-r from-primary to-success';

function renderBarra(value: number, indice = 0) {
  render(
    <BarraAdesao
      value={value}
      indice={indice}
      aria-label={`Adesão de ${value}%`}
      className={TRILHO}
      indicatorClassName={PREENCHIMENTO}
    />
  );
  const trilho = screen.getByRole('progressbar');
  return { trilho, preenchimento: trilho.firstElementChild as HTMLElement };
}

describe('BarraAdesao — preenchimento sai do zero', () => {
  it('monta com o degradê inteiro fora da área visível (0%)', () => {
    const { preenchimento } = renderBarra(72);

    expect(preenchimento.style.transform).toBe('translateX(-100%)');
  });

  it('mantém trilho, degradê e rótulo acessível do Progress do sistema', () => {
    const { trilho, preenchimento } = renderBarra(72);

    expect(trilho).toHaveAccessibleName('Adesão de 72%');
    expect(trilho.className).toContain('overflow-hidden');
    expect(trilho.className).toContain('rounded-full');
    expect(trilho.className).toContain(TRILHO);
    expect(preenchimento.className).toContain(PREENCHIMENTO);
    expect(preenchimento.className).toContain('progress-indicator');
  });
});
