import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockListar, mockCriar, mockExcluir, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockListar: vi.fn(),
  mockCriar: vi.fn(),
  mockExcluir: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/services/historicoContratoService', () => ({
  historicoContratoService: { listar: mockListar, criar: mockCriar, excluir: mockExcluir },
}));

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

import { useHistoricoContratos } from '../useHistoricoContratos';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useHistoricoContratos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListar.mockResolvedValue([]);
  });

  it('returns empty historico when no data', async () => {
    const { result } = renderHook(() => useHistoricoContratos('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.historico).toEqual([]);
  });

  it('calls historicoContratoService.listar with colaboradorId', async () => {
    const { result } = renderHook(() => useHistoricoContratos('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListar).toHaveBeenCalledWith('col-1');
  });

  it('returns historico from service', async () => {
    const historico = [{ id: 'h1', tipo: 'promocao' }];
    mockListar.mockResolvedValue(historico);

    const { result } = renderHook(() => useHistoricoContratos('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.historico).toEqual(historico);
  });

  it('criar injects colaborador_id into data', async () => {
    mockCriar.mockResolvedValue({ id: 'h1' });
    const { result } = renderHook(() => useHistoricoContratos('col-1'), { wrapper });

    await act(async () => {
      await result.current.criar({ tipo: 'promocao', salario: 5000 });
    });

    expect(mockCriar).toHaveBeenCalledWith(expect.objectContaining({
      colaborador_id: 'col-1',
      tipo: 'promocao',
    }));
  });

  it('criar shows success toast', async () => {
    mockCriar.mockResolvedValue({ id: 'h1' });
    const { result } = renderHook(() => useHistoricoContratos('col-1'), { wrapper });

    await act(async () => {
      await result.current.criar({ tipo: 'promocao' });
    });

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Alteração contratual registrada'));
  });

  it('excluir calls service with id', async () => {
    mockExcluir.mockResolvedValue(undefined);
    const { result } = renderHook(() => useHistoricoContratos('col-1'), { wrapper });

    await act(async () => {
      await result.current.excluir('h1');
    });

    expect(mockExcluir).toHaveBeenCalledWith('h1');
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Registro excluído'));
  });

  it('criar shows error toast on failure', async () => {
    mockCriar.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useHistoricoContratos('col-1'), { wrapper });

    await act(async () => {
      await result.current.criar({ tipo: 'promocao' }).catch(() => {});
    });

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('fail'));
  });

  it('is disabled when colaboradorId is empty string', async () => {
    const { result } = renderHook(() => useHistoricoContratos(''), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListar).not.toHaveBeenCalled();
  });
});
