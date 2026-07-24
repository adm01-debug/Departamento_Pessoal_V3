import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom, rpc: mockRpc },
}));

import { useExecutiveKPIs, useStrategicFinancials } from '../useExecutiveDashboard';

function makeChain(result: any) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.gt = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve(result).then(fn);
  chain.catch = (fn: any) => Promise.resolve(result).catch(fn);
  chain.finally = (fn: any) => Promise.resolve(result).finally(fn);
  return chain;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useExecutiveKPIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => makeChain({ data: [], count: 0, error: null }));
  });

  it('is disabled when no empresaId', () => {
    renderHook(() => useExecutiveKPIs(undefined), { wrapper });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns data when empresaId provided', async () => {
    const { result } = renderHook(() => useExecutiveKPIs('emp-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeDefined();
  });

  it('returns totalAtivos=0 when no employees', async () => {
    const { result } = renderHook(() => useExecutiveKPIs('emp-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.totalAtivos).toBe(0);
  });

  it('returns feriasPendentes=0 when none pending', async () => {
    const { result } = renderHook(() => useExecutiveKPIs('emp-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.feriasPendentes).toBe(0);
  });

  it('returns evolucao array with correct length for default 6 months', async () => {
    const { result } = renderHook(() => useExecutiveKPIs('emp-1', '6'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.evolucao).toHaveLength(6);
  });

  it('returns custosMensal array matching period length', async () => {
    const { result } = renderHook(() => useExecutiveKPIs('emp-1', '3'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.custosMensal).toHaveLength(3);
  });

  it('computes variacaoFolha=0 when no previous payroll data', async () => {
    const { result } = renderHook(() => useExecutiveKPIs('emp-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.variacaoFolha).toBe(0);
  });
});

describe('useStrategicFinancials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => makeChain({ data: [], error: null }));
    mockRpc.mockResolvedValue({ data: [], error: null });
  });

  it('is disabled when no empresaId', () => {
    renderHook(() => useStrategicFinancials(undefined), { wrapper });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('calls get_personnel_cost_projection rpc when empresaId provided', async () => {
    const { result } = renderHook(() => useStrategicFinancials('emp-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockRpc).toHaveBeenCalledWith('get_personnel_cost_projection', {
      p_empresa_id: 'emp-1',
      p_months: 6,
    });
  });

  it('returns projections and budgets arrays', async () => {
    const { result } = renderHook(() => useStrategicFinancials('emp-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.data?.projections)).toBe(true);
    expect(Array.isArray(result.current.data?.budgets)).toBe(true);
  });
});
