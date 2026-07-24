import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockLocalService } = vi.hoisted(() => ({
  mockLocalService: {
    listar: vi.fn().mockResolvedValue({ data: [{ id: 'l1', nome: 'Sede' }], total: 1 }),
    criar: vi.fn().mockResolvedValue({ id: 'l2' }),
    atualizar: vi.fn().mockResolvedValue({}),
    excluir: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/services/localTrabalhoService', () => ({ localTrabalhoService: mockLocalService }));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useLocaisTrabalho } from '../useLocaisTrabalho';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useLocaisTrabalho', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns locais array', async () => {
    const { result } = renderHook(() => useLocaisTrabalho(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.locais)).toBe(true);
  });

  it('exposes criar function', () => {
    const { result } = renderHook(() => useLocaisTrabalho(), { wrapper });
    expect(typeof result.current.criar).toBe('function');
  });

  it('exposes atualizar and excluir', () => {
    const { result } = renderHook(() => useLocaisTrabalho(), { wrapper });
    expect(typeof result.current.atualizar).toBe('function');
    expect(typeof result.current.excluir).toBe('function');
  });
});
