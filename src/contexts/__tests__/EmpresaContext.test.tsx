import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const { mockTrocarEmpresa, mockInvalidateQueries } = vi.hoisted(() => ({
  mockTrocarEmpresa: vi.fn(),
  mockInvalidateQueries: vi.fn().mockResolvedValue(undefined),
}));

const sampleEmpresa = {
  id: 'emp-1', razao_social: 'Teste Ltda', nome_fantasia: 'Teste',
  cnpj: '12.345.678/0001-99', ativa: true,
};

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({
    userEmpresas: [{ id: 'ue-1', user_id: 'u1', empresa_id: 'emp-1', is_default: true, empresa: sampleEmpresa }],
    empresaAtual: sampleEmpresa,
    loadingEmpresas: false,
    trocarEmpresa: mockTrocarEmpresa,
  }),
}));

import { EmpresaProvider, useEmpresa } from '../EmpresaContext';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.invalidateQueries = mockInvalidateQueries as any;
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(EmpresaProvider, null, children)
    );
}

describe('useEmpresa', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('throws when used outside EmpresaProvider', () => {
    expect(() => renderHook(() => useEmpresa())).toThrow(
      'useEmpresa must be used within EmpresaProvider'
    );
  });

  it('provides empresaAtual from useEmpresas', () => {
    const { result } = renderHook(() => useEmpresa(), { wrapper: createWrapper() });
    expect(result.current.empresaAtual?.id).toBe('emp-1');
  });

  it('provides empresas array from userEmpresas', () => {
    const { result } = renderHook(() => useEmpresa(), { wrapper: createWrapper() });
    expect(result.current.empresas).toHaveLength(1);
    expect(result.current.empresas[0].id).toBe('emp-1');
  });

  it('loading mirrors loadingEmpresas', () => {
    const { result } = renderHook(() => useEmpresa(), { wrapper: createWrapper() });
    expect(result.current.loading).toBe(false);
  });

  it('setEmpresaAtual calls trocarEmpresa with empresa id', () => {
    const { result } = renderHook(() => useEmpresa(), { wrapper: createWrapper() });
    act(() => { result.current.setEmpresaAtual(sampleEmpresa as any); });
    expect(mockTrocarEmpresa).toHaveBeenCalledWith('emp-1');
  });

  it('setEmpresaAtual with null does not call trocarEmpresa', () => {
    const { result } = renderHook(() => useEmpresa(), { wrapper: createWrapper() });
    act(() => { result.current.setEmpresaAtual(null); });
    expect(mockTrocarEmpresa).not.toHaveBeenCalled();
  });

  it('refresh calls queryClient.invalidateQueries for expected keys', async () => {
    const { result } = renderHook(() => useEmpresa(), { wrapper: createWrapper() });
    await act(async () => { await result.current.refresh(); });
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);
  });
});
