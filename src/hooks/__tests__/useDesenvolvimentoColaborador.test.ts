import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  mockListarMetas, mockListarPDIs, mockListarFeedbacks,
  mockListarCertificados, mockListarPorColaborador,
  mockBuscarPorColaborador, mockListarTarefas,
} = vi.hoisted(() => ({
  mockListarMetas: vi.fn(),
  mockListarPDIs: vi.fn(),
  mockListarFeedbacks: vi.fn(),
  mockListarCertificados: vi.fn(),
  mockListarPorColaborador: vi.fn(),
  mockBuscarPorColaborador: vi.fn(),
  mockListarTarefas: vi.fn(),
}));

vi.mock('@/services/avaliacaoService', () => ({
  avaliacaoService: { listarMetas: mockListarMetas, listarPDIs: mockListarPDIs, listarFeedbacks: mockListarFeedbacks },
}));
vi.mock('@/services/catalogoCursoService', () => ({
  catalogoCursoService: { listarCertificados: mockListarCertificados },
}));
vi.mock('@/services/tabelas/rhService', () => ({
  onboardingService: { buscarPorColaborador: mockBuscarPorColaborador, listarTarefas: mockListarTarefas },
  treinamentoParticipantesService: { listarPorColaborador: mockListarPorColaborador },
}));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));

import {
  useMetasColaborador, usePDIsColaborador, useFeedbacksColaborador,
  useCertificadosColaborador, useTreinamentosColaborador, useOnboardingColaborador,
} from '../useDesenvolvimentoColaborador';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useMetasColaborador', () => {
  beforeEach(() => { vi.clearAllMocks(); mockListarMetas.mockResolvedValue([]); });

  it('calls avaliacaoService.listarMetas with empresaId and colaboradorId', async () => {
    const { result } = renderHook(() => useMetasColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarMetas).toHaveBeenCalledWith('emp-1', 'col-1');
  });
});

describe('usePDIsColaborador', () => {
  beforeEach(() => { vi.clearAllMocks(); mockListarPDIs.mockResolvedValue([]); });

  it('calls avaliacaoService.listarPDIs with empresaId and colaboradorId', async () => {
    const { result } = renderHook(() => usePDIsColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarPDIs).toHaveBeenCalledWith('emp-1', 'col-1');
  });
});

describe('useFeedbacksColaborador', () => {
  beforeEach(() => { vi.clearAllMocks(); mockListarFeedbacks.mockResolvedValue([]); });

  it('calls avaliacaoService.listarFeedbacks with empresaId and colaboradorId', async () => {
    const { result } = renderHook(() => useFeedbacksColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarFeedbacks).toHaveBeenCalledWith('emp-1', 'col-1');
  });
});

describe('useCertificadosColaborador', () => {
  beforeEach(() => { vi.clearAllMocks(); mockListarCertificados.mockResolvedValue([]); });

  it('calls catalogoCursoService.listarCertificados with empresaId and colaboradorId', async () => {
    const { result } = renderHook(() => useCertificadosColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarCertificados).toHaveBeenCalledWith('emp-1', 'col-1');
  });
});

describe('useTreinamentosColaborador', () => {
  beforeEach(() => { vi.clearAllMocks(); mockListarPorColaborador.mockResolvedValue([]); });

  it('calls treinamentoParticipantesService.listarPorColaborador with colaboradorId', async () => {
    const { result } = renderHook(() => useTreinamentosColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarPorColaborador).toHaveBeenCalledWith('col-1');
  });
});

describe('useOnboardingColaborador', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns null progresso and no crash when the colaborador has no onboarding started', async () => {
    mockBuscarPorColaborador.mockResolvedValue(null);
    const { result } = renderHook(() => useOnboardingColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.onboarding).toBeNull();
    expect(result.current.progresso).toBeNull();
    expect(mockListarTarefas).not.toHaveBeenCalled();
  });

  it('computes progresso and separates concluidas/pendentes/atrasadas', async () => {
    mockBuscarPorColaborador.mockResolvedValue({ id: 'ob-1' });
    mockListarTarefas.mockResolvedValue([
      { id: 't1', concluida: true },
      { id: 't2', concluida: false, data_prazo: '2000-01-01' },
      { id: 't3', concluida: false, data_prazo: '2099-01-01' },
    ]);
    const { result } = renderHook(() => useOnboardingColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarTarefas).toHaveBeenCalledWith('ob-1');
    expect(result.current.progresso).toBe(33);
    expect(result.current.concluidas).toHaveLength(1);
    expect(result.current.atrasadas).toHaveLength(1);
    expect(result.current.pendentes).toHaveLength(1);
  });
});
