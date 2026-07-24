import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  mockListarBatidas, mockRegistrarBatida,
  mockListarFaltas, mockListarFaltasColaborador,
  mockListarEpis,
  mockToastSuccess, mockToastError,
} = vi.hoisted(() => ({
  mockListarBatidas: vi.fn(),
  mockRegistrarBatida: vi.fn(),
  mockListarFaltas: vi.fn(),
  mockListarFaltasColaborador: vi.fn(),
  mockListarEpis: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/services/batidasPontoService', () => ({
  batidasPontoService: { listar: mockListarBatidas, listarPorData: vi.fn().mockResolvedValue([]), registrar: mockRegistrarBatida },
}));

vi.mock('@/services/faltasService', () => ({
  faltasService: { listar: mockListarFaltas, buscarPorColaborador: mockListarFaltasColaborador, criar: vi.fn(), atualizar: vi.fn(), excluir: vi.fn() },
}));

vi.mock('@/services/medidasDisciplinaresService', () => ({
  medidasDisciplinaresService: { listar: vi.fn().mockResolvedValue([]), criar: vi.fn(), excluir: vi.fn() },
}));

vi.mock('@/services/episService', () => ({
  episService: { listar: mockListarEpis, criar: vi.fn(), excluir: vi.fn() },
  episEntregasService: { listar: vi.fn().mockResolvedValue([]), registrar: vi.fn() },
}));

vi.mock('@/services/jornadaHorariosService', () => ({
  jornadaHorariosService: { listar: vi.fn().mockResolvedValue([]), criar: vi.fn(), atualizar: vi.fn(), excluir: vi.fn() },
}));

vi.mock('@/services/bancoHorasConfigService', () => ({
  bancoHorasConfigService: { listar: vi.fn().mockResolvedValue([]), criar: vi.fn(), atualizar: vi.fn(), excluir: vi.fn() },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

import {
  useBatidasPonto,
  useRegistrarBatida,
  useFaltas,
  useFaltasColaborador,
} from '../useNovasTabelas';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useBatidasPonto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarBatidas.mockResolvedValue([]);
  });

  it('is disabled and returns empty when no colaboradorId', () => {
    const { result } = renderHook(() => useBatidasPonto(''), { wrapper });
    expect(mockListarBatidas).not.toHaveBeenCalled();
  });

  it('calls batidasPontoService.listar with colaboradorId', async () => {
    const { result } = renderHook(() => useBatidasPonto('col-1'), { wrapper });
    await waitFor(() => !result.current.isLoading);
    expect(mockListarBatidas).toHaveBeenCalledWith('col-1', undefined, undefined);
  });

  it('returns batidas data', async () => {
    mockListarBatidas.mockResolvedValue([{ id: 'b1', tipo: 'entrada' }]);
    const { result } = renderHook(() => useBatidasPonto('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
  });
});

describe('useRegistrarBatida', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegistrarBatida.mockResolvedValue({ id: 'b1' });
  });

  it('calls batidasPontoService.registrar with data', async () => {
    const { result } = renderHook(() => useRegistrarBatida(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ tipo: 'entrada', colaborador_id: 'col-1' });
    });

    expect(mockRegistrarBatida).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'entrada' }));
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Batida registrada'));
  });
});

describe('useFaltas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarFaltas.mockResolvedValue([]);
  });

  it('calls faltasService.listar with empresaId', async () => {
    const { result } = renderHook(() => useFaltas(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarFaltas).toHaveBeenCalledWith('emp-1');
  });
});

describe('useFaltasColaborador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarFaltasColaborador.mockResolvedValue([]);
  });

  it('calls faltasService.buscarPorColaborador with colaboradorId', async () => {
    const { result } = renderHook(() => useFaltasColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarFaltasColaborador).toHaveBeenCalledWith('col-1');
  });

  it('is disabled when no colaboradorId', () => {
    const { result } = renderHook(() => useFaltasColaborador(''), { wrapper });
    expect(mockListarFaltasColaborador).not.toHaveBeenCalled();
  });
});
