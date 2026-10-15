import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const {
  mockListarBatidas,
  mockListarBatidasPorData,
  mockRegistrarBatida,
  mockListarFaltas,
  mockListarFaltasColaborador,
  mockCriarFalta,
  mockAtualizarFalta,
  mockExcluirFalta,
  mockListarMedidas,
  mockListarMedidasColaborador,
  mockCriarMedida,
  mockAtualizarMedida,
  mockListarEpis,
  mockCriarEpi,
  mockAtualizarEpi,
  mockExcluirEpi,
  mockListarEntregas,
  mockListarEntregasColaborador,
  mockCriarEntrega,
  mockRegistrarDevolucao,
  mockListarHorarios,
  mockSalvarGrade,
  mockBuscarBancoHoras,
  mockSalvarBancoHoras,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockListarBatidas: vi.fn(),
  mockListarBatidasPorData: vi.fn(),
  mockRegistrarBatida: vi.fn(),
  mockListarFaltas: vi.fn(),
  mockListarFaltasColaborador: vi.fn(),
  mockCriarFalta: vi.fn(),
  mockAtualizarFalta: vi.fn(),
  mockExcluirFalta: vi.fn(),
  mockListarMedidas: vi.fn(),
  mockListarMedidasColaborador: vi.fn(),
  mockCriarMedida: vi.fn(),
  mockAtualizarMedida: vi.fn(),
  mockListarEpis: vi.fn(),
  mockCriarEpi: vi.fn(),
  mockAtualizarEpi: vi.fn(),
  mockExcluirEpi: vi.fn(),
  mockListarEntregas: vi.fn(),
  mockListarEntregasColaborador: vi.fn(),
  mockCriarEntrega: vi.fn(),
  mockRegistrarDevolucao: vi.fn(),
  mockListarHorarios: vi.fn(),
  mockSalvarGrade: vi.fn(),
  mockBuscarBancoHoras: vi.fn(),
  mockSalvarBancoHoras: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/services/batidasPontoService', () => ({
  batidasPontoService: {
    listar: mockListarBatidas,
    listarPorData: mockListarBatidasPorData,
    registrar: mockRegistrarBatida,
  },
}));

vi.mock('@/services/faltasService', () => ({
  faltasService: {
    listar: mockListarFaltas,
    buscarPorColaborador: mockListarFaltasColaborador,
    criar: mockCriarFalta,
    atualizar: mockAtualizarFalta,
    excluir: mockExcluirFalta,
  },
}));

vi.mock('@/services/medidasDisciplinaresService', () => ({
  medidasDisciplinaresService: {
    listar: mockListarMedidas,
    buscarPorColaborador: mockListarMedidasColaborador,
    criar: mockCriarMedida,
    atualizar: mockAtualizarMedida,
  },
}));

vi.mock('@/services/episService', () => ({
  episService: {
    listar: mockListarEpis,
    criar: mockCriarEpi,
    atualizar: mockAtualizarEpi,
    excluir: mockExcluirEpi,
  },
  episEntregasService: {
    listar: mockListarEntregas,
    buscarPorColaborador: mockListarEntregasColaborador,
    criar: mockCriarEntrega,
    registrarDevolucao: mockRegistrarDevolucao,
  },
}));

vi.mock('@/services/jornadaHorariosService', () => ({
  jornadaHorariosService: {
    listar: mockListarHorarios,
    salvarGrade: mockSalvarGrade,
  },
}));

vi.mock('@/services/bancoHorasConfigService', () => ({
  bancoHorasConfigService: {
    buscar: mockBuscarBancoHoras,
    salvar: mockSalvarBancoHoras,
  },
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
  useBatidasPontoDia,
  useRegistrarBatida,
  useFaltas,
  useFaltasColaborador,
  useCriarFalta,
  useAtualizarFalta,
  useExcluirFalta,
  useMedidasDisciplinares,
  useMedidasDisciplinaresColaborador,
  useCriarMedidaDisciplinar,
  useAtualizarMedidaDisciplinar,
  useEpis,
  useCriarEpi,
  useAtualizarEpi,
  useExcluirEpi,
  useEpisEntregas,
  useEpisEntregasColaborador,
  useCriarEpiEntrega,
  useDevolverEpi,
  useJornadaHorarios,
  useSalvarGradeHorarios,
  useBancoHorasConfig,
  useSalvarBancoHorasConfig,
} from '../useNovasTabelas';

import { wrapper, createWrapper } from '@/test/queryWrapper';

describe('useBatidasPonto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarBatidas.mockResolvedValue([]);
  });

  it('is disabled and returns empty when no colaboradorId', () => {
    renderHook(() => useBatidasPonto(''), { wrapper });
    expect(mockListarBatidas).not.toHaveBeenCalled();
  });

  it('calls batidasPontoService.listar with colaboradorId', async () => {
    const { result } = renderHook(() => useBatidasPonto('col-1'), { wrapper });
    await waitFor(() => !result.current.isLoading);
    expect(mockListarBatidas).toHaveBeenCalledWith('col-1', undefined, undefined, 'emp-1');
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
      await result.current.mutateAsync({
        tipo: 'entrada',
        colaborador_id: 'col-1',
        data: '2026-01-01',
        hora: '08:00',
        ordem: 1,
      });
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
    expect(mockListarFaltasColaborador).toHaveBeenCalledWith('col-1', 'emp-1');
  });

  it('is disabled when no colaboradorId', () => {
    renderHook(() => useFaltasColaborador(''), { wrapper });
    expect(mockListarFaltasColaborador).not.toHaveBeenCalled();
  });
});

