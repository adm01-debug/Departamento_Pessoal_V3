import { describe, expect, it } from 'vitest';
import {
  FLUXO_ENTRADAS_DEMONSTRATIVO,
  HORARIOS_FLUXO_ENTRADAS,
  isPontoFluxoMockEnabled,
  serieFluxoEntradasDemonstrativa,
} from '../pontoFluxoMock';

/**
 * MOCK VISUAL — série do gráfico "Fluxo de Entradas por Horário".
 *
 * O que este teste trava:
 *  1. a janela do gráfico (06:00 → 20:00) é coberta hora a hora, sem buraco;
 *  2. o expediente fictício está preenchido (24 entradas) e o pico é ÚNICO —
 *     o selo "Pico" do card supõe um horário de maior volume;
 *  3. a participação do pico é 25% (6 de 24), o número do layout aprovado;
 *  4. o gate NUNCA liga no Vitest — os testes de componente continuam montando
 *     as próprias fixtures em vez de receber estes números fictícios.
 */
describe('mock do Fluxo de Entradas por Horário', () => {
  it('cobre a janela 06:00 → 20:00, uma coluna por hora', () => {
    expect(HORARIOS_FLUXO_ENTRADAS).toHaveLength(15);
    expect(HORARIOS_FLUXO_ENTRADAS[0]).toBe('06:00');
    expect(HORARIOS_FLUXO_ENTRADAS[14]).toBe('20:00');
    expect(FLUXO_ENTRADAS_DEMONSTRATIVO.map((item) => item.hour)).toEqual([...HORARIOS_FLUXO_ENTRADAS]);
  });

  it('preenche o expediente com 24 entradas inteiras e não negativas', () => {
    for (const item of FLUXO_ENTRADAS_DEMONSTRATIVO) {
      expect(Number.isInteger(item.count)).toBe(true);
      expect(item.count).toBeGreaterThanOrEqual(0);
    }
    expect(FLUXO_ENTRADAS_DEMONSTRATIVO.reduce((soma, item) => soma + item.count, 0)).toBe(24);
  });

  it('o pico é 08:00 com 6 entradas = 25% do total', () => {
    const total = FLUXO_ENTRADAS_DEMONSTRATIVO.reduce((soma, item) => soma + item.count, 0);
    const pico = FLUXO_ENTRADAS_DEMONSTRATIVO.reduce((maior, item) => (item.count > maior.count ? item : maior));

    expect(pico).toEqual({ hour: '08:00', count: 6 });
    expect(Math.round((pico.count / total) * 100)).toBe(25);
    // Único horário com o maior volume.
    expect(FLUXO_ENTRADAS_DEMONSTRATIVO.filter((item) => item.count === pico.count)).toHaveLength(1);
  });

  it('o gate mantém a vitrine fora do Vitest (e longe do banco em produção)', () => {
    expect(import.meta.env.MODE).toBe('test');
    expect(isPontoFluxoMockEnabled()).toBe(false);
    expect(serieFluxoEntradasDemonstrativa()).toBeNull();
  });
});
