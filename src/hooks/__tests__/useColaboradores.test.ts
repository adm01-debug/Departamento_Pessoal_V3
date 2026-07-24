import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockColabService } = vi.hoisted(() => ({
  mockColabService: {
    listar: vi.fn().mockResolvedValue({ data: [{ id: 'c1', nome_completo: 'Ana' }], total: 1 }),
    getSummary: vi.fn().mockResolvedValue({ ativos: 10, inativos: 2 }),
    criar: vi.fn().mockResolvedValue({ id: 'c2' }),
    atualizar: vi.fn().mockResolvedValue({}),
    excluir: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/services/colaboradorService', () => ({ colaboradorService: mockColabService }));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useColaboradores } from '../useColaboradores';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useColaboradores', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns colaboradores array', async () => {
    const { result } = renderHook(() => useColaboradores(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.colaboradores)).toBe(true);
  });

  it('exposes status filter with default "all"', () => {
    const { result } = renderHook(() => useColaboradores(), { wrapper });
    expect(result.current.status).toBe('all');
  });

  it('setStatus updates status', async () => {
    const { result } = renderHook(() => useColaboradores(), { wrapper });
    act(() => { result.current.setStatus('ativo'); });
    expect(result.current.status).toBe('ativo');
  });

  it('exposes departamento and setDepartamento', () => {
    const { result } = renderHook(() => useColaboradores(), { wrapper });
    expect(result.current.departamento).toBe('all');
    expect(typeof result.current.setDepartamento).toBe('function');
  });

  it('exposes cargo and setCargo', () => {
    const { result } = renderHook(() => useColaboradores(), { wrapper });
    expect(result.current.cargo).toBe('all');
    expect(typeof result.current.setCargo).toBe('function');
  });

  it('exposes criar function', () => {
    const { result } = renderHook(() => useColaboradores(), { wrapper });
    expect(typeof result.current.criar).toBe('function');
  });

  it('summary is defined after load', async () => {
    const { result } = renderHook(() => useColaboradores(), { wrapper });
    await waitFor(() => expect(result.current.isLoadingSummary).toBe(false));
    expect(result.current.summary).toBeDefined();
  });
});
