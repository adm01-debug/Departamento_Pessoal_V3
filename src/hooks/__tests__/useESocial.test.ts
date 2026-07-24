import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  mockListarEventos, mockObterEstatisticas, mockEnviarEvento, mockReenviarEvento,
  mockGerarEventosPeriodo, mockGetConfig, mockListarCertificados, mockListarTransmissaoLogs,
  mockToastSuccess, mockToastError, mockHandleServerError,
} = vi.hoisted(() => ({
  mockListarEventos: vi.fn(),
  mockObterEstatisticas: vi.fn(),
  mockEnviarEvento: vi.fn(),
  mockReenviarEvento: vi.fn(),
  mockGerarEventosPeriodo: vi.fn(),
  mockGetConfig: vi.fn(),
  mockListarCertificados: vi.fn(),
  mockListarTransmissaoLogs: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockHandleServerError: vi.fn(),
}));

vi.mock('@/services/esocialService', () => ({
  listarEventos: mockListarEventos,
  obterEstatisticas: mockObterEstatisticas,
  enviarEvento: mockEnviarEvento,
  reenviarEvento: mockReenviarEvento,
  gerarEventosPeriodo: mockGerarEventosPeriodo,
  getConfig: mockGetConfig,
  listarCertificados: mockListarCertificados,
  listarTransmissaoLogs: mockListarTransmissaoLogs,
  criarEvento: vi.fn(),
  salvarConfig: vi.fn(),
  adicionarCertificado: vi.fn(),
}));

vi.mock('./useServerValidation', () => ({
  useServerValidation: () => ({ handleServerError: mockHandleServerError }),
}));

vi.mock('@/hooks/useServerValidation', () => ({
  useServerValidation: () => ({ handleServerError: mockHandleServerError }),
}));

vi.mock('../useServerValidation', () => ({
  useServerValidation: () => ({ handleServerError: mockHandleServerError }),
}));

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

import { useESocial } from '../useESocial';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useESocial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarEventos.mockResolvedValue([]);
    mockObterEstatisticas.mockResolvedValue({ enviados: 0, pendentes: 0, erros: 0, conformidade: 100 });
    mockGetConfig.mockResolvedValue({});
    mockListarCertificados.mockResolvedValue([]);
    mockListarTransmissaoLogs.mockResolvedValue([]);
  });

  it('returns empty eventos initially', async () => {
    const { result } = renderHook(() => useESocial(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.eventos).toEqual([]);
  });

  it('returns default stats when empty', async () => {
    const { result } = renderHook(() => useESocial(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats).toMatchObject({ enviados: 0, pendentes: 0, erros: 0 });
  });

  it('calls listarEventos', async () => {
    const { result } = renderHook(() => useESocial(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarEventos).toHaveBeenCalled();
  });

  it('returns eventos from service', async () => {
    mockListarEventos.mockResolvedValue([{ id: 'e1', tipo: 'S-2200' }]);
    const { result } = renderHook(() => useESocial(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.eventos).toHaveLength(1);
  });

  it('exposes enviarEvento function', async () => {
    const { result } = renderHook(() => useESocial(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.enviarEvento).toBe('function');
  });

  it('isSending is false initially', async () => {
    const { result } = renderHook(() => useESocial(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isSending).toBe(false);
  });
});
