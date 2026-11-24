import { describe, expect, it } from 'vitest';
import {
  maskCNPJ,
  maskCPF,
  maskContaBancaria,
  sanitizeForLogging,
  validateCNPJ,
  validateCPF,
} from '../encryptionService';

describe('validateCPF', () => {
  it('aceita CPF válido (com e sem máscara)', () => {
    expect(validateCPF('529.982.247-25')).toBe(true);
    expect(validateCPF('52998224725')).toBe(true);
  });

  it('rejeita dígito verificador errado', () => {
    expect(validateCPF('529.982.247-26')).toBe(false);
  });

  it('rejeita tamanho errado e sequências repetidas', () => {
    expect(validateCPF('123')).toBe(false);
    expect(validateCPF('111.111.111-11')).toBe(false);
    expect(validateCPF('00000000000')).toBe(false);
    expect(validateCPF('')).toBe(false);
  });
});

describe('validateCNPJ', () => {
  it('aceita 14 dígitos não-repetidos; rejeita tamanho errado e repetidos', () => {
    expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
    expect(validateCNPJ('11222333000181')).toBe(true);
    expect(validateCNPJ('123')).toBe(false);
    expect(validateCNPJ('11111111111111')).toBe(false);
  });
});

describe('maskCPF / maskCNPJ / maskContaBancaria', () => {
  it('maskCPF expõe só 3 primeiros e 2 últimos dígitos', () => {
    expect(maskCPF('529.982.247-25')).toBe('529.***.25**');
    // tamanho errado → devolve a entrada sem alterar
    expect(maskCPF('123')).toBe('123');
  });

  it('maskCNPJ expõe 2 primeiros e 2 últimos dígitos', () => {
    expect(maskCNPJ('11.222.333/0001-81')).toBe('11.***.81/**');
    expect(maskCNPJ('curto')).toBe('curto');
  });

  it('maskContaBancaria guarda só os 4 últimos dígitos', () => {
    expect(maskContaBancaria('12345-6')).toBe('****45-6');
    expect(maskContaBancaria('12')).toBe('****');
  });
});

describe('sanitizeForLogging', () => {
  it('redacta campos sensíveis por nome (substring, case-insensitive)', () => {
    const out = sanitizeForLogging({
      nome: 'João',
      cpf: '52998224725',
      contaBancaria: '12345-6',
      agencia: '0001',
      senha: 'segredo',
      salario: 5000,
      ok: 'valor',
    });
    expect(out.cpf).toBe('[REDACTED-11chars]');
    expect(out.contaBancaria).toBe('[REDACTED-7chars]');
    expect(out.agencia).toBe('[REDACTED-4chars]');
    expect(out.senha).toBe('[REDACTED-7chars]');
    // nome e campos não-sensíveis intactos; salario é número → não redactado (só strings)
    expect(out.nome).toBe('João');
    expect(out.ok).toBe('valor');
    expect(out.salario).toBe(5000);
  });

  it('não muta o objeto original', () => {
    const orig = { cpf: '123' };
    sanitizeForLogging(orig);
    expect(orig.cpf).toBe('123');
  });
});
