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

import {
  useExecutiveKPIs,
  useStrategicFinancials,
  reconstruirHeadcountPorMes,
  variacaoUltimoMes,
} from '../useExecutiveDashboard';

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.gt = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockReturnValue(chain);
  chain.then = (fn: (v?: unknown) => unknown) => Promise.resolve(result).then(fn);
  chain.catch = (fn: (v?: unknown) => unknown) => Promise.resolve(result).catch(fn);
  chain.finally = (fn: (v?: unknown) => unknown) => Promise.resolve(result).finally(fn);
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

  it('computes real per-department cost from folha_itens of current payroll', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'colaboradores')
        return makeChain({
          data: [
            { id: 'c1', departamento: 'RH' },
            { id: 'c2', departamento: 'RH' },
            { id: 'c3', departamento: 'TI' },
          ],
          count: 3,
          error: null,
        });
      if (table === 'folhas_pagamento')
        return makeChain({ data: [{ id: 'f1', total_liquido: 9000 }], count: 1, error: null });
      if (table === 'folha_itens')
        return makeChain({
          data: [
            { colaborador_id: 'c1', total_liquido: 2000 },
            { colaborador_id: 'c2', total_liquido: 3000 },
            { colaborador_id: 'c3', total_liquido: 4000 },
          ],
          error: null,
        });
      return makeChain({ data: [], count: 0, error: null });
    });
    const { result } = renderHook(() => useExecutiveKPIs('emp-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.departamentos).toEqual([
      { nome: 'RH', value: 2, custo: 5000 },
      { nome: 'TI', value: 1, custo: 4000 },
    ]);
  });

  it('includes payroll items of employees terminated in the month in department cost', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'colaboradores') {
        const ativos = makeChain({ data: [{ id: 'c1', departamento: 'RH' }], count: 1, error: null });
        const desligados = makeChain({ data: [{ id: 'c9', departamento: 'TI' }], error: null });
        ativos.in = vi.fn().mockReturnValue(desligados);
        return ativos;
      }
      if (table === 'folhas_pagamento')
        return makeChain({ data: [{ id: 'f1', total_liquido: 5000 }], count: 1, error: null });
      if (table === 'folha_itens')
        return makeChain({
          data: [
            { id: 'i1', colaborador_id: 'c1', total_liquido: 2000 },
            { id: 'i2', colaborador_id: 'c9', total_liquido: 3000 },
          ],
          error: null,
        });
      return makeChain({ data: [], count: 0, error: null });
    });
    const { result } = renderHook(() => useExecutiveKPIs('emp-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.departamentos).toEqual([
      { nome: 'RH', value: 1, custo: 2000 },
      { nome: 'TI', value: 0, custo: 3000 },
    ]);
  });

  it('paginates folha_itens beyond the 1000-row PostgREST limit', async () => {
    const pagina1 = Array.from({ length: 1000 }, (_, i) => ({ id: `i${i}`, colaborador_id: 'c1', total_liquido: 1 }));
    const pagina2 = [{ id: 'i1000', colaborador_id: 'c1', total_liquido: 1 }];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'colaboradores')
        return makeChain({ data: [{ id: 'c1', departamento: 'RH' }], count: 1, error: null });
      if (table === 'folhas_pagamento')
        return makeChain({ data: [{ id: 'f1', total_liquido: 1001 }], count: 1, error: null });
      if (table === 'folha_itens') {
        const chain = makeChain({ data: [], error: null });
        chain.range = vi.fn((from: number) => makeChain({ data: from === 0 ? pagina1 : pagina2, error: null }));
        return chain;
      }
      return makeChain({ data: [], count: 0, error: null });
    });
    const { result } = renderHook(() => useExecutiveKPIs('emp-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.departamentos).toEqual([{ nome: 'RH', value: 1, custo: 1001 }]);
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

/**
 * Variação do quadro de pessoal no painel — resgatada da PR #546 (muri),
 * `HeadcountOverviewCard.tsx:26-32` e `:78-86`. Antes o painel mostrava o total
 * de ativos de hoje e as barras de admissões/demissões, mas nenhum número
 * dizendo se a empresa cresceu ou encolheu no mês.
 */
describe('reconstruirHeadcountPorMes / variacaoUltimoMes', () => {
  it('reconstrói o headcount descontando o saldo dos meses POSTERIORES', () => {
    // Hoje há 100 ativos. O último mês fechou +5 e o anterior +3.
    const evolucao = [
      { saldo: 2 }, // 100 - (3 + 5) = 92
      { saldo: 3 }, // 100 - 5      = 95
      { saldo: 5 }, // 100          = 100
    ];
    expect(reconstruirHeadcountPorMes(evolucao, 100)).toEqual([92, 95, 100]);
  });

  it('nunca devolve headcount negativo', () => {
    // Saldo posterior maior que o total de hoje (base incompleta no período).
    expect(reconstruirHeadcountPorMes([{ saldo: 50 }, { saldo: 80 }], 10)).toEqual([0, 10]);
  });

  it('calcula a variação do último mês contra o anterior', () => {
    expect(variacaoUltimoMes([95, 100])).toBeCloseTo(5.263, 3);
    expect(variacaoUltimoMes([100, 95])).toBeCloseTo(-5, 3);
  });

  it('devolve undefined (não 0) quando não há base de comparação', () => {
    // 0 diria "estável" para quem não tem com o que comparar, e o painel
    // mostraria um "+0,0%" falso.
    expect(variacaoUltimoMes([])).toBeUndefined();
    expect(variacaoUltimoMes([42])).toBeUndefined();
    expect(variacaoUltimoMes([0, 7])).toBeUndefined();
  });

  it('ponta a ponta: 100 ativos com saldos 3 e 5 dá +5,3% no mês', () => {
    const serie = reconstruirHeadcountPorMes([{ saldo: 2 }, { saldo: 3 }, { saldo: 5 }], 100);
    expect(variacaoUltimoMes(serie)).toBeCloseTo(5.263, 3);
  });
});
