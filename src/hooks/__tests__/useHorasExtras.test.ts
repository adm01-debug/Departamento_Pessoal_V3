import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockListar, mockCriar, mockAprovar, mockRejeitar, mockExcluir, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockListar: vi.fn(),
  mockCriar: vi.fn(),
  mockAprovar: vi.fn(),
  mockRejeitar: vi.fn(),
  mockExcluir: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/services/horaExtraService', () => ({
  horaExtraService: {
    listar: mockListar,
    criar: mockCriar,
    aprovar: mockAprovar,
    rejeitar: mockRejeitar,
    excluir: mockExcluir,
  },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

import { useHorasExtras } from '../useHorasExtras';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useHorasExtras', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListar.mockResolvedValue([]);
  });

  it('returns initial solicitacoes empty array', async () => {
    const { result } = renderHook(() => useHorasExtras(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.solicitacoes).toEqual([]);
  });

  it('calls horaExtraService.listar with empresaId', async () => {
    const { result } = renderHook(() => useHorasExtras(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListar).toHaveBeenCalledWith('emp-1');
  });

  it('returns solicitacoes from service', async () => {
    const solicitacoes = [{ id: 's1', colaborador_id: 'c1', horas: 2 }];
    mockListar.mockResolvedValue(solicitacoes);

    const { result } = renderHook(() => useHorasExtras(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.solicitacoes).toEqual(solicitacoes);
  });

  it('criar calls horaExtraService.criar with empresa_id and created_by', async () => {
    mockCriar.mockResolvedValue({ id: 'he1' });
    const { result } = renderHook(() => useHorasExtras(), { wrapper });

    await act(async () => {
      await result.current.criar({ colaborador_id: 'c1', horas: 2 });
    });

    expect(mockCriar).toHaveBeenCalledWith(expect.objectContaining({
      colaborador_id: 'c1',
      empresa_id: 'emp-1',
      created_by: 'user-1',
    }));
  });

  it('criar shows success toast', async () => {
    mockCriar.mockResolvedValue({ id: 'he1' });
    const { result } = renderHook(() => useHorasExtras(), { wrapper });

    await act(async () => {
      await result.current.criar({ colaborador_id: 'c1', horas: 2 });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('hora extra'));
  });

  it('aprovar calls horaExtraService.aprovar with id and userId', async () => {
    mockAprovar.mockResolvedValue({ id: 'he1' });
    const { result } = renderHook(() => useHorasExtras(), { wrapper });

    await act(async () => {
      await result.current.aprovar({ id: 'he1', obs: 'ok' });
    });

    expect(mockAprovar).toHaveBeenCalledWith('he1', 'user-1', 'ok');
  });

  it('rejeitar calls horaExtraService.rejeitar with id and userId', async () => {
    mockRejeitar.mockResolvedValue({ id: 'he1' });
    const { result } = renderHook(() => useHorasExtras(), { wrapper });

    await act(async () => {
      await result.current.rejeitar({ id: 'he1', obs: 'nok' });
    });

    expect(mockRejeitar).toHaveBeenCalledWith('he1', 'user-1', 'nok');
  });

  it('excluir calls horaExtraService.excluir with id', async () => {
    mockExcluir.mockResolvedValue(undefined);
    const { result } = renderHook(() => useHorasExtras(), { wrapper });

    await act(async () => {
      await result.current.excluir('he1');
    });

    expect(mockExcluir).toHaveBeenCalledWith('he1');
  });

  it('criar shows error toast on failure', async () => {
    mockCriar.mockRejectedValue(new Error('DB error'));
    const { result } = renderHook(() => useHorasExtras(), { wrapper });

    await act(async () => {
      await result.current.criar({ colaborador_id: 'c1' }).catch(() => {});
    });

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('DB error'));
  });
});
