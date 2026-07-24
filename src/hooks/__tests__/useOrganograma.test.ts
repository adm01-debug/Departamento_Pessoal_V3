import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

import { useOrganograma } from '../useOrganograma';

function buildChain(data: any[]) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve({ data, error: null }).then(fn);
  chain.catch = (fn: any) => Promise.resolve({ data, error: null }).catch(fn);
  chain.finally = (fn: any) => Promise.resolve({ data, error: null }).finally(fn);
  return chain;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useOrganograma', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'departamentos') return buildChain([]);
      if (table === 'colaboradores') return buildChain([]);
      return buildChain([]);
    });
  });

  it('returns empty dados initially', async () => {
    const { result } = renderHook(() => useOrganograma(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.dados).toEqual([]);
  });

  it('queries departamentos table', async () => {
    const { result } = renderHook(() => useOrganograma(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('departamentos');
  });

  it('queries colaboradores table', async () => {
    const { result } = renderHook(() => useOrganograma(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('colaboradores');
  });

  it('builds hierarchical structure from departamentos', async () => {
    const deps = [
      { id: 'd1', nome: 'TI', departamento_pai_id: null },
      { id: 'd2', nome: 'Backend', departamento_pai_id: 'd1' },
    ];
    const cols = [{ id: 'c1', nome_completo: 'Dev', departamento: 'TI', email: null, foto_url: null }];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'departamentos') return buildChain(deps);
      if (table === 'colaboradores') return buildChain(cols);
      return buildChain([]);
    });

    const { result } = renderHook(() => useOrganograma(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.dados).toHaveLength(1);
    expect(result.current.dados[0].nome).toBe('TI');
    expect(result.current.dados[0].sub_departamentos).toHaveLength(1);
    expect(result.current.dados[0].colaboradores).toHaveLength(1);
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useOrganograma(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });
});
