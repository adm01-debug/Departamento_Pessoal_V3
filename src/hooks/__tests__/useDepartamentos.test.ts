import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockDeptService } = vi.hoisted(() => ({
  mockDeptService: {
    listar: vi.fn().mockResolvedValue({ data: [{ id: 'd1', nome: 'TI' }], total: 1 }),
    criar: vi.fn().mockResolvedValue({ id: 'd2' }),
    atualizar: vi.fn().mockResolvedValue({}),
    excluir: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/services/departamentoService', () => ({ departamentoService: mockDeptService }));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useDepartamentos } from '../useDepartamentos';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useDepartamentos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns departamentos array', async () => {
    const { result } = renderHook(() => useDepartamentos(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.departamentos)).toBe(true);
  });

  it('exposes criar function', () => {
    const { result } = renderHook(() => useDepartamentos(), { wrapper });
    expect(typeof result.current.criar).toBe('function');
  });

  it('exposes atualizar function', () => {
    const { result } = renderHook(() => useDepartamentos(), { wrapper });
    expect(typeof result.current.atualizar).toBe('function');
  });

  it('exposes excluir function', () => {
    const { result } = renderHook(() => useDepartamentos(), { wrapper });
    expect(typeof result.current.excluir).toBe('function');
  });
});
