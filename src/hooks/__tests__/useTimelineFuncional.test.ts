import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  mockBuscarPorId, mockListarHistoricoSalarial, mockListarFeriasColaborador,
  mockListarHistoricoCargoTimeline, mockListarPromocoesTimeline, mockListarTransferenciasTimeline,
  mockListarAfastamentosTimeline, mockListarDesligamentoTimeline,
  mockUseHistoricoContratos, mockUseMedidasDisciplinaresColaborador,
  mockUseTreinamentosColaborador, mockUseFeedbacksColaborador, mockUseOnboardingColaborador,
} = vi.hoisted(() => ({
  mockBuscarPorId: vi.fn(),
  mockListarHistoricoSalarial: vi.fn(),
  mockListarFeriasColaborador: vi.fn(),
  mockListarHistoricoCargoTimeline: vi.fn(),
  mockListarPromocoesTimeline: vi.fn(),
  mockListarTransferenciasTimeline: vi.fn(),
  mockListarAfastamentosTimeline: vi.fn(),
  mockListarDesligamentoTimeline: vi.fn(),
  mockUseHistoricoContratos: vi.fn(),
  mockUseMedidasDisciplinaresColaborador: vi.fn(),
  mockUseTreinamentosColaborador: vi.fn(),
  mockUseFeedbacksColaborador: vi.fn(),
  mockUseOnboardingColaborador: vi.fn(),
}));

vi.mock('@/services', () => ({ colaboradorService: { buscarPorId: mockBuscarPorId } }));
vi.mock('@/services/colaboradorDetalhesService', () => ({
  listarHistoricoSalarial: mockListarHistoricoSalarial,
  listarFeriasColaborador: mockListarFeriasColaborador,
}));
vi.mock('@/services/timelineService', () => ({
  listarHistoricoCargoTimeline: mockListarHistoricoCargoTimeline,
  listarPromocoesTimeline: mockListarPromocoesTimeline,
  listarTransferenciasTimeline: mockListarTransferenciasTimeline,
  listarAfastamentosTimeline: mockListarAfastamentosTimeline,
  listarDesligamentoTimeline: mockListarDesligamentoTimeline,
}));
vi.mock('@/hooks/useHistoricoContratos', () => ({ useHistoricoContratos: mockUseHistoricoContratos }));
vi.mock('@/hooks/useNovasTabelas', () => ({ useMedidasDisciplinaresColaborador: mockUseMedidasDisciplinaresColaborador }));
vi.mock('@/hooks/useDesenvolvimentoColaborador', () => ({
  useTreinamentosColaborador: mockUseTreinamentosColaborador,
  useFeedbacksColaborador: mockUseFeedbacksColaborador,
  useOnboardingColaborador: mockUseOnboardingColaborador,
}));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));

import { useTimelineFuncional } from '../useTimelineFuncional';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useTimelineFuncional', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuscarPorId.mockResolvedValue({ data_admissao: '2020-01-10' });
    mockListarHistoricoSalarial.mockResolvedValue([{ data_vigencia: '2021-05-01', motivo: 'Reajuste anual' }]);
    mockListarFeriasColaborador.mockResolvedValue([]);
    mockListarHistoricoCargoTimeline.mockResolvedValue([]);
    mockListarPromocoesTimeline.mockResolvedValue([{ data_vigencia: '2022-03-01', motivo: 'Mérito' }]);
    mockListarTransferenciasTimeline.mockResolvedValue([]);
    mockListarAfastamentosTimeline.mockResolvedValue([]);
    mockListarDesligamentoTimeline.mockResolvedValue([]);
    mockUseHistoricoContratos.mockReturnValue({ historico: [], isLoading: false });
    mockUseMedidasDisciplinaresColaborador.mockReturnValue({ data: [], isLoading: false });
    mockUseTreinamentosColaborador.mockReturnValue({ data: [], isLoading: false });
    mockUseFeedbacksColaborador.mockReturnValue({ data: [], isLoading: false });
    mockUseOnboardingColaborador.mockReturnValue({ concluidas: [], isLoading: false });
  });

  it('merges events from every source and sorts them from most to least recent', async () => {
    const { result } = renderHook(() => useTimelineFuncional('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const datas = result.current.eventos.map(e => e.data);
    expect(datas).toEqual(['2022-03-01', '2021-05-01', '2020-01-10']);
    expect(result.current.eventos.map(e => e.origem)).toEqual(['promocoes', 'historico_salarial', 'colaboradores']);
  });

  it('does not include anything from audit_log/ColaboradorHistory', async () => {
    const { result } = renderHook(() => useTimelineFuncional('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.eventos.some(e => e.origem === 'audit_log')).toBe(false);
  });
});
