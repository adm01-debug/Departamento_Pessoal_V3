import { describe, expect, it } from 'vitest';
import { parsePgIntervalToHours } from '../pgInterval';

describe('parsePgIntervalToHours', () => {
  it('retorna o próprio número para input numérico', () => {
    expect(parsePgIntervalToHours(8)).toBe(8);
    expect(parsePgIntervalToHours(-2.5)).toBe(-2.5);
    expect(parsePgIntervalToHours(0)).toBe(0);
  });

  it('retorna 0 para entrada ausente/inválida (nunca NaN)', () => {
    expect(parsePgIntervalToHours(null)).toBe(0);
    expect(parsePgIntervalToHours(undefined)).toBe(0);
    expect(parsePgIntervalToHours('')).toBe(0);
    expect(parsePgIntervalToHours('   ')).toBe(0);
    expect(parsePgIntervalToHours('abc')).toBe(0);
    expect(parsePgIntervalToHours({})).toBe(0);
    expect(parsePgIntervalToHours(NaN)).toBe(0);
    expect(parsePgIntervalToHours(Infinity)).toBe(0);
  });

  it('parseia string numérica simples', () => {
    expect(parsePgIntervalToHours('8')).toBe(8);
    expect(parsePgIntervalToHours('-2.5')).toBe(-2.5);
  });

  it('parseia HH:MM:SS do Postgres', () => {
    expect(parsePgIntervalToHours('08:00:00')).toBe(8);
    expect(parsePgIntervalToHours('01:30:00')).toBe(1.5);
    expect(parsePgIntervalToHours('00:00:30.5')).toBeCloseTo(30.5 / 3600, 6);
  });

  it('parseia dias + relógio ("1 day 02:00:00" → 26h)', () => {
    expect(parsePgIntervalToHours('1 day 02:00:00')).toBe(26);
    expect(parsePgIntervalToHours('2 days')).toBe(48);
  });

  it('parseia negativo misto ("-1 day -02:00:00" → -26h)', () => {
    expect(parsePgIntervalToHours('-1 day -02:00:00')).toBe(-26);
  });

  it('aplica a convenção justify_hours: 1 mês = 30 dias, 1 ano = 360 dias', () => {
    expect(parsePgIntervalToHours('1 mon 3 days')).toBe(30 * 24 + 72);
    expect(parsePgIntervalToHours('1 year')).toBe(360 * 24);
    expect(parsePgIntervalToHours('1 week')).toBe(7 * 24);
  });
});
