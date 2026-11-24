import { describe, it, expect } from 'vitest';
import { required, isValidEmail, isValidCPF, isValidCNPJ, isValidDate, isPositiveNumber } from '../validators';

describe('required', () => {
  it('rejeita null, undefined e string vazia', () => {
    expect(required(null)).toBe('Este campo é obrigatório');
    expect(required(undefined)).toBe('Este campo é obrigatório');
    expect(required('')).toBe('Este campo é obrigatório');
  });
  it('aceita valores presentes, incluindo 0 e false', () => {
    expect(required('x')).toBeUndefined();
    expect(required(0)).toBeUndefined();
    expect(required(false)).toBeUndefined();
  });
});

describe('isValidEmail', () => {
  it('vazio passa (opcional)', () => {
    expect(isValidEmail('')).toBeUndefined();
  });
  it('aceita e-mails válidos', () => {
    expect(isValidEmail('a@b.com')).toBeUndefined();
    expect(isValidEmail('user.name+tag@dominio.com.br')).toBeUndefined();
  });
  it('rejeita formatos inválidos', () => {
    expect(isValidEmail('sem-arroba')).toBe('Email inválido');
    expect(isValidEmail('a@b')).toBe('Email inválido');
    expect(isValidEmail('a b@c.com')).toBe('Email inválido');
  });
});

describe('isValidCPF', () => {
  it('vazio passa (opcional)', () => {
    expect(isValidCPF('')).toBeUndefined();
  });
  it('exige 11 dígitos', () => {
    expect(isValidCPF('12345')).toBe('CPF deve ter 11 dígitos');
  });
  it('aceita CPF válido com e sem máscara', () => {
    expect(isValidCPF('52998224725')).toBeUndefined();
    expect(isValidCPF('529.982.247-25')).toBeUndefined();
    expect(isValidCPF('111.444.777-35')).toBeUndefined();
  });
  it('rejeita dígito verificador errado', () => {
    expect(isValidCPF('52998224726')).toBe('CPF inválido');
    expect(isValidCPF('12345678900')).toBe('CPF inválido');
  });
});

describe('isValidCNPJ', () => {
  it('vazio passa (opcional)', () => {
    expect(isValidCNPJ('')).toBeUndefined();
  });
  it('exige 14 dígitos', () => {
    expect(isValidCNPJ('123')).toBe('CNPJ deve ter 14 dígitos');
  });
  it('rejeita sequência de dígitos iguais', () => {
    expect(isValidCNPJ('11111111111111')).toBe('CNPJ inválido');
  });
  it('aceita CNPJ com formato válido', () => {
    expect(isValidCNPJ('11.222.333/0001-81')).toBeUndefined();
  });
});

describe('isValidDate', () => {
  it('vazio passa (opcional)', () => {
    expect(isValidDate('')).toBeUndefined();
  });
  it('aceita datas parseáveis', () => {
    expect(isValidDate('2026-10-11')).toBeUndefined();
    expect(isValidDate('2026-10-11T10:00:00Z')).toBeUndefined();
  });
  it('rejeita string não parseável', () => {
    expect(isValidDate('não-é-data')).toBe('Data inválida');
  });
});

describe('isPositiveNumber', () => {
  it('aceita zero e positivos', () => {
    expect(isPositiveNumber(0)).toBeUndefined();
    expect(isPositiveNumber(1.5)).toBeUndefined();
  });
  it('rejeita negativos e NaN', () => {
    expect(isPositiveNumber(-1)).toBe('Valor deve ser um número positivo');
    expect(isPositiveNumber(NaN)).toBe('Valor deve ser um número positivo');
  });
});
