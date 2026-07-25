import { describe, it, expect } from 'vitest';
import {
  required,
  maxLen,
  cpfValido,
  cnpjValido,
  dataValida,
  enumValido,
} from '../helpers';
import type { ValidationError } from '../helpers';

function errs(): ValidationError[] {
  return [];
}

// ─── required ────────────────────────────────────────────────────────────────

describe('required', () => {
  it('adds no error for a non-empty string', () => {
    const e = errs();
    required('hello', 'campo', e);
    expect(e).toHaveLength(0);
  });

  it('adds error for empty string', () => {
    const e = errs();
    required('', 'campo', e);
    expect(e[0].campo).toBe('campo');
    expect(e[0].regra).toBe('REGRA_OBRIGATORIO');
  });

  it('adds error for null', () => {
    const e = errs();
    required(null, 'campo', e);
    expect(e).toHaveLength(1);
  });

  it('adds error for undefined', () => {
    const e = errs();
    required(undefined, 'campo', e);
    expect(e).toHaveLength(1);
  });

  it('adds no error for 0 (falsy but not null/undefined/empty)', () => {
    const e = errs();
    required(0, 'campo', e);
    expect(e).toHaveLength(0);
  });

  it('adds no error for false', () => {
    const e = errs();
    required(false, 'campo', e);
    expect(e).toHaveLength(0);
  });
});

// ─── maxLen ──────────────────────────────────────────────────────────────────

describe('maxLen', () => {
  it('adds no error when length is within max', () => {
    const e = errs();
    maxLen('hello', 10, 'campo', e);
    expect(e).toHaveLength(0);
  });

  it('adds no error when length equals max', () => {
    const e = errs();
    maxLen('hello', 5, 'campo', e);
    expect(e).toHaveLength(0);
  });

  it('adds error when length exceeds max', () => {
    const e = errs();
    maxLen('toolongstring', 5, 'campo', e);
    expect(e[0].campo).toBe('campo');
    expect(e[0].regra).toBe('REGRA_TAMANHO_MAX');
    expect(e[0].mensagem).toMatch(/5 caracteres/);
  });

  it('adds no error for null', () => {
    const e = errs();
    maxLen(null, 5, 'campo', e);
    expect(e).toHaveLength(0);
  });

  it('adds no error for undefined', () => {
    const e = errs();
    maxLen(undefined, 5, 'campo', e);
    expect(e).toHaveLength(0);
  });
});

// ─── cpfValido ───────────────────────────────────────────────────────────────

describe('cpfValido', () => {
  it('adds no error for valid CPF', () => {
    const e = errs();
    cpfValido('11144477735', 'cpf', e);
    expect(e).toHaveLength(0);
  });

  it('adds no error for valid CPF with mask', () => {
    const e = errs();
    cpfValido('111.444.777-35', 'cpf', e);
    expect(e).toHaveLength(0);
  });

  it('adds no error for null (optional)', () => {
    const e = errs();
    cpfValido(null, 'cpf', e);
    expect(e).toHaveLength(0);
  });

  it('adds no error for undefined', () => {
    const e = errs();
    cpfValido(undefined, 'cpf', e);
    expect(e).toHaveLength(0);
  });

  it('adds error for CPF with wrong length', () => {
    const e = errs();
    cpfValido('123456', 'cpf', e);
    expect(e[0].regra).toBe('REGRA_CPF');
  });

  it('adds error for all-same-digit CPF (111.111.111-11)', () => {
    const e = errs();
    cpfValido('11111111111', 'cpf', e);
    expect(e[0].regra).toBe('REGRA_CPF');
  });

  it('adds error for CPF with wrong check digit', () => {
    const e = errs();
    cpfValido('11144477734', 'cpf', e);
    expect(e[0].regra).toBe('REGRA_CPF');
  });
});

// ─── cnpjValido ──────────────────────────────────────────────────────────────

describe('cnpjValido', () => {
  it('adds no error for valid CNPJ', () => {
    const e = errs();
    cnpjValido('11222333000181', 'cnpj', e);
    expect(e).toHaveLength(0);
  });

  it('adds no error for valid CNPJ with mask', () => {
    const e = errs();
    cnpjValido('11.222.333/0001-81', 'cnpj', e);
    expect(e).toHaveLength(0);
  });

  it('adds no error for null', () => {
    const e = errs();
    cnpjValido(null, 'cnpj', e);
    expect(e).toHaveLength(0);
  });

  it('adds no error for undefined', () => {
    const e = errs();
    cnpjValido(undefined, 'cnpj', e);
    expect(e).toHaveLength(0);
  });

  it('adds error for CNPJ with wrong length', () => {
    const e = errs();
    cnpjValido('12345', 'cnpj', e);
    expect(e[0].regra).toBe('REGRA_CNPJ');
  });

  it('adds error for all-same-digit CNPJ', () => {
    const e = errs();
    cnpjValido('11111111111111', 'cnpj', e);
    expect(e[0].regra).toBe('REGRA_CNPJ');
  });

  it('adds error for CNPJ with wrong check digit', () => {
    const e = errs();
    cnpjValido('11222333000182', 'cnpj', e);
    expect(e[0].regra).toBe('REGRA_CNPJ');
  });
});

// ─── dataValida ──────────────────────────────────────────────────────────────

describe('dataValida', () => {
  it('adds no error for valid ISO date', () => {
    const e = errs();
    dataValida('2024-01-15', 'dt', e);
    expect(e).toHaveLength(0);
  });

  it('adds no error for null', () => {
    const e = errs();
    dataValida(null, 'dt', e);
    expect(e).toHaveLength(0);
  });

  it('adds no error for undefined', () => {
    const e = errs();
    dataValida(undefined, 'dt', e);
    expect(e).toHaveLength(0);
  });

  it('adds error for invalid date string', () => {
    const e = errs();
    dataValida('not-a-date', 'dt', e);
    expect(e[0].campo).toBe('dt');
    expect(e[0].regra).toBe('REGRA_DATA');
  });
});

// ─── enumValido ──────────────────────────────────────────────────────────────

describe('enumValido', () => {
  it('adds no error when value is in options list', () => {
    const e = errs();
    enumValido('A', ['A', 'B', 'C'], 'campo', e);
    expect(e).toHaveLength(0);
  });

  it('adds error when value is not in options list', () => {
    const e = errs();
    enumValido('Z', ['A', 'B', 'C'], 'campo', e);
    expect(e[0].regra).toBe('REGRA_ENUM');
    expect(e[0].mensagem).toMatch(/Z/);
    expect(e[0].mensagem).toMatch(/A, B, C/);
  });

  it('adds no error for null', () => {
    const e = errs();
    enumValido(null, ['A', 'B'], 'campo', e);
    expect(e).toHaveLength(0);
  });

  it('adds no error for undefined', () => {
    const e = errs();
    enumValido(undefined, ['A', 'B'], 'campo', e);
    expect(e).toHaveLength(0);
  });
});
