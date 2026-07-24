import { describe, it, expect } from 'vitest';
import { validarCPF, normalizarCPF, parseDate, parseSalario } from '../validators';

describe('validarCPF', () => {
  it('returns true for valid CPF', () => {
    expect(validarCPF('529.982.247-25')).toBe(true);
    expect(validarCPF('52998224725')).toBe(true);
  });

  it('returns false for CPFs with all same digits', () => {
    expect(validarCPF('111.111.111-11')).toBe(false);
    expect(validarCPF('000.000.000-00')).toBe(false);
    expect(validarCPF('999.999.999-99')).toBe(false);
  });

  it('returns false for CPF with wrong check digits', () => {
    expect(validarCPF('529.982.247-26')).toBe(false);
    expect(validarCPF('123.456.789-00')).toBe(false);
  });

  it('returns false for CPF with wrong length', () => {
    expect(validarCPF('123.456.789')).toBe(false);
    expect(validarCPF('1234567890123')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validarCPF('')).toBe(false);
  });

  it('accepts CPF with only digits', () => {
    expect(validarCPF('52998224725')).toBe(true);
  });

  it('handles CPF with extra characters', () => {
    expect(validarCPF('529.982.247-25')).toBe(true);
  });
});

describe('normalizarCPF', () => {
  it('strips non-digits from CPF', () => {
    expect(normalizarCPF('529.982.247-25')).toBe('52998224725');
  });

  it('pads short CPF to 11 digits', () => {
    expect(normalizarCPF('1234567')).toBe('00001234567');
  });

  it('returns empty string for null', () => {
    expect(normalizarCPF(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(normalizarCPF(undefined)).toBe('');
  });

  it('converts number to CPF string', () => {
    expect(normalizarCPF(12345678901)).toBe('12345678901');
  });
});

describe('parseDate', () => {
  it('returns null for null input', () => {
    expect(parseDate(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseDate(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseDate('')).toBeNull();
  });

  it('parses Brazilian date format DD/MM/YYYY', () => {
    expect(parseDate('25/12/2023')).toBe('2023-12-25');
  });

  it('parses ISO date string', () => {
    expect(parseDate('2023-12-25')).toBe('2023-12-25');
  });

  it('returns null for invalid date string', () => {
    expect(parseDate('not-a-date')).toBeNull();
  });

  it('parses Excel serial date number', () => {
    // Excel serial 45000 corresponds to a date around 2023
    const result = parseDate(45000);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('parseSalario', () => {
  it('returns undefined for null', () => {
    expect(parseSalario(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(parseSalario(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(parseSalario('')).toBeUndefined();
  });

  it('parses plain number', () => {
    expect(parseSalario(3500)).toBe(3500);
  });

  it('parses string number', () => {
    expect(parseSalario('3500')).toBe(3500);
  });

  it('parses pt-BR format with dot as thousands and comma as decimal', () => {
    expect(parseSalario('3.500,50')).toBe(3500.5);
  });

  it('parses format with comma as decimal only', () => {
    expect(parseSalario('3500,50')).toBe(3500.5);
  });

  it('parses format with R$ currency symbol', () => {
    expect(parseSalario('R$ 3.500,00')).toBe(3500);
  });

  it('returns 0 for purely non-numeric string (digits stripped, Number("") = 0)', () => {
    // All non-digit chars are stripped → empty string → Number('') = 0, which is finite
    expect(parseSalario('abc')).toBe(0);
  });

  it('parses decimal string with period', () => {
    expect(parseSalario('3500.50')).toBe(3500.5);
  });
});
