import { describe, it, expect } from 'vitest';
import { pontoIntegracaoUtils } from '../pontoIntegracaoUtils';

describe('pontoIntegracaoUtils.intervalToDecimal', () => {
  it('returns 0 for null', () => {
    expect(pontoIntegracaoUtils.intervalToDecimal(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(pontoIntegracaoUtils.intervalToDecimal(undefined)).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(pontoIntegracaoUtils.intervalToDecimal('')).toBe(0);
  });

  it('parses HH:mm:ss string correctly', () => {
    expect(pontoIntegracaoUtils.intervalToDecimal('08:30:00')).toBe(8.5);
  });

  it('parses HH:mm string (no seconds)', () => {
    expect(pontoIntegracaoUtils.intervalToDecimal('08:30')).toBe(8.5);
  });

  it('parses zero string', () => {
    expect(pontoIntegracaoUtils.intervalToDecimal('00:00:00')).toBe(0);
  });

  it('parses full hours without minutes', () => {
    expect(pontoIntegracaoUtils.intervalToDecimal('08:00:00')).toBe(8);
  });

  it('parses seconds correctly', () => {
    expect(pontoIntegracaoUtils.intervalToDecimal('01:00:30')).toBeCloseTo(1 + 30/3600, 5);
  });

  it('parses object with hours and minutes', () => {
    expect(pontoIntegracaoUtils.intervalToDecimal({ hours: 8, minutes: 30 })).toBe(8.5);
  });

  it('parses object with all fields', () => {
    expect(pontoIntegracaoUtils.intervalToDecimal({ hours: 1, minutes: 0, seconds: 30 })).toBeCloseTo(1 + 30/3600, 5);
  });

  it('parses object with missing fields defaulting to 0', () => {
    expect(pontoIntegracaoUtils.intervalToDecimal({ hours: 5 })).toBe(5);
  });

  it('parses empty object as 0', () => {
    expect(pontoIntegracaoUtils.intervalToDecimal({})).toBe(0);
  });

  it('handles multi-digit hours', () => {
    expect(pontoIntegracaoUtils.intervalToDecimal('200:00:00')).toBe(200);
  });
});
