import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockUseGenericCrud } = vi.hoisted(() => ({
  mockUseGenericCrud: vi.fn(),
}));

vi.mock('../useGenericCrud', () => ({
  useGenericCrud: mockUseGenericCrud,
}));

vi.mock('@/services/empresaService', () => ({
  empresaService: { listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), excluir: vi.fn() },
}));

import { useTodasEmpresas } from '../useTodasEmpresas';

function makeCrudReturn(overrides: Record<string, any> = {}) {
  return { items: [], isLoading: false, isCreating: false, isUpdating: false, isDeleting: false, criar: vi.fn(), atualizar: vi.fn(), excluir: vi.fn(), ...overrides };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useTodasEmpresas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGenericCrud.mockReturnValue(makeCrudReturn());
  });

  it('passes empresaService to useGenericCrud', () => {
    renderHook(() => useTodasEmpresas(), { wrapper });
    expect(mockUseGenericCrud).toHaveBeenCalledWith(
      expect.objectContaining({ service: expect.objectContaining({ listar: expect.any(Function) }) })
    );
  });

  it('exposes empresas as alias for items', () => {
    mockUseGenericCrud.mockReturnValue(makeCrudReturn({ items: [{ id: 'e1', razao_social: 'Test' }] }));
    const { result } = renderHook(() => useTodasEmpresas(), { wrapper });
    expect(result.current.empresas).toEqual([{ id: 'e1', razao_social: 'Test' }]);
  });

  it('passes successMessages with create/update/delete keys', () => {
    renderHook(() => useTodasEmpresas(), { wrapper });
    expect(mockUseGenericCrud).toHaveBeenCalledWith(
      expect.objectContaining({
        successMessages: expect.objectContaining({
          create: expect.any(String),
          update: expect.any(String),
          delete: expect.any(String),
        }),
      })
    );
  });

  it('uses todas-empresas-list as queryKey', () => {
    renderHook(() => useTodasEmpresas(), { wrapper });
    expect(mockUseGenericCrud).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: 'todas-empresas-list' })
    );
  });
});