describe('useBatidasPontoDia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarBatidasPorData.mockResolvedValue([]);
  });

  it('calls batidasPontoService.listarPorData with data and empresaId', async () => {
    const { result } = renderHook(() => useBatidasPontoDia('2026-01-02'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarBatidasPorData).toHaveBeenCalledWith('2026-01-02', 'emp-1');
  });

  it('is disabled when no data', () => {
    renderHook(() => useBatidasPontoDia(''), { wrapper });
    expect(mockListarBatidasPorData).not.toHaveBeenCalled();
  });
});

describe('useCriarFalta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarFalta.mockResolvedValue({ id: 'f1' });
  });

  it('calls faltasService.criar, toasts and invalidates faltas', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCriarFalta(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ colaborador_id: 'col-1', data: '2026-01-03' });
    });

    expect(mockCriarFalta).toHaveBeenCalledWith(expect.objectContaining({ colaborador_id: 'col-1' }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['faltas'] });
    expect(mockToastSuccess).toHaveBeenCalledWith('Falta registrada');
  });

  it('calls toast.error on failure', async () => {
    mockCriarFalta.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useCriarFalta(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ colaborador_id: 'col-1' })).rejects.toThrow();
    });
    expect(mockToastError).toHaveBeenCalled();
  });
});

describe('useAtualizarFalta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAtualizarFalta.mockResolvedValue({ id: 'f1' });
  });

  it('calls faltasService.atualizar with id, dados and empresaId', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useAtualizarFalta(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ id: 'f1', justificada: true });
    });

    expect(mockAtualizarFalta).toHaveBeenCalledWith('f1', { justificada: true }, 'emp-1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['faltas'] });
    expect(mockToastSuccess).toHaveBeenCalledWith('Falta atualizada');
  });

  it('calls toast.error on failure', async () => {
    mockAtualizarFalta.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useAtualizarFalta(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ id: 'f1' })).rejects.toThrow();
    });
    expect(mockToastError).toHaveBeenCalled();
  });
});

describe('useExcluirFalta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExcluirFalta.mockResolvedValue(undefined);
  });

  it('calls faltasService.excluir with id and empresaId', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useExcluirFalta(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync('f1');
    });

    expect(mockExcluirFalta).toHaveBeenCalledWith('f1', 'emp-1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['faltas'] });
    expect(mockToastSuccess).toHaveBeenCalledWith('Falta excluída');
  });

  it('calls toast.error on failure', async () => {
    mockExcluirFalta.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useExcluirFalta(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync('f1')).rejects.toThrow();
    });
    expect(mockToastError).toHaveBeenCalled();
  });
});

describe('useMedidasDisciplinares', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarMedidas.mockResolvedValue([]);
  });

  it('calls medidasDisciplinaresService.listar with empresaId', async () => {
    const { result } = renderHook(() => useMedidasDisciplinares(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarMedidas).toHaveBeenCalledWith('emp-1');
  });
});

describe('useMedidasDisciplinaresColaborador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarMedidasColaborador.mockResolvedValue([]);
  });

  it('calls buscarPorColaborador with colaboradorId and empresaId', async () => {
    const { result } = renderHook(() => useMedidasDisciplinaresColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarMedidasColaborador).toHaveBeenCalledWith('col-1', 'emp-1');
  });

  it('is disabled when no colaboradorId', () => {
    renderHook(() => useMedidasDisciplinaresColaborador(''), { wrapper });
    expect(mockListarMedidasColaborador).not.toHaveBeenCalled();
  });
});

