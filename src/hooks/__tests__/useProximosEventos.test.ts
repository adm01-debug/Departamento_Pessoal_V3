import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// `useProximosEventos` não tem query própria: só agrega 6 hooks existentes.
// Por isso os mocks são no nível dos HOOKS (e não dos services) — assim o
// teste exercita exatamente o recorte/ordenação/agregação de estado que este
// arquivo adiciona, sem depender da cadeia de services de cada fonte.
const {
  mockUsePeriodoExperiencia,
  mockUsePeriodosAquisitivos,
  mockUseASOs,
  mockUseFeriasResumoColaborador,
  mockUseDocumentosPessoais,
  mockUseOnboardingColaborador,
} = vi.hoisted(() => ({
  mockUsePeriodoExperiencia: vi.fn(),
  mockUsePeriodosAquisitivos: vi.fn(),
  mockUseASOs: vi.fn(),
  mockUseFeriasResumoColaborador: vi.fn(),
  mockUseDocumentosPessoais: vi.fn(),
  mockUseOnboardingColaborador: vi.fn(),
}));

vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  usePeriodoExperiencia: mockUsePeriodoExperiencia,
  usePeriodosAquisitivos: mockUsePeriodosAquisitivos,
  useASOs: mockUseASOs,
  useFeriasResumoColaborador: mockUseFeriasResumoColaborador,
}));
vi.mock('@/hooks/useTabelasReferencia', () => ({ useDocumentosPessoais: mockUseDocumentosPessoais }));
vi.mock('@/hooks/useDesenvolvimentoColaborador', () => ({
  useOnboardingColaborador: mockUseOnboardingColaborador,
}));

import { useProximosEventos } from '../useProximosEventos';

function query<T>(data: T) {
  return { data, isLoading: false, isError: false };
}

