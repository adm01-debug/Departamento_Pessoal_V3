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

vi.mock('@/services/cargoService', () => ({
  cargoService: { listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), excluir: vi.fn() },
}));

vi.mock('@/services/departamentoService', () => ({
  departamentoService: { listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), excluir: vi.fn() },
}));

vi.mock('@/services/desligamentoService', () => ({
  desligamentoService: { listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), excluir: vi.fn() },
}));

vi.mock('@/services/localTrabalhoService', () => ({
  localTrabalhoService: { listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), excluir: vi.fn() },
}));

import { useCargos } from '../useCargos';
import { useDepartamentos } from '../useDepartamentos';
import { useDesligamentos } from '../useDesligamentos';
import { useLocaisTrabalho } from '../useLocaisTrabalho';

function makeCrudReturn(overrides: Record<string, any> = {}) {
  return {
    items: [],
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    criar: vi.fn(),
    atualizar: vi.fn(),
    excluir: vi.fn(),
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useCargos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGenericCrud.mockReturnValue(makeCrudReturn());
  });

  it('passes cargoService to useGenericCrud', () => {
    renderHook(() => useCargos(), { wrapper });
    expect(mockUseGenericCrud).toHaveBeenCalledWith(
      expect.objectContaining({ service: expect.objectContaining({ listar: expect.any(Function) }) })
    );
  });

  it('exposes cargos as alias for items', () => {
    mockUseGenericCrud.mockReturnValue(makeCrudReturn({ items: [{ id: 'c1', nome: 'Dev' }] }));
    const { result } = renderHook(() => useCargos(), { wrapper });
    expect(result.current.cargos).toEqual([{ id: 'c1', nome: 'Dev' }]);
  });

  it('criar injects empresa_id from empresaAtual', async () => {
    const mockCriar = vi.fn().mockResolvedValue({ id: 'c1' });
    mockUseGenericCrud.mockReturnValue(makeCrudReturn({ criar: mockCriar }));
    const { result } = renderHook(() => useCargos(), { wrapper });
    await result.current.criar({ nome: 'Dev' });
    expect(mockCriar).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Dev', empresa_id: 'emp-1' }));
  });

  it('passes successMessages to useGenericCrud', () => {
    renderHook(() => useCargos(), { wrapper });
    expect(mockUseGenericCrud).toHaveBeenCalledWith(
      expect.objectContaining({
        successMessages: expect.objectContaining({ create: expect.any(String) }),
      })
    );
  });
});

describe('useDepartamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGenericCrud.mockReturnValue(makeCrudReturn());
  });

  it('passes departamentoService to useGenericCrud', () => {
    renderHook(() => useDepartamentos(), { wrapper });
    expect(mockUseGenericCrud).toHaveBeenCalledWith(
      expect.objectContaining({ service: expect.objectContaining({ listar: expect.any(Function) }) })
    );
  });

  it('exposes departamentos as alias for items', () => {
    mockUseGenericCrud.mockReturnValue(makeCrudReturn({ items: [{ id: 'd1', nome: 'TI' }] }));
    const { result } = renderHook(() => useDepartamentos(), { wrapper });
    expect(result.current.departamentos).toEqual([{ id: 'd1', nome: 'TI' }]);
  });

  it('filters by empresa_id', () => {
    renderHook(() => useDepartamentos(), { wrapper });
    expect(mockUseGenericCrud).toHaveBeenCalledWith(
      expect.objectContaining({ filters: expect.objectContaining({ empresa_id: 'emp-1' }) })
    );
  });
});

describe('useDesligamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGenericCrud.mockReturnValue(makeCrudReturn());
  });

  it('passes desligamentoService to useGenericCrud', () => {
    renderHook(() => useDesligamentos(), { wrapper });
    expect(mockUseGenericCrud).toHaveBeenCalledWith(
      expect.objectContaining({ service: expect.objectContaining({ listar: expect.any(Function) }) })
    );
  });

  it('exposes desligamentos as alias for items', () => {
    mockUseGenericCrud.mockReturnValue(makeCrudReturn({ items: [{ id: 'des1' }] }));
    const { result } = renderHook(() => useDesligamentos(), { wrapper });
    expect(result.current.desligamentos).toEqual([{ id: 'des1' }]);
  });
});

describe('useLocaisTrabalho', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGenericCrud.mockReturnValue(makeCrudReturn());
  });

  it('passes localTrabalhoService to useGenericCrud', () => {
    renderHook(() => useLocaisTrabalho(), { wrapper });
    expect(mockUseGenericCrud).toHaveBeenCalledWith(
      expect.objectContaining({ service: expect.objectContaining({ listar: expect.any(Function) }) })
    );
  });

  it('exposes locais as alias for items', () => {
    mockUseGenericCrud.mockReturnValue(makeCrudReturn({ items: [{ id: 'l1', nome: 'Sede' }] }));
    const { result } = renderHook(() => useLocaisTrabalho(), { wrapper });
    expect(result.current.locais).toEqual([{ id: 'l1', nome: 'Sede' }]);
  });

  it('criar injects empresa_id from empresaAtual', async () => {
    const mockCriar = vi.fn().mockResolvedValue({ id: 'l1' });
    mockUseGenericCrud.mockReturnValue(makeCrudReturn({ criar: mockCriar }));
    const { result } = renderHook(() => useLocaisTrabalho(), { wrapper });
    await result.current.criar({ nome: 'Sede' });
    expect(mockCriar).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Sede', empresa_id: 'emp-1' }));
  });
});