describe('useCriarMedidaDisciplinar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarMedida.mockResolvedValue({ id: 'm1' });
  });

  it('calls medidasDisciplinaresService.criar, toasts and invalidates', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCriarMedidaDisciplinar(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({
        colaborador_id: 'col-1',
        tipo: 'advertencia',
        descricao: 'Atraso recorrente',
        data_ocorrencia: '2026-01-05',
      });
    });

    expect(mockCriarMedida).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'advertencia' }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['medidas-disciplinares'] });
    expect(mockToastSuccess).toHaveBeenCalledWith('Medida disciplinar registrada');
  });

  it('calls toast.error on failure', async () => {
    mockCriarMedida.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useCriarMedidaDisciplinar(), { wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          colaborador_id: 'col-1',
          tipo: 'advertencia',
          descricao: 'x',
          data_ocorrencia: '2026-01-05',
        })
      ).rejects.toThrow();
    });
    expect(mockToastError).toHaveBeenCalled();
  });
});

describe('useAtualizarMedidaDisciplinar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAtualizarMedida.mockResolvedValue({ id: 'm1' });
  });

  it('calls atualizar with id, dados and empresaId', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useAtualizarMedidaDisciplinar(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ id: 'm1', status: 'aplicada' });
    });

    expect(mockAtualizarMedida).toHaveBeenCalledWith('m1', { status: 'aplicada' }, 'emp-1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['medidas-disciplinares'] });
    expect(mockToastSuccess).toHaveBeenCalledWith('Medida atualizada');
  });

  it('calls toast.error on failure', async () => {
    mockAtualizarMedida.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useAtualizarMedidaDisciplinar(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ id: 'm1' })).rejects.toThrow();
    });
    expect(mockToastError).toHaveBeenCalled();
  });
});

describe('useEpis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarEpis.mockResolvedValue([]);
  });

  it('calls episService.listar with empresaId', async () => {
    const { result } = renderHook(() => useEpis(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarEpis).toHaveBeenCalledWith('emp-1');
  });
});

describe('useCriarEpi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarEpi.mockResolvedValue({ id: 'e1' });
  });

  it('calls episService.criar, toasts and invalidates epis', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCriarEpi(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ nome: 'Capacete' });
    });

    expect(mockCriarEpi).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Capacete' }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['epis'] });
    expect(mockToastSuccess).toHaveBeenCalledWith('EPI cadastrado');
  });

  it('calls toast.error on failure', async () => {
    mockCriarEpi.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useCriarEpi(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ nome: 'Capacete' })).rejects.toThrow();
    });
    expect(mockToastError).toHaveBeenCalled();
  });
});

describe('useAtualizarEpi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAtualizarEpi.mockResolvedValue({ id: 'e1' });
  });

  it('calls episService.atualizar with id, dados and empresaId', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useAtualizarEpi(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ id: 'e1', nome: 'Capacete novo' });
    });

    expect(mockAtualizarEpi).toHaveBeenCalledWith('e1', { nome: 'Capacete novo' }, 'emp-1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['epis'] });
    expect(mockToastSuccess).toHaveBeenCalledWith('EPI atualizado');
  });

  it('calls toast.error on failure', async () => {
    mockAtualizarEpi.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useAtualizarEpi(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ id: 'e1' })).rejects.toThrow();
    });
    expect(mockToastError).toHaveBeenCalled();
  });
});

describe('useExcluirEpi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExcluirEpi.mockResolvedValue(undefined);
  });

  it('calls episService.excluir with id and empresaId', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useExcluirEpi(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync('e1');
    });

    expect(mockExcluirEpi).toHaveBeenCalledWith('e1', 'emp-1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['epis'] });
    expect(mockToastSuccess).toHaveBeenCalledWith('EPI excluído');
  });

  it('calls toast.error on failure', async () => {
    mockExcluirEpi.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useExcluirEpi(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync('e1')).rejects.toThrow();
    });
    expect(mockToastError).toHaveBeenCalled();
  });
});

describe('useEpisEntregas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarEntregas.mockResolvedValue([]);
  });

  it('calls episEntregasService.listar with empresaId', async () => {
    const { result } = renderHook(() => useEpisEntregas(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarEntregas).toHaveBeenCalledWith('emp-1');
  });
});

