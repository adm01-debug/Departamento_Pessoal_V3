import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  mockObterPeriodoExperiencia, mockListarPeriodosAquisitivos, mockListarASOs,
  mockListarDocumentosPessoais, mockListarFeriasColaborador,
  mockBuscarPorColaboradorOnboarding, mockListarTarefas,
} = vi.hoisted(() => ({
  mockObterPeriodoExperiencia: vi.fn(),
  mockListarPeriodosAquisitivos: vi.fn(),
  mockListarASOs: vi.fn(),
  mockListarDocumentosPessoais: vi.fn(),
  mockListarFeriasColaborador: vi.fn(),
  mockBuscarPorColaboradorOnboarding: vi.fn(),
  mockListarTarefas: vi.fn(),
}));

vi.mock('@/services/colaboradorDetalhesService', () => ({
  obterPeriodoExperiencia: mockObterPeriodoExperiencia,
  listarPeriodosAquisitivos: mockListarPeriodosAquisitivos,
  listarASOs: mockListarASOs,
  listarFeriasColaborador: mockListarFeriasColaborador,
}));
vi.mock('@/services/tabelasReferenciaService', () => ({
  listarDocumentosPessoais: mockListarDocumentosPessoais,
}));
vi.mock('@/services/tabelas/rhService', () => ({
  onboardingService: { buscarPorColaborador: mockBuscarPorColaboradorOnboarding, listarTarefas: mockListarTarefas },
  treinamentoParticipantesService: { listarPorColaborador: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
// colaboradoresMock não precisa ser mockado aqui: isColaboradoresMockEnabled()
// já retorna false sob Vitest (import.meta.env.MODE === 'test'), então os
// hooks reais caem direto nos services mockados acima.

import { useProximosEventos } from '../useProximosEventos';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useProximosEventos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObterPeriodoExperiencia.mockResolvedValue(null);
    mockListarPeriodosAquisitivos.mockResolvedValue([]);
    mockListarASOs.mockResolvedValue([]);
    mockListarDocumentosPessoais.mockResolvedValue([]);
    mockListarFeriasColaborador.mockResolvedValue([]);
    mockBuscarPorColaboradorOnboarding.mockResolvedValue(null);
    mockListarTarefas.mockResolvedValue([]);
  });

  it('returns an empty list when nothing is upcoming', async () => {
    const { result } = renderHook(() => useProximosEventos('col-1', 'emp-1'), { wrapper });
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('includes a future ASO expiration and a future document expiration, sorted by date', async () => {
    mockListarASOs.mockResolvedValue([{ data_validade: '2099-06-01' }]);
    mockListarDocumentosPessoais.mockResolvedValue([{ data_validade: '2099-01-01', tipo_documento: 'CNH' }]);
    const { result } = renderHook(() => useProximosEventos('col-1', 'emp-1'), { wrapper });
    await waitFor(() => expect(result.current.length).toBe(2));
    expect(result.current[0].data).toBe('2099-01-01');
    expect(result.current[0].tipo).toBe('documento');
    expect(result.current[1].tipo).toBe('aso');
  });

  it('ignores expired/past dates', async () => {
    mockListarASOs.mockResolvedValue([{ data_validade: '2000-01-01' }]);
    const { result } = renderHook(() => useProximosEventos('col-1', 'emp-1'), { wrapper });
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('excludes a período de experiência already concluído', async () => {
    mockObterPeriodoExperiencia.mockResolvedValue({ segunda_etapa_fim: '2099-01-01', status: 'concluido' });
    const { result } = renderHook(() => useProximosEventos('col-1', 'emp-1'), { wrapper });
    await waitFor(() => expect(result.current).toEqual([]));
  });
});
