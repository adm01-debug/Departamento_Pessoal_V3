import { describe, expect, it } from 'vitest';
import { COR_TURNO_PADRAO, hexParaHsv, hexParaRgba, hsvParaHex, normalizarHex } from '../turnosCores';

/**
 * Cores dos turnos → tinta das células.
 *
 * A cor do turno é dado do cliente (`turnos.cor`), então a conversão precisa ser
 * tolerante: hex curto, hex sem `#`, cor nula e lixo digitado à mão não podem
 * derrubar a célula nem deixá-la invisível.
 */
describe('turnosCores', () => {
  it('normaliza hex curto, sem cerquilha e maiúsculo', () => {
    expect(normalizarHex('#ABC')).toBe('#aabbcc');
    expect(normalizarHex('22C55E')).toBe('#22c55e');
    expect(normalizarHex('  #22c55e  ')).toBe('#22c55e');
  });

  it('cai na cor padrão quando a cor é ausente ou inválida', () => {
    expect(normalizarHex(null)).toBe(COR_TURNO_PADRAO);
    expect(normalizarHex(undefined)).toBe(COR_TURNO_PADRAO);
    expect(normalizarHex('azul')).toBe(COR_TURNO_PADRAO);
    expect(normalizarHex('#12345')).toBe(COR_TURNO_PADRAO);
  });

  it('converte para rgba com o alfa pedido', () => {
    expect(hexParaRgba('#22c55e', 0.16)).toBe('rgba(34, 197, 94, 0.16)');
    expect(hexParaRgba('#000', 1)).toBe('rgba(0, 0, 0, 1)');
  });

  it('limita o alfa ao intervalo [0, 1]', () => {
    expect(hexParaRgba('#ffffff', 2)).toBe('rgba(255, 255, 255, 1)');
    expect(hexParaRgba('#ffffff', -1)).toBe('rgba(255, 255, 255, 0)');
    expect(hexParaRgba('#ffffff', Number.NaN)).toBe('rgba(255, 255, 255, 1)');
  });

  /**
   * A ida e volta hex → HSV → hex é o que sustenta o seletor de cor do cadastro
   * de turnos: se ela não fechar, abrir o seletor já muda a cor cadastrada.
   */
  it('faz a ida e volta hex ⇄ HSV sem alterar a cor', () => {
    for (const cor of ['#22c55e', '#3b82f6', '#f59e0b', '#ff0000', '#000000', '#ffffff', '#64748b']) {
      expect(hsvParaHex(hexParaHsv(cor))).toBe(cor);
    }
  });

  it('descreve a cor em matiz/saturação/brilho', () => {
    expect(hexParaHsv('#ff0000')).toEqual({ h: 0, s: 1, v: 1 });
    expect(hexParaHsv('#00ff00')).toEqual({ h: 120, s: 1, v: 1 });
    expect(hexParaHsv('#0000ff')).toEqual({ h: 240, s: 1, v: 1 });
    // Branco/preto/cinza não têm matiz: saturação 0 e o brilho do tom.
    expect(hexParaHsv('#ffffff')).toEqual({ h: 0, s: 0, v: 1 });
    expect(hexParaHsv('#000000')).toEqual({ h: 0, s: 0, v: 0 });
    const verde = hexParaHsv('#22c55e');
    expect(verde.h).toBeCloseTo(142, 0);
    expect(verde.v).toBeCloseTo(197 / 255, 4);
  });

  it('limita saturação/brilho fora da faixa e aceita matiz negativa', () => {
    expect(hsvParaHex({ h: 0, s: 2, v: 1 })).toBe('#ff0000');
    expect(hsvParaHex({ h: 0, s: -1, v: 1 })).toBe('#ffffff');
    expect(hsvParaHex({ h: -120, s: 1, v: 1 })).toBe('#0000ff');
    expect(hsvParaHex({ h: 480, s: 1, v: 1 })).toBe('#00ff00');
  });
});
