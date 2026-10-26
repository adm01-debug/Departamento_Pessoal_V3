import { describe, expect, it } from 'vitest';
import {
  MAX_CARDS_ESCALONADOS,
  delayRodapeMs,
  delayRodapeReduzidoMs,
  estaVisivel,
} from '../entradaKanban';

/**
 * Os valores abaixo são o CONTRATO entre o JS e `src/index.css` (o rodapé do
 * Kanban entra depois de todos os cards). Se alguém mudar um dos dois lados,
 * este teste falha e evita a animação "dessincronizada" entre Admissões e
 * Pipeline — as duas telas usam o mesmo helper.
 */
describe('entradaKanban — delays do rodapé', () => {
  it('rodapé normal: 1300ms + 100ms por card, com teto de 8 cards', () => {
    expect(MAX_CARDS_ESCALONADOS).toBe(8);
    expect(delayRodapeMs(0)).toBe(1400);
    expect(delayRodapeMs(4)).toBe(1800);
    expect(delayRodapeMs(8)).toBe(2200);
    expect(delayRodapeMs(20)).toBe(2200);
  });

  it('rodapé com movimento reduzido: 620ms + 50ms por card (mesmo teto)', () => {
    expect(delayRodapeReduzidoMs(0)).toBe(670);
    expect(delayRodapeReduzidoMs(4)).toBe(870);
    expect(delayRodapeReduzidoMs(20)).toBe(1070);
  });
});

describe('estaVisivel', () => {
  it('elemento nulo/inexistente não está visível', () => {
    expect(estaVisivel(null)).toBe(false);
  });

  it('no jsdom (altura 0) a animação não é disparada', () => {
    const no = document.createElement('div');
    document.body.appendChild(no);
    expect(estaVisivel(no)).toBe(false);
    no.remove();
  });
});
