import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { wrapper } from '@/test/queryWrapper';

const {
  mockBuscarPorId,
  mockListarFeriasColaborador,
  mockListarHistoricoCargoTimeline,
  mockListarPromocoesTimeline,
  mockListarTransferenciasTimeline,
  mockListarAfastamentosTimeline,
  mockListarDesligamentoTimeline,
  mockListarTrilha,
  mockListarInscricoesPorColaborador,
  mockListarPorColaborador,
  mockUseHistoricoContratos,
  mockUseHistoricoSalarial,
  mockUseCriarRegistroSalarial,
  mockUseMedidasDisciplinaresColaborador,
  mockUseTreinamentosColaborador,
  mockUseFeedbacksColaborador,
  mockUseOnboardingColaborador,
} = vi.hoisted(() => ({
  mockBuscarPorId: vi.fn(),
  mockListarFeriasColaborador: vi.fn(),
  mockListarHistoricoCargoTimeline: vi.fn(),
  mockListarPromocoesTimeline: vi.fn(),
  mockListarTransferenciasTimeline: vi.fn(),
  mockListarAfastamentosTimeline: vi.fn(),
  mockListarDesligamentoTimeline: vi.fn(),
  mockListarTrilha: vi.fn(),
  mockListarInscricoesPorColaborador: vi.fn(),
  mockListarPorColaborador: vi.fn(),
  mockUseHistoricoContratos: vi.fn(),
  mockUseHistoricoSalarial: vi.fn(),
  mockUseCriarRegistroSalarial: vi.fn(),
  mockUseMedidasDisciplinaresColaborador: vi.fn(),
  mockUseTreinamentosColaborador: vi.fn(),
  mockUseFeedbacksColaborador: vi.fn(),
  mockUseOnboardingColaborador: vi.fn(),
}));

vi.mock('@/services', () => ({ colaboradorService: { buscarPorId: mockBuscarPorId } }));
vi.mock('@/services/colaboradorDetalhesService', () => ({
  listarFeriasColaborador: mockListarFeriasColaborador,
}));
vi.mock('@/services/timelineService', () => ({
  listarHistoricoCargoTimeline: mockListarHistoricoCargoTimeline,
  listarPromocoesTimeline: mockListarPromocoesTimeline,
  listarTransferenciasTimeline: mockListarTransferenciasTimeline,
  listarAfastamentosTimeline: mockListarAfastamentosTimeline,
  listarDesligamentoTimeline: mockListarDesligamentoTimeline,
}));
// A trilha vem pela RPC `get_audit_trail` via auditoriaService — leitura direta
// de audit_log no frontend é proibida pelo gate audit-bridge-frontend-contract.
vi.mock('@/services/auditoriaService', () => ({ auditoriaService: { listarTrilha: mockListarTrilha } }));
vi.mock('@/services/catalogoCursoService', () => ({
  catalogoCursoService: { listarInscricoesPorColaborador: mockListarInscricoesPorColaborador },
}));
vi.mock('@/services/vinculoService', () => ({ vinculoService: { listarPorColaborador: mockListarPorColaborador } }));
vi.mock('@/hooks/useHistoricoContratos', () => ({ useHistoricoContratos: mockUseHistoricoContratos }));
vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  useHistoricoSalarial: mockUseHistoricoSalarial,
  useCriarRegistroSalarial: mockUseCriarRegistroSalarial,
}));
vi.mock('@/hooks/useNovasTabelas', () => ({
  useMedidasDisciplinaresColaborador: mockUseMedidasDisciplinaresColaborador,
}));
vi.mock('@/hooks/useDesenvolvimentoColaborador', () => ({
  useTreinamentosColaborador: mockUseTreinamentosColaborador,
  useFeedbacksColaborador: mockUseFeedbacksColaborador,
  useOnboardingColaborador: mockUseOnboardingColaborador,
}));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));

import { useHistoricoColaborador } from '../useHistoricoColaborador';

function query<T>(data: T) {
  return { data, isLoading: false, isError: false };
}

function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

