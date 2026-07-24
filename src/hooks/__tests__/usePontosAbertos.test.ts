import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockListar } = vi.hoisted(() => ({ mockListar: vi.fn() }));

vi.mock('@/services/pontoAbertoService', () => ({
  pontoAbertoService: { listar: mockListar },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

import { usePontosAbertos } from '../usePontosAbertos';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('usePontosAbertos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListar.mockResolvedValue([]);
  });

  it('returns empty pontosAbertos initially', async () => {
    const { result } = renderHook(() => usePontosAbertos(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pontosAbertos).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('calls pontoAbertoService.listar with empresaId', async () => {
    const { result } = renderHook(() => usePontosAbertos(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListar).toHaveBeenCalledWith('emp-1');
  });

  it('returns pontosAbertos from service', async () => {
    mockListar.mockResolvedValue([{ id: 'pa1', colaborador_id: 'col-1' }, { id: 'pa2', colaborador_id: 'col-2' }]);
    const { result } = renderHook(() => usePontosAbertos(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pontosAbertos).toHaveLength(2);
    expect(result.current.total).toBe(2);
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => usePontosAbertos(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });
});
