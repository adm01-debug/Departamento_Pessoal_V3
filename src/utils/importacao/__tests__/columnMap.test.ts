import { describe, it, expect } from 'vitest';
import { COLUMN_MAP, TEMPLATE_HEADERS, normalizeHeader, mapColumns } from '../columnMap';

describe('normalizeHeader', () => {
  it('lowercases the header', () => {
    expect(normalizeHeader('Nome')).toBe('nome');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeHeader('  cpf  ')).toBe('cpf');
  });

  it('strips diacritics', () => {
    expect(normalizeHeader('Função')).toBe('funcao');
    expect(normalizeHeader('Salário')).toBe('salario');
    expect(normalizeHeader('Admissão')).toBe('admissao');
  });

  it('handles empty string', () => {
    expect(normalizeHeader('')).toBe('');
  });

  it('handles null/undefined gracefully', () => {
    expect(normalizeHeader(null as any)).toBe('');
    expect(normalizeHeader(undefined as any)).toBe('');
  });
});

describe('COLUMN_MAP', () => {
  it('maps "nome" to nome_completo', () => {
    expect(COLUMN_MAP['nome']).toBe('nome_completo');
  });

  it('maps "cpf" to cpf', () => {
    expect(COLUMN_MAP['cpf']).toBe('cpf');
  });

  it('maps "salario" to salario_base', () => {
    expect(COLUMN_MAP['salario']).toBe('salario_base');
  });

  it('maps "admissao" to data_admissao', () => {
    expect(COLUMN_MAP['admissao']).toBe('data_admissao');
  });

  it('maps "pis_pasep" to pis', () => {
    expect(COLUMN_MAP['pis_pasep']).toBe('pis');
  });
});

describe('TEMPLATE_HEADERS', () => {
  it('contains Nome Completo and CPF', () => {
    expect(TEMPLATE_HEADERS).toContain('Nome Completo');
    expect(TEMPLATE_HEADERS).toContain('CPF');
  });

  it('has 11 columns', () => {
    expect(TEMPLATE_HEADERS).toHaveLength(11);
  });
});

describe('mapColumns', () => {
  it('maps known headers to canonical field names', () => {
    const result = mapColumns(['Nome', 'CPF', 'Email']);
    expect(result[0]).toBe('nome_completo');
    expect(result[1]).toBe('cpf');
    expect(result[2]).toBe('email');
  });

  it('ignores unknown headers (no entry in result)', () => {
    const result = mapColumns(['Desconhecido', 'XYZ']);
    expect(result[0]).toBeUndefined();
    expect(result[1]).toBeUndefined();
  });

  it('handles mixed known/unknown headers', () => {
    const result = mapColumns(['Xpto', 'Salário', 'Cargo']);
    expect(result[0]).toBeUndefined();
    expect(result[1]).toBe('salario_base');
    expect(result[2]).toBe('cargo');
  });

  it('handles alias variants', () => {
    const result = mapColumns(['colaborador', 'celular', 'depto']);
    expect(result[0]).toBe('nome_completo');
    expect(result[1]).toBe('telefone');
    expect(result[2]).toBe('departamento');
  });

  it('returns empty object for empty array', () => {
    expect(mapColumns([])).toEqual({});
  });
});