describe('useEpisEntregasColaborador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarEntregasColaborador.mockResolvedValue([]);
  });

  it('calls buscarPorColaborador with colaboradorId and empresaId', async () => {
    const { result } = renderHook(() => useEpisEntregasColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarEntregasColaborador).toHaveBeenCalledWith('col-1', 'emp-1');
  });

  it('is disabled when no colaboradorId', () => {
    renderHook(() => useEpisEntregasColaborador(''), { wrapper });
    expect(mockListarEntregasColaborador).not.toHaveBeenCalled();
  });
});

describe('useCriarEpiEntrega', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarEntrega.mockResolvedValue({ id: 'en1' });
  });

  it('calls episEntregasService.criar, toasts and invalidates', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCriarEpiEntrega(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ colaborador_id: 'col-1', epi_id: 'e1', data_entrega: '2026-01-10' });
    });

    expect(mockCriarEntrega).toHaveBeenCalledWith(expect.objectContaining({ epi_id: 'e1' }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['epis-entregas'] });
    expect(mockToastSuccess).toHaveBeenCalledWith('Entrega de EPI registrada');
  });

  it('calls toast.error on failure', async () => {
    mockCriarEntrega.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useCriarEpiEntrega(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ epi_id: 'e1' })).rejects.toThrow();
    });
    expect(mockToastError).toHaveBeenCalled();
  });
});

describe('useDevolverEpi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegistrarDevolucao.mockResolvedValue({ id: 'en1' });
  });

  it('calls registrarDevolucao with id, dataDevolucao and empresaId', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useDevolverEpi(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ id: 'en1', dataDevolucao: '2026-02-01' });
    });

    expect(mockRegistrarDevolucao).toHaveBeenCalledWith('en1', '2026-02-01', 'emp-1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['epis-entregas'] });
    expect(mockToastSuccess).toHaveBeenCalledWith('Devolução registrada');
  });

  it('calls toast.error on failure', async () => {
    mockRegistrarDevolucao.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useDevolverEpi(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ id: 'en1', dataDevolucao: '2026-02-01' })).rejects.toThrow();
    });
    expect(mockToastError).toHaveBeenCalled();
  });
});

describe('useJornadaHorarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarHorarios.mockResolvedValue([]);
  });

  it('calls jornadaHorariosService.listar with jornadaId', async () => {
    const { result } = renderHook(() => useJornadaHorarios('jor-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarHorarios).toHaveBeenCalledWith('jor-1');
  });

  it('is disabled when no jornadaId', () => {
    renderHook(() => useJornadaHorarios(''), { wrapper });
    expect(mockListarHorarios).not.toHaveBeenCalled();
  });
});

describe('useSalvarGradeHorarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSalvarGrade.mockResolvedValue([]);
  });

  it('calls salvarGrade with jornadaId and horarios', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useSalvarGradeHorarios(), { wrapper: w });
    const horarios = [{ jornada_id: 'jor-1', dia_semana: 1, entrada: '08:00', saida: '17:00' }];

    await act(async () => {
      await result.current.mutateAsync({ jornadaId: 'jor-1', horarios });
    });

    expect(mockSalvarGrade).toHaveBeenCalledWith('jor-1', horarios);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['jornada-horarios'] });
    expect(mockToastSuccess).toHaveBeenCalledWith('Grade horária salva');
  });

  it('calls toast.error on failure', async () => {
    mockSalvarGrade.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useSalvarGradeHorarios(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ jornadaId: 'jor-1', horarios: [] })).rejects.toThrow();
    });
    expect(mockToastError).toHaveBeenCalled();
  });
});

describe('useBancoHorasConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuscarBancoHoras.mockResolvedValue({ limite_horas: 40 });
  });

  it('calls bancoHorasConfigService.buscar with empresaId', async () => {
    const { result } = renderHook(() => useBancoHorasConfig(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockBuscarBancoHoras).toHaveBeenCalledWith('emp-1');
    expect(result.current.data).toEqual({ limite_horas: 40 });
  });
});

describe('useSalvarBancoHorasConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSalvarBancoHoras.mockResolvedValue({ id: 'bh1' });
  });

  it('calls bancoHorasConfigService.salvar, toasts and invalidates', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useSalvarBancoHorasConfig(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ limite_horas: 40 });
    });

    expect(mockSalvarBancoHoras).toHaveBeenCalledWith({ limite_horas: 40 });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['banco-horas-config'] });
    expect(mockToastSuccess).toHaveBeenCalledWith('Configuração salva');
  });

  it('calls toast.error on failure', async () => {
    mockSalvarBancoHoras.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useSalvarBancoHorasConfig(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ limite_horas: 40 })).rejects.toThrow();
    });
    expect(mockToastError).toHaveBeenCalled();
  });
});