describe('useHistoricoColaborador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuscarPorId.mockResolvedValue({ data_admissao: '2020-01-10', status: 'ativo', tipo_contrato: 'clt' });
    mockListarFeriasColaborador.mockResolvedValue([]);
    mockListarHistoricoCargoTimeline.mockResolvedValue([]);
    mockListarPromocoesTimeline.mockResolvedValue([
      { id: 'promo-1', data_vigencia: '2022-03-01', motivo: 'Mérito', salario_anterior: 3300, salario_novo: 3800 },
    ]);
    mockListarTransferenciasTimeline.mockResolvedValue([]);
    mockListarAfastamentosTimeline.mockResolvedValue([]);
    mockListarDesligamentoTimeline.mockResolvedValue([]);
    mockListarTrilha.mockResolvedValue([]);
    mockListarInscricoesPorColaborador.mockResolvedValue([]);
    mockListarPorColaborador.mockResolvedValue([]);
    mockUseHistoricoContratos.mockReturnValue({
      historico: [],
      isLoading: false,
      isError: false,
      criar: vi.fn(),
      excluir: vi.fn(),
    });
    mockUseHistoricoSalarial.mockReturnValue(
      query([
        {
          id: 'sal-1',
          data_vigencia: '2021-05-01',
          motivo: 'Reajuste anual',
          salario_anterior: 3000,
          salario_novo: 3300,
        },
      ])
    );
    mockUseCriarRegistroSalarial.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseMedidasDisciplinaresColaborador.mockReturnValue(query([]));
    mockUseTreinamentosColaborador.mockReturnValue(query([]));
    mockUseFeedbacksColaborador.mockReturnValue(query([]));
    mockUseOnboardingColaborador.mockReturnValue({
      onboarding: null,
      tarefas: [],
      isLoading: false,
      isError: false,
    });
  });

  it('merges events from every source and sorts them from most to least recent', async () => {
    const { result } = renderHook(() => useHistoricoColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.events.map((e) => e.date)).toEqual(['2022-03-01', '2021-05-01', '2020-01-10']);
    expect(result.current.events.map((e) => e.source)).toEqual(['promocoes', 'historico_salarial', 'colaboradores']);
  });

  it('preserves rich fields instead of flattening them into a single description string', async () => {
    const { result } = renderHook(() => useHistoricoColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const salario = result.current.events.find((e) => e.source === 'historico_salarial');
    // Moeda montada pelo MESMO formatador do hook: `toLocaleString('pt-BR')`
    // separa "R$" com espaço não-quebrável (U+00A0), que um literal não tem.
    expect(salario?.description).toBe(`De ${brl(3000)} para ${brl(3300)}`);
    expect(salario?.secondary).toBe('Reajuste anual');
  });

  it('includes audit entries as a filterable "auditoria" event type (now unified, not a separate tab)', async () => {
    mockListarTrilha.mockResolvedValue([
      {
        id: 'audit-1',
        acao: 'UPDATE',
        user_email: 'rh@empresa.com',
        created_at: '2023-01-01T10:00:00Z',
        campos_alterados: ['cargo'],
        dados_anteriores: { cargo: 'Analista' },
        dados_novos: { cargo: 'Coordenador' },
      },
    ]);
    const { result } = renderHook(() => useHistoricoColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const auditoria = result.current.events.find((e) => e.type === 'auditoria');
    expect(auditoria?.title).toBe('Cadastro atualizado');
    expect(auditoria?.auditDetail?.alteracoes).toEqual([{ campo: 'cargo', de: 'Analista', para: 'Coordenador' }]);
  });

  // `get_audit_trail` devolve também os acessos de PII (acao 'VISUALIZACAO').
  // Tratá-los como evento fazia o dossiê exibir "Registro excluído".
  it('ignora ações da trilha que não são INSERT/UPDATE/DELETE', async () => {
    mockListarTrilha.mockResolvedValue([
      { id: 'audit-view', acao: 'VISUALIZACAO', created_at: '2023-02-01T10:00:00Z' },
      { id: 'audit-ins', acao: 'INSERT', created_at: '2023-02-02T10:00:00Z' },
    ]);
    const { result } = renderHook(() => useHistoricoColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const auditorias = result.current.events.filter((e) => e.type === 'auditoria');
    expect(auditorias).toHaveLength(1);
    expect(auditorias[0].title).toBe('Registro criado');
  });

  it('exposes the colaborador record for the sidebar summary (status, tipo_contrato, data_admissao)', async () => {
    const { result } = renderHook(() => useHistoricoColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.colaborador).toMatchObject({
      status: 'ativo',
      tipo_contrato: 'clt',
      data_admissao: '2020-01-10',
    });
  });

  it('lê o colaborador com o empresa_id da empresa atual (isolamento de tenant)', async () => {
    const { result } = renderHook(() => useHistoricoColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockBuscarPorId).toHaveBeenCalledWith('col-1', 'emp-1');
    expect(mockListarAfastamentosTimeline).toHaveBeenCalledWith('col-1', 'emp-1');
    expect(mockListarDesligamentoTimeline).toHaveBeenCalledWith('col-1', 'emp-1');
    expect(mockListarTrilha).toHaveBeenCalledWith(
      expect.objectContaining({ empresa_id: 'emp-1', tabela: 'colaboradores', registro_id: 'col-1' })
    );
  });

  it('usa os vínculos como fonte da admissão quando existem, numerando as recontratações', async () => {
    mockListarPorColaborador.mockResolvedValue([
      { id: 'v-2', data_inicio: '2023-02-01', tipo: 'clt' },
      { id: 'v-1', data_inicio: '2020-01-10', tipo: 'clt' },
    ]);
    const { result } = renderHook(() => useHistoricoColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const vinculos = result.current.events.filter((e) => e.source === 'vinculos');
    expect(vinculos.map((e) => e.title)).toEqual(['Recontratação (2ª passagem)', 'Admissão inicial']);
    expect(result.current.events.some((e) => e.source === 'colaboradores')).toBe(false);
  });

  // `treinamento_participantes` não tem writer no app; o fluxo real grava em
  // `inscricoes_cursos`. Só inscrição concluída é um fato do histórico.
  it('inclui apenas cursos concluídos, datados pela conclusão', async () => {
    mockListarInscricoesPorColaborador.mockResolvedValue([
      {
        id: 'ins-1',
        status: 'Concluído',
        data_conclusao: '2024-06-10',
        nota: 9,
        curso: { nome: 'NR-35', carga_horaria: 8 },
      },
      { id: 'ins-2', status: 'em_andamento', data_conclusao: null, curso: { nome: 'Excel' } },
      { id: 'ins-3', status: 'concluida', data_conclusao: null, curso: { nome: 'Sem data' } },
    ]);
    const { result } = renderHook(() => useHistoricoColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const cursos = result.current.events.filter((e) => e.source === 'inscricoes_cursos');
    expect(cursos).toHaveLength(1);
    expect(cursos[0].date).toBe('2024-06-10');
    expect(cursos[0].title).toBe('Curso concluido: NR-35');
    expect(cursos[0].description).toBe('Nota: 9');
    expect(cursos[0].secondary).toBe('Carga horaria: 8h');
  });

  // `feedbacks_360.status` é TEXT livre com default 'pendente': rotular tudo
  // como "concluído" mostrava avaliação recém-criada como finalizada.
  it('rotula o feedback 360 pelo status canônico, não como concluído por padrão', async () => {
    mockUseFeedbacksColaborador.mockReturnValue(
      query([
        { id: 'fb-1', created_at: '2024-01-10', status: 'pendente', nota_geral: 7 },
        { id: 'fb-2', created_at: '2024-02-10', status: 'finalizado' },
      ])
    );
    const { result } = renderHook(() => useHistoricoColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const titulos = result.current.events.filter((e) => e.type === 'avaliacao').map((e) => e.title);
    expect(titulos).toContain('Feedback 360 — Concluído');
    expect(titulos.some((t) => t !== 'Feedback 360 — Concluído')).toBe(true);
    expect(titulos).not.toContain('Feedback 360 concluído');
  });

  // Sem isError, uma fonte que falha virava lista vazia via `|| []` e o RH veria
  // um histórico PARCIAL como completo.
  it('expõe isError quando qualquer uma das fontes falha', async () => {
    mockListarTrilha.mockRejectedValue(new Error('permission denied'));
    const { result } = renderHook(() => useHistoricoColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
