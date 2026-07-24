import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockCargoService } = vi.hoisted(() => ({
  mockCargoService: {
    listar: vi.fn().mockResolvedValue({ data: [{ id: 'c1', nome: 'Dev' }], total: 1 }),
    criar: vi.fn().mockResolvedValue({ id: 'c2', nome: 'QA' }),
    atualizar: vi.fn().mockResolvedValue({}),
    excluir: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/services/cargoService', () => ({ cargoService: mockCargoService }));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useCargos } from '../useCargos';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useCargos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns cargos array', async () => {
    const { result } = renderHook(() => useCargos(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.cargos)).toBe(true);
  });

  it('cargos contains data from service', async () => {
    const { result } = renderHook(() => useCargos(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.cargos.length).toBeGreaterThanOrEqual(0);
  });

  it('exposes criar function', async () => {
    const { result } = renderHook(() => useCargos(), { wrapper });
    expect(typeof result.current.criar).toBe('function');
  });

  it('exposes atualizar and excluir', async () => {
    const { result } = renderHook(() => useCargos(), { wrapper });
    expect(typeof result.current.atualizar).toBe('function');
    expect(typeof result.current.excluir).toBe('function');
  });
});
