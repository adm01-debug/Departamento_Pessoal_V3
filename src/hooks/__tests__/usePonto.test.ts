import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  mockListar, mockBuscarRegistroHoje, mockRegistrar, mockValidarBiometria,
  mockToastSuccess, mockToastError,
} = vi.hoisted(() => ({
  mockListar: vi.fn(),
  mockBuscarRegistroHoje: vi.fn(),
  mockRegistrar: vi.fn(),
  mockValidarBiometria: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/services/pontosService', () => ({
  pontosService: {
    listar: mockListar,
    buscarRegistroHoje: mockBuscarRegistroHoje,
    registrar: mockRegistrar,
    validarBiometria: mockValidarBiometria,
  },
}));

vi.mock('@/contexts/EmpresaContext', () => ({
  useEmpresa: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

import { usePonto } from '../usePonto';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('usePonto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListar.mockResolvedValue([]);
    mockBuscarRegistroHoje.mockResolvedValue([]);
  });

  it('returns empty registros when no colaboradorId', () => {
    const { result } = renderHook(() => usePonto(undefined), { wrapper });
    expect(result.current.registros).toEqual([]);
    expect(mockListar).not.toHaveBeenCalled();
  });

  it('calls pontosService.listar with colaboradorId', async () => {
    const { result } = renderHook(() => usePonto('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListar).toHaveBeenCalledWith('col-1', undefined, undefined);
  });

  it('returns registros from service', async () => {
    mockListar.mockResolvedValue([{ id: 'p1', tipo: 'entrada' }]);
    const { result } = renderHook(() => usePonto('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.registros).toEqual([{ id: 'p1', tipo: 'entrada' }]);
  });

  it('calls buscarRegistroHoje with colaboradorId', async () => {
    const { result } = renderHook(() => usePonto('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockBuscarRegistroHoje).toHaveBeenCalledWith('col-1');
  });

  it('registrarPonto calls pontosService.registrar and shows success toast', async () => {
    mockRegistrar.mockResolvedValue({ id: 'p1', tipo: 'entrada' });
    const { result } = renderHook(() => usePonto('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.registrarPonto({ tipo: 'entrada', colaboradorId: 'col-1' });
    });

    expect(mockRegistrar).toHaveBeenCalledWith('entrada', 'col-1', expect.any(Object));
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Ponto registrado com sucesso!'));
  });

  it('registrarPonto shows error toast on failure', async () => {
    mockRegistrar.mockRejectedValue(new Error('GPS error'));
    const { result } = renderHook(() => usePonto('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.registrarPonto({ tipo: 'entrada', colaboradorId: 'col-1' }).catch(() => {});
    });

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('GPS error'))
    );
  });

  it('exposes isRegistering state', () => {
    const { result } = renderHook(() => usePonto('col-1'), { wrapper });
    expect(result.current.isRegistering).toBe(false);
  });
});
