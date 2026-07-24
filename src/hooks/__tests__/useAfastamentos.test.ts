import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockAfastamentoService } = vi.hoisted(() => ({
  mockAfastamentoService: {
    listar: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    listarConfiguracoes: vi.fn().mockResolvedValue([]),
    criar: vi.fn().mockResolvedValue({}),
    atualizar: vi.fn().mockResolvedValue({}),
    excluir: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/services/afastamentoService', () => ({ afastamentoService: mockAfastamentoService }));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('@/utils/auditLogger', () => ({ auditLogger: { log: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useAfastamentos } from '../useAfastamentos';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useAfastamentos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns afastamentos array', async () => {
    const { result } = renderHook(() => useAfastamentos(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.afastamentos)).toBe(true);
  });

  it('returns configs array', async () => {
    const { result } = renderHook(() => useAfastamentos(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.configs)).toBe(true);
  });

  it('exposes setFiltros function', async () => {
    const { result } = renderHook(() => useAfastamentos(), { wrapper });
    expect(typeof result.current.setFiltros).toBe('function');
  });

  it('exposes filtros object', async () => {
    const { result } = renderHook(() => useAfastamentos(), { wrapper });
    expect(typeof result.current.filtros).toBe('object');
  });

  it('exposes criar function', async () => {
    const { result } = renderHook(() => useAfastamentos(), { wrapper });
    expect(typeof result.current.criar).toBe('function');
  });
});
