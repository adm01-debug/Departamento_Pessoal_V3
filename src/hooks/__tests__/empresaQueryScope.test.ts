import { describe, it, expect } from 'vitest';
import { GLOBAL_QUERY_KEYS, isGlobalQueryKey } from '@/hooks/useEmpresas';

/**
 * Garante que a invalidação de cache na troca de empresa é fail-safe:
 * qualquer chave desconhecida DEVE ser tratada como tenant-scoped.
 */
describe('escopo de cache por empresa', () => {
  it('preserva apenas chaves globais conhecidas', () => {
    for (const key of GLOBAL_QUERY_KEYS) {
      expect(isGlobalQueryKey(key)).toBe(true);
    }
  });

  it('trata chaves novas/desconhecidas como tenant-scoped', () => {
    const novas = [
      'sst-extintores',
      'sst-cat',
      'sst-regimento',
      'documentos',
      'colaboradores-simples',
      'contratos-gerados',
      'chave-que-ainda-nao-existe',
    ];
    for (const key of novas) {
      expect(isGlobalQueryKey(key)).toBe(false);
    }
  });

  it('ignora chaves não string (objetos, números, undefined)', () => {
    expect(isGlobalQueryKey(undefined)).toBe(false);
    expect(isGlobalQueryKey(42)).toBe(false);
    expect(isGlobalQueryKey({ scope: 'user-empresas' })).toBe(false);
  });

  it('não contém chaves sensíveis a tenant na lista global', () => {
    const proibidas = ['colaboradores', 'folhas', 'ferias', 'documentos', 'batidas-ponto'];
    for (const key of proibidas) {
      expect(GLOBAL_QUERY_KEYS).not.toContain(key);
    }
  });
});
