import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  mockListar, mockCriar, mockAtualizar, mockExcluir,
  mockToastSuccess, mockToastError,
} = vi.hoisted(() => ({
  mockListar: vi.fn(),
  mockCriar: vi.fn(),
  mockAtualizar: vi.fn(),
  mockExcluir: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/services/intervaloService', () => ({
  intervaloService: { listar: mockListar, criar: mockCriar, atualizar: mockAtualizar, excluir: mockExcluir },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

import { useConfiguracoesIntervalo } from '../useConfiguracoesIntervalo';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useConfiguracoesIntervalo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListar.mockResolvedValue([]);
  });

  it('returns empty configuracoes initially', async () => {
    const { result } = renderHook(() => useConfiguracoesIntervalo(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.configuracoes).toEqual([]);
  });

  it('calls intervaloService.listar with empresaId', async () => {
    const { result } = renderHook(() => useConfiguracoesIntervalo(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListar).toHaveBeenCalledWith('emp-1');
  });

  it('returns configuracoes from service', async () => {
    mockListar.mockResolvedValue([{ id: 'i1', duracao_minutos: 60 }]);
    const { result } = renderHook(() => useConfiguracoesIntervalo(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.configuracoes).toHaveLength(1);
  });

  it('criar calls service with empresa_id injected and shows success toast', async () => {
    mockCriar.mockResolvedValue({ id: 'i1' });
    const { result } = renderHook(() => useConfiguracoesIntervalo(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.criar({ duracao_minutos: 60 });
    });

    expect(mockCriar).toHaveBeenCalledWith(expect.objectContaining({ duracao_minutos: 60, empresa_id: 'emp-1' }));
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Configuração de intervalo criada'));
  });

  it('atualizar calls service with id and data', async () => {
    mockAtualizar.mockResolvedValue({ id: 'i1' });
    const { result } = renderHook(() => useConfiguracoesIntervalo(), { wrapper });

    await act(async () => {
      await result.current.atualizar({ id: 'i1', data: { duracao_minutos: 30 } });
    });

    expect(mockAtualizar).toHaveBeenCalledWith('i1', { duracao_minutos: 30 });
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Configuração atualizada'));
  });

  it('excluir calls service with id and shows success toast', async () => {
    mockExcluir.mockResolvedValue(undefined);
    const { result } = renderHook(() => useConfiguracoesIntervalo(), { wrapper });

    await act(async () => {
      await result.current.excluir('i1');
    });

    expect(mockExcluir).toHaveBeenCalledWith('i1');
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Configuração excluída'));
  });
});
