import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { deepChain } from '@/test/deepChain';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => deepChain(mockFrom(...a)) },
}));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));

function setupListChain(data: any[], error: any = null) {
  const response = { data, error };
  const chain: any = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve(response).then(fn);
  chain.catch = (fn: any) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: any) => Promise.resolve(response).finally(fn);
  const selectFn = vi.fn().mockReturnValue(chain);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, chain };
}

import { useIncidentesColaborador, useCatColaborador, useRiscosColaborador } from '../useSSTColaborador';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useIncidentesColaborador', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('queries sst_incidentes scoped by colaborador and empresa, without descricao', async () => {
    const { selectFn, chain } = setupListChain([]);
    const { result } = renderHook(() => useIncidentesColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('sst_incidentes');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
    expect(selectFn).not.toHaveBeenCalledWith(expect.stringContaining('descricao'));
  });
});

describe('useCatColaborador', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('queries sst_cat scoped by colaborador, without cid_principal/cid_secundarios', async () => {
    const { selectFn, chain } = setupListChain([]);
    const { result } = renderHook(() => useCatColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('sst_cat');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
    expect(selectFn).not.toHaveBeenCalledWith(expect.stringContaining('cid_principal'));
    expect(selectFn).not.toHaveBeenCalledWith(expect.stringContaining('cid_secundarios'));
  });
});

describe('useRiscosColaborador', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('queries sst_exposicao_riscos scoped by colaborador_id only (no empresa_id column)', async () => {
    const { chain } = setupListChain([]);
    const { result } = renderHook(() => useRiscosColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('sst_exposicao_riscos');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
  });

  it('is disabled when no colaboradorId', () => {
    renderHook(() => useRiscosColaborador(''), { wrapper });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
