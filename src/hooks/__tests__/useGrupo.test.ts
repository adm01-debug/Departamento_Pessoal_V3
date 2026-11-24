import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/constants/regimes', () => ({
  getRegimeInfo: (regime: string) => ({ cor: '#888', label: regime }),
}));

import { useGrupo } from '../useGrupo';

function buildChain(data: any[] = []) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
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

const sampleEmpresas = [
  { id: 'e1', razao_social: 'Empresa A', nome_fantasia: 'A', cnpj: '11.222.333/0001-81', ativa: true, regime_tributario: 'simples', aliquota_simples: 6, fap: 1, rat: 1, terceiros: 5.8, cor_identificacao: '#f00', ordem_exibicao: 1 },
  { id: 'e2', razao_social: 'Empresa B', nome_fantasia: null, cnpj: '22.333.444/0001-00', ativa: false, regime_tributario: 'lucro_presumido', aliquota_simples: null, fap: 1, rat: 2, terceiros: 5.8, cor_identificacao: null, ordem_exibicao: 2 },
];

describe('useGrupo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildChain([]);
  });

  it('returns empty arrays initially', async () => {
    const { result } = renderHook(() => useGrupo(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.empresas).toEqual([]);
    expect(result.current.totalEmpresas).toBe(0);
    expect(result.current.totalAtivas).toBe(0);
  });

  it('queries empresas table', async () => {
    const { result } = renderHook(() => useGrupo(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('empresas');
  });

  it('returns empresas from service', async () => {
    buildChain(sampleEmpresas);
    const { result } = renderHook(() => useGrupo(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalEmpresas).toBe(2);
  });

  it('computes totalAtivas correctly', async () => {
    buildChain(sampleEmpresas);
    const { result } = renderHook(() => useGrupo(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalAtivas).toBe(1);
    expect(result.current.empresasAtivas).toHaveLength(1);
    expect(result.current.empresasAtivas[0].id).toBe('e1');
  });

  it('builds empresasIds list', async () => {
    buildChain(sampleEmpresas);
    const { result } = renderHook(() => useGrupo(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.empresasIds).toEqual(['e1', 'e2']);
  });

  it('builds nomesPorEmpresa using nome_fantasia when available, fallback to razao_social', async () => {
    buildChain(sampleEmpresas);
    const { result } = renderHook(() => useGrupo(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.nomesPorEmpresa['e1']).toBe('A');
    expect(result.current.nomesPorEmpresa['e2']).toBe('Empresa B');
  });

  it('builds coresPorEmpresa using cor_identificacao when set', async () => {
    buildChain(sampleEmpresas);
    const { result } = renderHook(() => useGrupo(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.coresPorEmpresa['e1']).toBe('#f00');
    expect(result.current.coresPorEmpresa['e2']).toBe('#888');
  });

  it('isError is false on success', async () => {
    const { result } = renderHook(() => useGrupo(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
