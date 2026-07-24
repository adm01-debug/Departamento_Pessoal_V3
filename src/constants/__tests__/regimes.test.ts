import { describe, it, expect } from 'vitest';
import {
  REGIMES_TRIBUTARIOS,
  REGIMES_OPTIONS,
  getRegimeInfo,
  type RegimeTributario,
} from '../regimes';

describe('REGIMES_TRIBUTARIOS', () => {
  const regimes: RegimeTributario[] = [
    'simples_nacional',
    'lucro_presumido',
    'lucro_real',
    'mei',
  ];

  it('defines all 4 regime types', () => {
    expect(Object.keys(REGIMES_TRIBUTARIOS)).toHaveLength(4);
    for (const regime of regimes) {
      expect(REGIMES_TRIBUTARIOS[regime]).toBeDefined();
    }
  });

  it('each regime has required fields', () => {
    for (const regime of regimes) {
      const info = REGIMES_TRIBUTARIOS[regime];
      expect(info.value).toBe(regime);
      expect(typeof info.label).toBe('string');
      expect(info.label.length).toBeGreaterThan(0);
      expect(typeof info.labelCurto).toBe('string');
      expect(typeof info.descricao).toBe('string');
      expect(typeof info.cor).toBe('string');
      expect(typeof info.recolheINSSPatronal).toBe('boolean');
    }
  });

  it('simples_nacional does NOT collect INSS patronal', () => {
    expect(REGIMES_TRIBUTARIOS.simples_nacional.recolheINSSPatronal).toBe(false);
  });

  it('mei does NOT collect INSS patronal', () => {
    expect(REGIMES_TRIBUTARIOS.mei.recolheINSSPatronal).toBe(false);
  });

  it('lucro_presumido DOES collect INSS patronal', () => {
    expect(REGIMES_TRIBUTARIOS.lucro_presumido.recolheINSSPatronal).toBe(true);
  });

  it('lucro_real DOES collect INSS patronal', () => {
    expect(REGIMES_TRIBUTARIOS.lucro_real.recolheINSSPatronal).toBe(true);
  });

  it('has no duplicate labels', () => {
    const labels = Object.values(REGIMES_TRIBUTARIOS).map(r => r.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('REGIMES_OPTIONS', () => {
  it('contains all 4 regimes as an array', () => {
    expect(REGIMES_OPTIONS).toHaveLength(4);
  });

  it('each entry matches the corresponding REGIMES_TRIBUTARIOS record', () => {
    for (const option of REGIMES_OPTIONS) {
      expect(REGIMES_TRIBUTARIOS[option.value]).toEqual(option);
    }
  });
});

describe('getRegimeInfo', () => {
  it('returns correct info for simples_nacional', () => {
    const info = getRegimeInfo('simples_nacional');
    expect(info.value).toBe('simples_nacional');
    expect(info.recolheINSSPatronal).toBe(false);
  });

  it('returns correct info for lucro_real', () => {
    const info = getRegimeInfo('lucro_real');
    expect(info.value).toBe('lucro_real');
    expect(info.recolheINSSPatronal).toBe(true);
  });

  it('returns lucro_real as default for null', () => {
    const info = getRegimeInfo(null);
    expect(info.value).toBe('lucro_real');
  });

  it('returns lucro_real as default for undefined', () => {
    const info = getRegimeInfo(undefined);
    expect(info.value).toBe('lucro_real');
  });

  it('returns lucro_real as default for invalid string', () => {
    const info = getRegimeInfo('invalid' as RegimeTributario);
    expect(info.value).toBe('lucro_real');
  });

  it('all valid values return matching regime', () => {
    const regimes: RegimeTributario[] = ['simples_nacional', 'lucro_presumido', 'lucro_real', 'mei'];
    for (const regime of regimes) {
      expect(getRegimeInfo(regime).value).toBe(regime);
    }
  });
});
