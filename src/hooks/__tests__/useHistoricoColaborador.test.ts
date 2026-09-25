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
  mockListarPorColaborador,
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
  mockListarPorColaborador: vi.fn(),
}));

vi.mock('@/services', () => ({ colaboradorService: { buscarPorId: mockBuscarPorId } }));
vi.mock('@/services/colaboradorDetalhesService', () => ({
  listarHistoricoSalarial: mockListarHistoricoSalarial,
  listarFeriasColaborador: mockListarFeriasColaborador,
  criarRegistroSalarial: vi.fn(),
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
vi.mock('@/services/vinculoService', () => ({ vinculoService: { listarPorColaborador: mockListarPorColaborador } }));

let auditResult: { data: unknown[]; error: null } = { data: [], error: null };
function makeAuditQueryBuilder() {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => Promise.resolve(auditResult)),
  };
  return builder;
}
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => makeAuditQueryBuilder()) },
}));

import { useHistoricoColaborador } from '../useHistoricoColaborador';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useHistoricoColaborador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditResult = { data: [], error: null };
    mockBuscarPorId.mockResolvedValue({ data_admissao: '2020-01-10', status: 'ativo', tipo_contrato: 'clt' });
    mockListarHistoricoSalarial.mockResolvedValue([
      { id: 'sal-1', data_vigencia: '2021-05-01', motivo: 'Reajuste anual', salario_anterior: 3000, salario_novo: 3300 },
    ]);
    mockListarFeriasColaborador.mockResolvedValue([]);
    mockListarHistoricoCargoTimeline.mockResolvedValue([]);
    mockListarPromocoesTimeline.mockResolvedValue([
      { id: 'promo-1', data_vigencia: '2022-03-01', motivo: 'Mérito', salario_anterior: 3300, salario_novo: 3800 },
    ]);
    mockListarTransferenciasTimeline.mockResolvedValue([]);
    mockListarAfastamentosTimeline.mockResolvedValue([]);
    mockListarDesligamentoTimeline.mockResolvedValue([]);
    mockListarPorColaborador.mockResolvedValue([]);
    mockUseHistoricoContratos.mockReturnValue({ historico: [], isLoading: false, criar: vi.fn(), excluir: vi.fn() });
    mockUseMedidasDisciplinaresColaborador.mockReturnValue({ data: [], isLoading: false });
    mockUseTreinamentosColaborador.mockReturnValue({ data: [], isLoading: false });
    mockUseFeedbacksColaborador.mockReturnValue({ data: [], isLoading: false });
    mockUseOnboardingColaborador.mockReturnValue({ concluidas: [], isLoading: false });
  });

  it('merges events from every source and sorts them from most to least recent', async () => {
    const { result } = renderHook(() => useHistoricoColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const datas = result.current.events.map((e) => e.date);
    expect(datas).toEqual(['2022-03-01', '2021-05-01', '2020-01-10']);
    expect(result.current.events.map((e) => e.source)).toEqual(['promocoes', 'historico_salarial', 'colaboradores']);
  });

  it('preserves rich fields instead of flattening them into a single description string', async () => {
    const { result } = renderHook(() => useHistoricoColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const salario = result.current.events.find((e) => e.source === 'historico_salarial');
    expect(salario?.description).toBe('De R$ 3.000,00 para R$ 3.300,00');
    expect(salario?.secondary).toBe('Reajuste anual');
  });

  it('includes audit_log entries as a filterable "auditoria" event type (now unified, not a separate tab)', async () => {
    auditResult = {
      data: [{ id: 'audit-1', acao: 'UPDATE', user_email: 'rh@empresa.com', created_at: '2023-01-01T10:00:00Z', campos_alterados: ['cargo'], dados_anteriores: { cargo: 'Analista' }, dados_novos: { cargo: 'Coordenador' } }],
      error: null,
    };
    const { result } = renderHook(() => useHistoricoColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const auditoria = result.current.events.find((e) => e.type === 'auditoria');
    expect(auditoria).toBeDefined();
    expect(auditoria?.auditDetail?.alteracoes).toEqual([{ campo: 'cargo', de: 'Analista', para: 'Coordenador' }]);
  });

  it('exposes the colaborador record for the sidebar summary (status, tipo_contrato, data_admissao)', async () => {
    const { result } = renderHook(() => useHistoricoColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.colaborador).toMatchObject({ status: 'ativo', tipo_contrato: 'clt', data_admissao: '2020-01-10' });
  });
});
