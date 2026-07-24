import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockUseGenericCrud } = vi.hoisted(() => ({
  mockUseGenericCrud: vi.fn(),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../useGenericCrud', () => ({
  useGenericCrud: mockUseGenericCrud,
}));

vi.mock('@/services/folhaService', () => ({
  folhaService: { listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), excluir: vi.fn() },
}));

import { useFolha } from '../useFolha';

function makeCrudReturn(overrides: Record<string, any> = {}) {
  return { items: [], isLoading: false, isCreating: false, ...overrides };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useFolha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGenericCrud.mockReturnValue(makeCrudReturn());
  });

  it('passes folhaService to useGenericCrud', () => {
    renderHook(() => useFolha(), { wrapper });
    expect(mockUseGenericCrud).toHaveBeenCalledWith(
      expect.objectContaining({ service: expect.objectContaining({ listar: expect.any(Function) }) })
    );
  });

  it('exposes folhas as alias for items', () => {
    mockUseGenericCrud.mockReturnValue(makeCrudReturn({ items: [{ id: 'f1' }] }));
    const { result } = renderHook(() => useFolha(), { wrapper });
    expect(result.current.folhas).toEqual([{ id: 'f1' }]);
  });

  it('filters by empresa_id from empresaAtual', () => {
    renderHook(() => useFolha(), { wrapper });
    expect(mockUseGenericCrud).toHaveBeenCalledWith(
      expect.objectContaining({ filters: expect.objectContaining({ empresa_id: 'emp-1' }) })
    );
  });

  it('passes competencia filter when provided', () => {
    renderHook(() => useFolha('2024-01'), { wrapper });
    expect(mockUseGenericCrud).toHaveBeenCalledWith(
      expect.objectContaining({ filters: expect.objectContaining({ competencia: '2024-01' }) })
    );
  });

  it('competencia filter is undefined when not provided', () => {
    renderHook(() => useFolha(), { wrapper });
    const call = mockUseGenericCrud.mock.calls[0][0];
    expect(call.filters.competencia).toBeUndefined();
  });
});
