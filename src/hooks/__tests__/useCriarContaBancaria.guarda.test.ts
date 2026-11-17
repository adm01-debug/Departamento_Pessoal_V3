import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Guarda de tenant resgatada da branch `muri`: `empresa_id` vem SEMPRE do
// contexto, nunca de campo do formulario. Sem empresa selecionada a main
// fazia `empresaAtual!.id` e estourava TypeError no navegador, sem dizer ao
// usuario o que fazer.
//
// Este arquivo existe separado de `useTabelasReferencia.test.ts` porque
// aquele fixa a empresa canonica pelo `empresaMock`; aqui o caso e justamente
// NAO ter empresa.
const { mockCriarContaBancaria } = vi.hoisted(() => ({ mockCriarContaBancaria: vi.fn() }));

vi.mock('@/services/tabelasReferenciaService', () => ({
  criarContaBancaria: mockCriarContaBancaria,
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({
    empresaAtual: null,
    empresaAtualId: undefined,
    userEmpresas: [],
    todasEmpresas: [],
    modo: 'empresa_unica' as const,
    isConsolidado: false,
  }),
}));

import { useCriarContaBancaria } from '../useTabelasReferencia';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useCriarContaBancaria sem empresa selecionada', () => {
  beforeEach(() => vi.clearAllMocks());

  it('falha com mensagem de negocio e NAO chama o servico', async () => {
    const { result } = renderHook(() => useCriarContaBancaria(), { wrapper });
    await expect(
      result.current.mutateAsync({ colaborador_id: 'col-1', banco_nome: 'Banco X' })
    ).rejects.toThrow(/Selecione uma empresa/);
    expect(mockCriarContaBancaria).not.toHaveBeenCalled();
  });
});
