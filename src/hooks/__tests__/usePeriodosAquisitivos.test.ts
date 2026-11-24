import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

import { usePeriodosAquisitivos } from '../usePeriodosAquisitivos';

function buildChain(data: any[] = []) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve({ data, error: null }).then(fn);
  chain.catch = (fn: any) => Promise.resolve({ data, error: null }).catch(fn);
  chain.finally = (fn: any) => Promise.resolve({ data, error: null }).finally(fn);
  mockFrom.mockReturnValue(chain);
  return chain;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('usePeriodosAquisitivos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildChain([]);
  });

  it('returns empty periodos and isLoading=false when no colaboradorId', () => {
    const { result } = renderHook(() => usePeriodosAquisitivos(undefined), { wrapper });
    expect(result.current.periodos).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('queries periodos_aquisitivos with colaboradorId', async () => {
    const { result } = renderHook(() => usePeriodosAquisitivos('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('periodos_aquisitivos');
  });

  it('returns periodos from service', async () => {
    buildChain([{ id: 'p1', data_inicio: '2023-01-01', data_fim: '2023-12-31' }]);
    const { result } = renderHook(() => usePeriodosAquisitivos('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.periodos).toHaveLength(1);
    expect(result.current.periodos[0].id).toBe('p1');
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => usePeriodosAquisitivos('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });
});