describe('useProximosEventos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePeriodoExperiencia.mockReturnValue(query(null));
    mockUsePeriodosAquisitivos.mockReturnValue(query([]));
    mockUseASOs.mockReturnValue(query([]));
    mockUseFeriasResumoColaborador.mockReturnValue(query([]));
    mockUseDocumentosPessoais.mockReturnValue(query([]));
    mockUseOnboardingColaborador.mockReturnValue({ pendentes: [], isLoading: false, isError: false });
  });

  it('returns an empty list when nothing is upcoming', () => {
    const { result } = renderHook(() => useProximosEventos('col-1', 'emp-1'));
    expect(result.current.eventos).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('includes a future ASO expiration and a future document expiration, sorted by date', () => {
    mockUseASOs.mockReturnValue(query([{ data_validade: '2099-06-01' }]));
    mockUseDocumentosPessoais.mockReturnValue(query([{ data_validade: '2099-01-01', tipo_documento: 'CNH' }]));
    const { result } = renderHook(() => useProximosEventos('col-1', 'emp-1'));
    expect(result.current.eventos.length).toBe(2);
    expect(result.current.eventos[0].data).toBe('2099-01-01');
    expect(result.current.eventos[0].tipo).toBe('documento');
    expect(result.current.eventos[1].tipo).toBe('aso');
  });

  it('ignores expired/past dates', () => {
    mockUseASOs.mockReturnValue(query([{ data_validade: '2000-01-01' }]));
    const { result } = renderHook(() => useProximosEventos('col-1', 'emp-1'));
    expect(result.current.eventos).toEqual([]);
  });

  it('excludes a período de experiência already concluído', () => {
    mockUsePeriodoExperiencia.mockReturnValue(query({ segunda_etapa_fim: '2099-01-01', status: 'concluido' }));
    const { result } = renderHook(() => useProximosEventos('col-1', 'emp-1'));
    expect(result.current.eventos).toEqual([]);
  });

  it('inclui o fim do período de experiência ainda em curso', () => {
    mockUsePeriodoExperiencia.mockReturnValue(query({ segunda_etapa_fim: '2099-01-01', status: 'em_andamento' }));
    const { result } = renderHook(() => useProximosEventos('col-1', 'emp-1'));
    expect(result.current.eventos).toHaveLength(1);
    expect(result.current.eventos[0].tipo).toBe('experiencia');
  });

  // Coluna real da tabela: `data_limite_concessao` (não `fim_concessivo`).
  it('usa data_limite_concessao do período aquisitivo', () => {
    mockUsePeriodosAquisitivos.mockReturnValue(query([{ data_limite_concessao: '2099-03-01', status: 'adquirido' }]));
    const { result } = renderHook(() => useProximosEventos('col-1', 'emp-1'));
    expect(result.current.eventos).toHaveLength(1);
    expect(result.current.eventos[0].tipo).toBe('ferias_vencimento');
    expect(result.current.eventos[0].data).toBe('2099-03-01');
  });

  it('ignora período aquisitivo já encerrado (gozado/pago/vencido) ou com perdeu_direito', () => {
    mockUsePeriodosAquisitivos.mockReturnValue(
      query([
        { data_limite_concessao: '2099-03-01', status: 'gozado' },
        { data_limite_concessao: '2099-04-01', status: 'pago' },
        { data_limite_concessao: '2099-05-01', status: 'vencido' },
        { data_limite_concessao: '2099-06-01', status: 'adquirido', perdeu_direito: true },
      ])
    );
    const { result } = renderHook(() => useProximosEventos('col-1', 'emp-1'));
    expect(result.current.eventos).toEqual([]);
  });

  it('ignora ASO cancelado mesmo com data_validade futura', () => {
    mockUseASOs.mockReturnValue(
      query([
        { data_validade: '2099-06-01', status: 'cancelado' },
        { data_validade: '2099-07-01', status: 'validado' },
      ])
    );
    const { result } = renderHook(() => useProximosEventos('col-1', 'emp-1'));
    expect(result.current.eventos).toHaveLength(1);
    expect(result.current.eventos[0].data).toBe('2099-07-01');
  });

  it('usa o status real das férias programadas no badge, sem contagem de dias', () => {
    mockUseFeriasResumoColaborador.mockReturnValue(
      query([
        { data_inicio: '2099-02-01', status: 'aprovada', dias_gozo: 15 },
        { data_inicio: '2099-03-01', status: 'pendente' },
      ])
    );
    const { result } = renderHook(() => useProximosEventos('col-1', 'emp-1'));
    expect(result.current.eventos.map((e) => e.badge)).toEqual([
      { label: 'Aprovado', tone: 'success' },
      { label: 'Pendente', tone: 'warning' },
    ]);
    expect(result.current.eventos[0].categoria).toBe('15 dias');
  });

  it('inclui tarefa de onboarding pendente com prazo futuro', () => {
    mockUseOnboardingColaborador.mockReturnValue({
      pendentes: [{ data_prazo: '2099-01-15', titulo: 'Enviar exame admissional' }],
      isLoading: false,
      isError: false,
    });
    const { result } = renderHook(() => useProximosEventos('col-1', 'emp-1'));
    expect(result.current.eventos).toHaveLength(1);
    expect(result.current.eventos[0].tipo).toBe('onboarding');
    expect(result.current.eventos[0].titulo).toBe('Enviar exame admissional');
  });

  // Sem isError o card não distingue "não há eventos" de "não foi possível
  // carregar" — a lista parcial passaria por completa.
  it('propaga isError quando qualquer uma das 6 fontes falha', () => {
    mockUseASOs.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    const { result } = renderHook(() => useProximosEventos('col-1', 'emp-1'));
    expect(result.current.isError).toBe(true);
  });

  it('propaga isLoading enquanto qualquer uma das 6 fontes carrega', () => {
    mockUseOnboardingColaborador.mockReturnValue({ pendentes: [], isLoading: true, isError: false });
    const { result } = renderHook(() => useProximosEventos('col-1', 'emp-1'));
    expect(result.current.isLoading).toBe(true);
  });
});
