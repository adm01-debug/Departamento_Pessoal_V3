import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { deepChain } from '@/test/deepChain';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => deepChain(mockFrom(...args)) },
}));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));

interface ListChain {
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  then: (fn: (v?: unknown) => unknown) => Promise<unknown>;
  catch: (fn: (v?: unknown) => unknown) => Promise<unknown>;
  finally: (fn: () => void) => Promise<unknown>;
}

function setupListChain(data: unknown[] = [], error: unknown = null) {
  const response = { data, error };
  const chain = {} as ListChain;
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.then = (fn) => Promise.resolve(response).then(fn);
  chain.catch = (fn) => Promise.resolve(response).catch(fn);
  chain.finally = (fn) => Promise.resolve(response).finally(fn);
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries sst_incidentes scoped by colaborador and empresa, without descricao', async () => {
    const { selectFn, chain } = setupListChain([]);
    const { result } = renderHook(() => useIncidentesColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('sst_incidentes');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
    expect(selectFn).not.toHaveBeenCalledWith(expect.stringContaining('descricao'));
    expect(selectFn).not.toHaveBeenCalledWith(expect.stringContaining('medidas_tomadas'));
  });

  it('returns the rows read from the table', async () => {
    setupListChain([
      { id: 'inc-1', data_hora: '2026-01-02T10:00:00Z', tipo: 'Quase acidente', gravidade: 1, status: 'encerrado' },
    ]);
    const { result } = renderHook(() => useIncidentesColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
  });

  it('is disabled when no colaboradorId', () => {
    setupListChain([]);
    renderHook(() => useIncidentesColaborador(''), { wrapper });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('useCatColaborador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries sst_cat scoped by colaborador and empresa, without cid_principal/cid_secundarios', async () => {
    const { selectFn, chain } = setupListChain([]);
    const { result } = renderHook(() => useCatColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('sst_cat');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
    expect(selectFn).not.toHaveBeenCalledWith(expect.stringContaining('cid_principal'));
    expect(selectFn).not.toHaveBeenCalledWith(expect.stringContaining('cid_secundarios'));
  });
});

describe('useRiscosColaborador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries sst_exposicao_riscos scoped by colaborador_id only (no empresa_id column)', async () => {
    const { chain } = setupListChain([]);
    const { result } = renderHook(() => useRiscosColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('sst_exposicao_riscos');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
    expect(chain.eq).not.toHaveBeenCalledWith('empresa_id', expect.anything());
  });

  it('is disabled when no colaboradorId', () => {
    setupListChain([]);
    renderHook(() => useRiscosColaborador(''), { wrapper });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
