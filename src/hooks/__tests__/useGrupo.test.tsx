import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useGrupo } from '../useGrupo';

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

function buildChain(response: { data: any; error: any }) {
  const finalOrder = vi.fn().mockResolvedValue(response);
  const firstOrder = vi.fn().mockReturnValue({ order: finalOrder });
  const select = vi.fn().mockReturnValue({ order: firstOrder });
  mockFrom.mockReturnValue({ select });
  return { select, firstOrder, finalOrder };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockEmpresas = [
  {
    id: 'e1',
    razao_social: 'Empresa Alpha Ltda',
    nome_fantasia: 'Alpha',
    cnpj: '11.222.333/0001-44',
    ativa: true,
    regime_tributario: 'lucro_presumido' as const,
    aliquota_simples: null,
    fap: null,
    rat: null,
    terceiros: null,
    cor_identificacao: '#FF0000',
    ordem_exibicao: 1,
  },
  {
    id: 'e2',
    razao_social: 'Beta Comércio S/A',
    nome_fantasia: null,
    cnpj: '55.666.777/0001-88',
    ativa: false,
    regime_tributario: 'simples_nacional' as const,
    aliquota_simples: 0.06,
    fap: null,
    rat: null,
    terceiros: null,
    cor_identificacao: null,
    ordem_exibicao: 2,
  },
  {
    id: 'e3',
    razao_social: 'Gama Serviços ME',
    nome_fantasia: 'Gama',
    cnpj: '99.000.111/0001-22',
    ativa: true,
    regime_tributario: 'lucro_real' as const,
    aliquota_simples: null,
    fap: null,
    rat: null,
    terceiros: null,
    cor_identificacao: null,
    ordem_exibicao: 3,
  },
];

describe('useGrupo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initial state: isLoading=true, empty arrays', () => {
    buildChain({ data: [], error: null });
    const { result } = renderHook(() => useGrupo(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.empresas).toEqual([]);
    expect(result.current.totalEmpresas).toBe(0);
  });

  it('returns all empresas after query resolves', async () => {
    buildChain({ data: mockEmpresas, error: null });
    const { result } = renderHook(() => useGrupo(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.empresas).toHaveLength(3);
    expect(result.current.totalEmpresas).toBe(3);
  });

  it('empresasAtivas only includes ativa=true entries', async () => {
    buildChain({ data: mockEmpresas, error: null });
    const { result } = renderHook(() => useGrupo(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.empresasAtivas).toHaveLength(2);
    expect(result.current.totalAtivas).toBe(2);
    expect(result.current.empresasAtivas.every(e => e.ativa)).toBe(true);
  });

  it('totalAtivas equals count of ativa=true entries', async () => {
    buildChain({ data: mockEmpresas, error: null });
    const { result } = renderHook(() => useGrupo(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalAtivas).toBe(2);
  });

  it('nomesPorEmpresa uses nome_fantasia when set', async () => {
    buildChain({ data: mockEmpresas, error: null });
    const { result } = renderHook(() => useGrupo(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.nomesPorEmpresa['e1']).toBe('Alpha');
  });

  it('nomesPorEmpresa falls back to razao_social when nome_fantasia is null', async () => {
    buildChain({ data: mockEmpresas, error: null });
    const { result } = renderHook(() => useGrupo(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.nomesPorEmpresa['e2']).toBe('Beta Comércio S/A');
  });

  it('coresPorEmpresa uses cor_identificacao when set', async () => {
    buildChain({ data: mockEmpresas, error: null });
    const { result } = renderHook(() => useGrupo(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.coresPorEmpresa['e1']).toBe('#FF0000');
  });

  it('coresPorEmpresa falls back to regime color when cor_identificacao is null', async () => {
    buildChain({ data: mockEmpresas, error: null });
    const { result } = renderHook(() => useGrupo(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // e2 has no cor_identificacao — must fall back to regime color (non-empty string)
    expect(typeof result.current.coresPorEmpresa['e2']).toBe('string');
    expect(result.current.coresPorEmpresa['e2'].length).toBeGreaterThan(0);
  });

  it('regimePorEmpresa has correct entry for each empresa', async () => {
    buildChain({ data: mockEmpresas, error: null });
    const { result } = renderHook(() => useGrupo(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.regimePorEmpresa['e1'].value).toBe('lucro_presumido');
    expect(result.current.regimePorEmpresa['e2'].value).toBe('simples_nacional');
    expect(result.current.regimePorEmpresa['e3'].value).toBe('lucro_real');
  });

  it('empresasIds contains all empresa ids', async () => {
    buildChain({ data: mockEmpresas, error: null });
    const { result } = renderHook(() => useGrupo(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.empresasIds).toEqual(['e1', 'e2', 'e3']);
  });

  it('returns empty arrays and isLoading=false with empty data', async () => {
    buildChain({ data: [], error: null });
    const { result } = renderHook(() => useGrupo(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.empresas).toEqual([]);
    expect(result.current.totalEmpresas).toBe(0);
    expect(result.current.totalAtivas).toBe(0);
  });

  it('returns empty array on 42501 permission error (RLS)', async () => {
    buildChain({ data: null, error: { code: '42501', message: 'permission denied' } });
    const { result } = renderHook(() => useGrupo(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.empresas).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it('returns empty array on 42703 schema error', async () => {
    buildChain({ data: null, error: { code: '42703', message: 'column not found' } });
    const { result } = renderHook(() => useGrupo(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.empresas).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it('sets isError=true on unexpected error', async () => {
    buildChain({ data: null, error: { code: '500', message: 'Internal error' } });
    const { result } = renderHook(() => useGrupo(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
