import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  mockAprovarGestor, mockAprovarRH, mockEnviarContabilidade, mockRejeitar, mockCancelar,
  mockCriarNotificacao,
  mockToastSuccess, mockToastError, mockToastWarning, mockToastInfo,
} = vi.hoisted(() => ({
  mockAprovarGestor: vi.fn(),
  mockAprovarRH: vi.fn(),
  mockEnviarContabilidade: vi.fn(),
  mockRejeitar: vi.fn(),
  mockCancelar: vi.fn(),
  mockCriarNotificacao: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastWarning: vi.fn(),
  mockToastInfo: vi.fn(),
}));

vi.mock('@/services', () => ({
  feriasService: {
    aprovarGestor: mockAprovarGestor,
    aprovarRH: mockAprovarRH,
    enviarContabilidade: mockEnviarContabilidade,
    rejeitar: mockRejeitar,
    cancelar: mockCancelar,
  },
}));

vi.mock('@/contexts', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/hooks/useNotificacoes', () => ({
  useNotificacoes: () => ({ criarNotificacao: mockCriarNotificacao }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
    warning: mockToastWarning,
    info: mockToastInfo,
  },
}));

import { useFeriasAprovacao } from '../useFeriasAprovacao';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useFeriasAprovacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarNotificacao.mockResolvedValue(undefined);
  });

  it('starts with isLoading=false', () => {
    const { result } = renderHook(() => useFeriasAprovacao(), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });

  it('aprovarGestor calls feriasService.aprovarGestor with id and userId', async () => {
    mockAprovarGestor.mockResolvedValue({ id: 'f1' });
    const { result } = renderHook(() => useFeriasAprovacao(), { wrapper });

    await act(async () => {
      await result.current.aprovarGestor('f1');
    });

    expect(mockAprovarGestor).toHaveBeenCalledWith('f1', 'user-1');
  });

  it('aprovarGestor shows success toast', async () => {
    mockAprovarGestor.mockResolvedValue({ id: 'f1' });
    const { result } = renderHook(() => useFeriasAprovacao(), { wrapper });

    await act(async () => {
      await result.current.aprovarGestor('f1');
    });

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('gestor')));
  });

  it('aprovarRH calls feriasService.aprovarRH', async () => {
    mockAprovarRH.mockResolvedValue({ id: 'f1' });
    const { result } = renderHook(() => useFeriasAprovacao(), { wrapper });

    await act(async () => {
      await result.current.aprovarRH('f1');
    });

    expect(mockAprovarRH).toHaveBeenCalledWith('f1', 'user-1');
  });

  it('aprovarRH creates notification', async () => {
    mockAprovarRH.mockResolvedValue({ id: 'f1' });
    const { result } = renderHook(() => useFeriasAprovacao(), { wrapper });

    await act(async () => {
      await result.current.aprovarRH('f1');
    });

    await waitFor(() => expect(mockCriarNotificacao).toHaveBeenCalledWith(expect.objectContaining({
      tipo: 'ferias_aprovada',
      entidade_id: 'f1',
    })));
  });

  it('rejeitar calls feriasService.rejeitar', async () => {
    mockRejeitar.mockResolvedValue({ id: 'f1' });
    const { result } = renderHook(() => useFeriasAprovacao(), { wrapper });

    await act(async () => {
      await result.current.rejeitar('f1');
    });

    expect(mockRejeitar).toHaveBeenCalledWith('f1');
    await waitFor(() => expect(mockToastWarning).toHaveBeenCalled());
  });

  it('cancelar shows info toast', async () => {
    mockCancelar.mockResolvedValue(undefined);
    const { result } = renderHook(() => useFeriasAprovacao(), { wrapper });

    await act(async () => {
      await result.current.cancelar('f1');
    });

    await waitFor(() => expect(mockToastInfo).toHaveBeenCalledWith(expect.stringContaining('cancelada')));
  });

  it('enviarContabilidade shows success toast', async () => {
    mockEnviarContabilidade.mockResolvedValue(undefined);
    const { result } = renderHook(() => useFeriasAprovacao(), { wrapper });

    await act(async () => {
      await result.current.enviarContabilidade('f1');
    });

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('contabilidade')));
  });

  it('shows error toast on aprovarGestor failure', async () => {
    mockAprovarGestor.mockRejectedValue(new Error('server error'));
    const { result } = renderHook(() => useFeriasAprovacao(), { wrapper });

    await act(async () => {
      await result.current.aprovarGestor('f1').catch(() => {});
    });

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('server error')));
  });
});
