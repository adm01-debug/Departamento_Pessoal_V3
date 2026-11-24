import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockListar, mockCriar, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockListar: vi.fn(),
  mockCriar: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/services/contratoService', () => ({
  contratoService: { listar: mockListar, criar: mockCriar },
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

import { useContratos } from '../useContratos';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useContratos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListar.mockResolvedValue([]);
  });

  it('returns empty contratos initially', async () => {
    const { result } = renderHook(() => useContratos(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.contratos).toEqual([]);
  });

  it('calls contratoService.listar with empresaId', async () => {
    const { result } = renderHook(() => useContratos(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListar).toHaveBeenCalledWith('emp-1');
  });

  it('returns contratos from service', async () => {
    const contratos = [{ id: 'c1', colaborador_id: 'col1' }];
    mockListar.mockResolvedValue(contratos);

    const { result } = renderHook(() => useContratos(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.contratos).toEqual(contratos);
  });

  it('criar calls contratoService.criar with empresa_id injected', async () => {
    mockCriar.mockResolvedValue({ id: 'c1' });

    const { result } = renderHook(() => useContratos(), { wrapper });

    await act(async () => {
      await result.current.criar({ colaborador_id: 'col1', tipo: 'clt' });
    });

    expect(mockCriar).toHaveBeenCalledWith(expect.objectContaining({
      colaborador_id: 'col1',
      empresa_id: 'emp-1',
    }));
  });

  it('criar shows success toast', async () => {
    mockCriar.mockResolvedValue({ id: 'c1' });

    const { result } = renderHook(() => useContratos(), { wrapper });

    await act(async () => {
      await result.current.criar({ colaborador_id: 'col1' });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Contrato criado');
  });

  it('criar shows error toast on failure', async () => {
    mockCriar.mockRejectedValue(new Error('failed to create'));

    const { result } = renderHook(() => useContratos(), { wrapper });

    await act(async () => {
      await result.current.criar({ colaborador_id: 'col1' }).catch(() => {});
    });

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('failed to create'));
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useContratos(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });
});
