import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockDesligamentoService } = vi.hoisted(() => ({
  mockDesligamentoService: {
    listar: vi.fn().mockResolvedValue({ data: [{ id: 'd1', motivo: 'pedido' }], total: 1 }),
    criar: vi.fn().mockResolvedValue({ id: 'd2' }),
    atualizar: vi.fn().mockResolvedValue({}),
    excluir: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/services/desligamentoService', () => ({ desligamentoService: mockDesligamentoService }));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useDesligamentos } from '../useDesligamentos';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useDesligamentos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns desligamentos array', async () => {
    const { result } = renderHook(() => useDesligamentos(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.desligamentos)).toBe(true);
  });

  it('exposes criar function', () => {
    const { result } = renderHook(() => useDesligamentos(), { wrapper });
    expect(typeof result.current.criar).toBe('function');
  });

  it('exposes atualizar and excluir', () => {
    const { result } = renderHook(() => useDesligamentos(), { wrapper });
    expect(typeof result.current.atualizar).toBe('function');
    expect(typeof result.current.excluir).toBe('function');
  });
});
