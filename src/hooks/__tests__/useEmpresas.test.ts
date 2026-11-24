import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const { mockFrom, mockIsAdmin } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockIsAdmin: vi.fn().mockReturnValue(true),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, isAdmin: mockIsAdmin() }),
}));

vi.mock('zustand/middleware', () => ({
  persist: (fn: any) => fn,
}));

const sampleEmpresa = {
  id: 'emp-1', razao_social: 'Empresa Teste Ltda', nome_fantasia: 'Teste',
  cnpj: '12.345.678/0001-99', ativa: true, regime_tributario: 'simples_nacional',
  aliquota_simples: 0.06, fap: 1, rat: 0.01, terceiros: 0.05,
  cor_identificacao: null, ordem_exibicao: 1,
  created_at: '2024-01-01', updated_at: '2024-01-01',
  inscricao_estadual: null, inscricao_municipal: null,
  cep: null, logradouro: null, numero: null, complemento: null,
  bairro: null, cidade: null, uf: null, telefone: null, email: null, logo_url: null,
};

function buildSelectChain(data: any, error: any = null) {
  const result = { data, error };
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const single = vi.fn().mockResolvedValue(result);
  const order = vi.fn().mockResolvedValue(result);
  const eq2 = vi.fn().mockReturnValue({ order, maybeSingle, single });
  const eq = vi.fn().mockReturnValue({ eq: eq2, order, maybeSingle, single });
  const select = vi.fn().mockReturnValue({ eq, order, maybeSingle, single });
  return { select, eq, eq2, order };
}

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

import { useEmpresas, useEmpresaStore } from '../useEmpresas';

describe('useEmpresas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset zustand store
    useEmpresaStore.setState({ empresaAtualId: null, modo: 'consolidado' });

    const userEmpresasChain = buildSelectChain([{ id: 'ue-1', user_id: 'user-1', empresa_id: 'emp-1', is_default: true, empresa: sampleEmpresa }]);
    const todasEmpresasChain = buildSelectChain([sampleEmpresa]);

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_empresas') return userEmpresasChain;
      if (table === 'empresas') return todasEmpresasChain;
      return buildSelectChain([]);
    });
  });

  it('returns expected shape', () => {
    const { result } = renderHook(() => useEmpresas(), { wrapper: createWrapper() });
    expect(typeof result.current.trocarEmpresa).toBe('function');
    expect(typeof result.current.loadingEmpresas).toBe('boolean');
    expect(result.current.criarEmpresa).toBeDefined();
    expect(result.current.atualizarEmpresa).toBeDefined();
  });

  it('returns loadingEmpresas=true initially', () => {
    const { result } = renderHook(() => useEmpresas(), { wrapper: createWrapper() });
    expect(result.current.loadingEmpresas).toBe(true);
  });

  it('loads todasEmpresas when isAdmin=true', async () => {
    mockIsAdmin.mockReturnValue(true);
    const { result } = renderHook(() => useEmpresas(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loadingTodas).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('empresas');
  });

  it('empresaAtual resolves from todasEmpresas', async () => {
    const { result } = renderHook(() => useEmpresas(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loadingTodas).toBe(false));
    expect(result.current.empresaAtual).not.toBeNull();
  });

  it('trocarEmpresa updates the store id', () => {
    const { result } = renderHook(() => useEmpresas(), { wrapper: createWrapper() });
    act(() => { result.current.trocarEmpresa('emp-2'); });
    expect(useEmpresaStore.getState().empresaAtualId).toBe('emp-2');
  });

  it('temMultiplasEmpresas is false when only one empresa', async () => {
    const { result } = renderHook(() => useEmpresas(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loadingEmpresas).toBe(false));
    expect(result.current.temMultiplasEmpresas).toBe(false);
  });

  it('isConsolidado is true when modo=consolidado', () => {
    useEmpresaStore.setState({ modo: 'consolidado' });
    const { result } = renderHook(() => useEmpresas(), { wrapper: createWrapper() });
    expect(result.current.isConsolidado).toBe(true);
  });

  it('setModo changes the mode', () => {
    const { result } = renderHook(() => useEmpresas(), { wrapper: createWrapper() });
    act(() => { result.current.setModo('empresa_unica'); });
    expect(useEmpresaStore.getState().modo).toBe('empresa_unica');
  });
});
