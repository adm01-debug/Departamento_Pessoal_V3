import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const {
  mockListarDependentes,
  mockCriarDependente,
  mockAtualizarDependente,
  mockExcluirDependente,
  mockListarContatosEmergencia,
  mockCriarContatoEmergencia,
  mockExcluirContatoEmergencia,
  mockListarHistoricoSalarial,
  mockCriarRegistroSalarial,
  mockListarASOs,
  mockCriarASO,
  mockListarFormacoes,
  mockCriarFormacao,
  mockExcluirFormacao,
  mockObterDadosEstrangeiro,
  mockSalvarDadosEstrangeiro,
  mockObterDeficiencia,
  mockSalvarDeficiencia,
  mockObterPeriodoExperiencia,
  mockSalvarPeriodoExperiencia,
  mockListarAnotacoes,
  mockCriarAnotacao,
  mockExcluirAnotacao,
  mockListarPeriodosAquisitivos,
  mockListarEtnias,
  mockListarIdentidadesGenero,
  mockListarTiposAdmissao,
  mockListarTiposEstabilidade,
  mockListarTimes,
  mockListarWebhooks,
  mockCriarWebhook,
  mockListarFeriasColetivas,
  mockCriarFeriasColetivas,
  mockListarCamposCustomizados,
} = vi.hoisted(() => ({
  mockListarDependentes: vi.fn(),
  mockCriarDependente: vi.fn(),
  mockAtualizarDependente: vi.fn(),
  mockExcluirDependente: vi.fn(),
  mockListarContatosEmergencia: vi.fn(),
  mockCriarContatoEmergencia: vi.fn(),
  mockExcluirContatoEmergencia: vi.fn(),
  mockListarHistoricoSalarial: vi.fn(),
  mockCriarRegistroSalarial: vi.fn(),
  mockListarASOs: vi.fn(),
  mockCriarASO: vi.fn(),
  mockListarFormacoes: vi.fn(),
  mockCriarFormacao: vi.fn(),
  mockExcluirFormacao: vi.fn(),
  mockObterDadosEstrangeiro: vi.fn(),
  mockSalvarDadosEstrangeiro: vi.fn(),
  mockObterDeficiencia: vi.fn(),
  mockSalvarDeficiencia: vi.fn(),
  mockObterPeriodoExperiencia: vi.fn(),
  mockSalvarPeriodoExperiencia: vi.fn(),
  mockListarAnotacoes: vi.fn(),
  mockCriarAnotacao: vi.fn(),
  mockExcluirAnotacao: vi.fn(),
  mockListarPeriodosAquisitivos: vi.fn(),
  mockListarEtnias: vi.fn(),
  mockListarIdentidadesGenero: vi.fn(),
  mockListarTiposAdmissao: vi.fn(),
  mockListarTiposEstabilidade: vi.fn(),
  mockListarTimes: vi.fn(),
  mockListarWebhooks: vi.fn(),
  mockCriarWebhook: vi.fn(),
  mockListarFeriasColetivas: vi.fn(),
  mockCriarFeriasColetivas: vi.fn(),
  mockListarCamposCustomizados: vi.fn(),
}));

vi.mock('@/services/colaboradorDetalhesService', () => ({
  listarDependentes: mockListarDependentes,
  criarDependente: mockCriarDependente,
  atualizarDependente: mockAtualizarDependente,
  excluirDependente: mockExcluirDependente,
  listarContatosEmergencia: mockListarContatosEmergencia,
  criarContatoEmergencia: mockCriarContatoEmergencia,
  excluirContatoEmergencia: mockExcluirContatoEmergencia,
  listarHistoricoSalarial: mockListarHistoricoSalarial,
  criarRegistroSalarial: mockCriarRegistroSalarial,
  listarASOs: mockListarASOs,
  criarASO: mockCriarASO,
  listarFormacoes: mockListarFormacoes,
  criarFormacao: mockCriarFormacao,
  excluirFormacao: mockExcluirFormacao,
  obterDadosEstrangeiro: mockObterDadosEstrangeiro,
  salvarDadosEstrangeiro: mockSalvarDadosEstrangeiro,
  obterDeficiencia: mockObterDeficiencia,
  salvarDeficiencia: mockSalvarDeficiencia,
  obterPeriodoExperiencia: mockObterPeriodoExperiencia,
  salvarPeriodoExperiencia: mockSalvarPeriodoExperiencia,
  listarAnotacoes: mockListarAnotacoes,
  criarAnotacao: mockCriarAnotacao,
  excluirAnotacao: mockExcluirAnotacao,
  listarPeriodosAquisitivos: mockListarPeriodosAquisitivos,
  listarEtnias: mockListarEtnias,
  listarIdentidadesGenero: mockListarIdentidadesGenero,
  listarTiposAdmissao: mockListarTiposAdmissao,
  listarTiposEstabilidade: mockListarTiposEstabilidade,
  listarTimes: mockListarTimes,
  listarWebhooks: mockListarWebhooks,
  criarWebhook: mockCriarWebhook,
  listarFeriasColetivas: mockListarFeriasColetivas,
  criarFeriasColetivas: mockCriarFeriasColetivas,
  listarCamposCustomizados: mockListarCamposCustomizados,
}));

import {
  useDependentes,
  useCriarDependente,
  useAtualizarDependente,
  useExcluirDependente,
  useContatosEmergencia,
  useCriarContatoEmergencia,
  useExcluirContatoEmergencia,
  useHistoricoSalarial,
  useCriarRegistroSalarial,
  useASOs,
  useCriarASO,
  useFormacoes,
  useCriarFormacao,
  useExcluirFormacao,
  useDadosEstrangeiro,
  useSalvarDadosEstrangeiro,
  useDeficiencia,
  useSalvarDeficiencia,
  usePeriodoExperiencia,
  useSalvarPeriodoExperiencia,
  useAnotacoes,
  useCriarAnotacao,
  useExcluirAnotacao,
  usePeriodosAquisitivos,
  useEtnias,
  useIdentidadesGenero,
  useTiposAdmissao,
  useTiposEstabilidade,
  useTimes,
  useWebhooks,
  useCriarWebhook,
  useFeriasColetivas,
  useCriarFeriasColetivas,
  useCamposCustomizados,
} from '../useColaboradorDetalhes';

vi.mock('@/hooks/useEmpresas', async () => (await import('@/test/empresaMock')).useEmpresasMockModule());

import { wrapper, createWrapper } from '@/test/queryWrapper';

describe('useDependentes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarDependentes.mockResolvedValue([]);
  });

  it('calls listarDependentes with colaboradorId', async () => {
    const { result } = renderHook(() => useDependentes('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarDependentes).toHaveBeenCalledWith('col-1', '00000000-0000-0000-0000-0000000000e1');
  });

  it('returns dependentes from service', async () => {
    const deps = [{ id: 'd1', nome: 'Filho 1' }];
    mockListarDependentes.mockResolvedValue(deps);
    const { result } = renderHook(() => useDependentes('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(deps);
  });

  it('is disabled when colaboradorId is empty', async () => {
    const { result } = renderHook(() => useDependentes(''), { wrapper });
    await waitFor(() => !result.current.isLoading);
    expect(mockListarDependentes).not.toHaveBeenCalled();
  });
});

describe('useCriarDependente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarDependente.mockResolvedValue({ id: 'd1' });
  });

  it('calls criarDependente with provided data', async () => {
    const { result } = renderHook(() => useCriarDependente(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        colaborador_id: 'col-1',
        nome: 'Filho',
        data_nascimento: '2015-01-01',
        parentesco: 'filho',
      });
    });

    expect(mockCriarDependente.mock.calls[0][0]).toEqual({
      colaborador_id: 'col-1',
      nome: 'Filho',
      data_nascimento: '2015-01-01',
      parentesco: 'filho',
    });
  });
});

describe('useContatosEmergencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarContatosEmergencia.mockResolvedValue([]);
  });

  it('calls listarContatosEmergencia with colaboradorId', async () => {
    const { result } = renderHook(() => useContatosEmergencia('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarContatosEmergencia).toHaveBeenCalledWith('col-1');
  });

  it('returns contatos from service', async () => {
    const contatos = [{ id: 'c1', nome: 'Mãe' }];
    mockListarContatosEmergencia.mockResolvedValue(contatos);
    const { result } = renderHook(() => useContatosEmergencia('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(contatos);
  });
});

describe('useCriarContatoEmergencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarContatoEmergencia.mockResolvedValue({ id: 'c1' });
  });

  it('calls criarContatoEmergencia with data', async () => {
    const { result } = renderHook(() => useCriarContatoEmergencia(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ colaborador_id: 'col-1', nome: 'Mãe' });
    });

    expect(mockCriarContatoEmergencia.mock.calls[0][0]).toMatchObject({ nome: 'Mãe' });
  });
});

describe('useAtualizarDependente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAtualizarDependente.mockResolvedValue({ id: 'd1' });
  });

  it('calls atualizarDependente with id, dados and empresaId', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useAtualizarDependente(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ id: 'd1', dados: { nome: 'Filho Atualizado' } });
    });

    expect(mockAtualizarDependente).toHaveBeenCalledWith(
      'd1',
      { nome: 'Filho Atualizado' },
      '00000000-0000-0000-0000-0000000000e1'
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dependentes'] });
  });
});

describe('useExcluirDependente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExcluirDependente.mockResolvedValue(undefined);
  });

  it('calls excluirDependente and invalidates dependentes do colaborador', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useExcluirDependente('col-1'), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync('d1');
    });

    expect(mockExcluirDependente).toHaveBeenCalledWith('d1', '00000000-0000-0000-0000-0000000000e1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dependentes', 'col-1'] });
  });
});

describe('useExcluirContatoEmergencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExcluirContatoEmergencia.mockResolvedValue(undefined);
  });

  it('calls excluirContatoEmergencia with colaboradorId and id', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useExcluirContatoEmergencia('col-1'), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync('c1');
    });

    expect(mockExcluirContatoEmergencia).toHaveBeenCalledWith('col-1', 'c1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['contatos-emergencia', 'col-1'] });
  });
});

describe('useHistoricoSalarial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarHistoricoSalarial.mockResolvedValue([]);
  });

  it('calls listarHistoricoSalarial with colaboradorId and empresaId', async () => {
    const { result } = renderHook(() => useHistoricoSalarial('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarHistoricoSalarial).toHaveBeenCalledWith('col-1', '00000000-0000-0000-0000-0000000000e1');
  });

  it('is disabled when no colaboradorId', () => {
    renderHook(() => useHistoricoSalarial(''), { wrapper });
    expect(mockListarHistoricoSalarial).not.toHaveBeenCalled();
  });
});

describe('useCriarRegistroSalarial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarRegistroSalarial.mockResolvedValue({ id: 'hs1' });
  });

  it('calls criarRegistroSalarial and invalidates historico do colaborador', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCriarRegistroSalarial(), { wrapper: w });
    const payload = {
      colaborador_id: 'col-1',
      salario_novo: 5000,
      data_vigencia: '2026-01-01',
      motivo: 'promoção',
    };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(mockCriarRegistroSalarial.mock.calls[0][0]).toEqual(payload);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['historico-salarial', 'col-1'] });
  });
});

describe('useASOs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarASOs.mockResolvedValue([]);
  });

  it('calls listarASOs with colaboradorId and empresaId', async () => {
    const { result } = renderHook(() => useASOs('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarASOs).toHaveBeenCalledWith('col-1', '00000000-0000-0000-0000-0000000000e1');
  });

  it('is disabled when no colaboradorId', () => {
    renderHook(() => useASOs(''), { wrapper });
    expect(mockListarASOs).not.toHaveBeenCalled();
  });
});

describe('useCriarASO', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarASO.mockResolvedValue({ id: 'a1' });
  });

  it('calls criarASO and invalidates asos do colaborador', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCriarASO(), { wrapper: w });
    const payload = { colaborador_id: 'col-1', tipo: 'periodico', data_exame: '2026-01-15' };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(mockCriarASO.mock.calls[0][0]).toEqual(payload);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['asos', 'col-1'] });
  });
});

describe('useFormacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarFormacoes.mockResolvedValue([]);
  });

  it('calls listarFormacoes with colaboradorId', async () => {
    const { result } = renderHook(() => useFormacoes('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarFormacoes).toHaveBeenCalledWith('col-1');
  });

  it('is disabled when no colaboradorId', () => {
    renderHook(() => useFormacoes(''), { wrapper });
    expect(mockListarFormacoes).not.toHaveBeenCalled();
  });
});

describe('useCriarFormacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarFormacao.mockResolvedValue({ id: 'f1' });
  });

  it('calls criarFormacao and invalidates formacoes do colaborador', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCriarFormacao(), { wrapper: w });
    const payload = { colaborador_id: 'col-1', curso: 'Engenharia' };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(mockCriarFormacao.mock.calls[0][0]).toEqual(payload);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['formacoes', 'col-1'] });
  });
});

describe('useExcluirFormacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExcluirFormacao.mockResolvedValue(undefined);
  });

  it('calls excluirFormacao with colaboradorId and id', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useExcluirFormacao('col-1'), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync('f1');
    });

    expect(mockExcluirFormacao).toHaveBeenCalledWith('col-1', 'f1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['formacoes', 'col-1'] });
  });
});

describe('useDadosEstrangeiro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObterDadosEstrangeiro.mockResolvedValue({ pais_origem: 'AR' });
  });

  it('calls obterDadosEstrangeiro with colaboradorId', async () => {
    const { result } = renderHook(() => useDadosEstrangeiro('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockObterDadosEstrangeiro).toHaveBeenCalledWith('col-1');
    expect(result.current.data).toEqual({ pais_origem: 'AR' });
  });

  it('is disabled when no colaboradorId', () => {
    renderHook(() => useDadosEstrangeiro(''), { wrapper });
    expect(mockObterDadosEstrangeiro).not.toHaveBeenCalled();
  });
});

describe('useSalvarDadosEstrangeiro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSalvarDadosEstrangeiro.mockResolvedValue({});
  });

  it('calls salvarDadosEstrangeiro and invalidates dados-estrangeiro', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useSalvarDadosEstrangeiro(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ colaboradorId: 'col-1', dados: { pais_origem: 'AR' } });
    });

    expect(mockSalvarDadosEstrangeiro).toHaveBeenCalledWith('col-1', { pais_origem: 'AR' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dados-estrangeiro', 'col-1'] });
  });
});

describe('useDeficiencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObterDeficiencia.mockResolvedValue(null);
  });

  it('calls obterDeficiencia with colaboradorId', async () => {
    const { result } = renderHook(() => useDeficiencia('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockObterDeficiencia).toHaveBeenCalledWith('col-1');
  });

  it('is disabled when no colaboradorId', () => {
    renderHook(() => useDeficiencia(''), { wrapper });
    expect(mockObterDeficiencia).not.toHaveBeenCalled();
  });
});

describe('useSalvarDeficiencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSalvarDeficiencia.mockResolvedValue({});
  });

  it('calls salvarDeficiencia and invalidates deficiencia do colaborador', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useSalvarDeficiencia(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ colaboradorId: 'col-1', dados: { tipo: 'fisica' } });
    });

    expect(mockSalvarDeficiencia).toHaveBeenCalledWith('col-1', { tipo: 'fisica' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['deficiencia', 'col-1'] });
  });
});

describe('usePeriodoExperiencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObterPeriodoExperiencia.mockResolvedValue(null);
  });

  it('calls obterPeriodoExperiencia with colaboradorId', async () => {
    const { result } = renderHook(() => usePeriodoExperiencia('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockObterPeriodoExperiencia).toHaveBeenCalledWith('col-1');
  });

  it('is disabled when no colaboradorId', () => {
    renderHook(() => usePeriodoExperiencia(''), { wrapper });
    expect(mockObterPeriodoExperiencia).not.toHaveBeenCalled();
  });
});

describe('useSalvarPeriodoExperiencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSalvarPeriodoExperiencia.mockResolvedValue({});
  });

  it('calls salvarPeriodoExperiencia and invalidates periodo-experiencia', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useSalvarPeriodoExperiencia(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ colaboradorId: 'col-1', dados: { data_inicio: '2026-01-01' } });
    });

    expect(mockSalvarPeriodoExperiencia).toHaveBeenCalledWith('col-1', { data_inicio: '2026-01-01' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['periodo-experiencia', 'col-1'] });
  });
});

describe('useAnotacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarAnotacoes.mockResolvedValue([]);
  });

  it('calls listarAnotacoes with colaboradorId', async () => {
    const { result } = renderHook(() => useAnotacoes('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarAnotacoes).toHaveBeenCalledWith('col-1');
  });

  it('is disabled when no colaboradorId', () => {
    renderHook(() => useAnotacoes(''), { wrapper });
    expect(mockListarAnotacoes).not.toHaveBeenCalled();
  });
});

describe('useCriarAnotacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarAnotacao.mockResolvedValue({ id: 'an1' });
  });

  it('calls criarAnotacao and invalidates anotacoes do colaborador', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCriarAnotacao(), { wrapper: w });
    const payload = { colaborador_id: 'col-1', titulo: 'Observação' };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(mockCriarAnotacao.mock.calls[0][0]).toEqual(payload);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['anotacoes', 'col-1'] });
  });
});

describe('useExcluirAnotacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExcluirAnotacao.mockResolvedValue(undefined);
  });

  it('calls excluirAnotacao with colaboradorId and id', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useExcluirAnotacao('col-1'), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync('an1');
    });

    expect(mockExcluirAnotacao).toHaveBeenCalledWith('col-1', 'an1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['anotacoes', 'col-1'] });
  });
});

describe('usePeriodosAquisitivos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarPeriodosAquisitivos.mockResolvedValue([]);
  });

  it('calls listarPeriodosAquisitivos with colaboradorId and empresaId', async () => {
    const { result } = renderHook(() => usePeriodosAquisitivos('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarPeriodosAquisitivos).toHaveBeenCalledWith('col-1', '00000000-0000-0000-0000-0000000000e1');
  });

  it('is disabled when no colaboradorId', () => {
    renderHook(() => usePeriodosAquisitivos(''), { wrapper });
    expect(mockListarPeriodosAquisitivos).not.toHaveBeenCalled();
  });
});

const referenciaQueries = [
  ['useEtnias', useEtnias, mockListarEtnias],
  ['useIdentidadesGenero', useIdentidadesGenero, mockListarIdentidadesGenero],
  ['useTiposAdmissao', useTiposAdmissao, mockListarTiposAdmissao],
  ['useTiposEstabilidade', useTiposEstabilidade, mockListarTiposEstabilidade],
] as const;

for (const [nome, useHook, mock] of referenciaQueries) {
  describe(nome, () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mock.mockResolvedValue([{ id: 'ref-1' }]);
    });

    it('fetches reference data via service', async () => {
      const { result } = renderHook(() => useHook(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mock).toHaveBeenCalled();
      expect(result.current.data).toEqual([{ id: 'ref-1' }]);
    });
  });
}

describe('useTimes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarTimes.mockResolvedValue([]);
  });

  it('calls listarTimes with empresaId', async () => {
    const { result } = renderHook(() => useTimes('emp-9'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarTimes).toHaveBeenCalledWith('emp-9');
  });

  it('is disabled when no empresaId', () => {
    renderHook(() => useTimes(undefined), { wrapper });
    expect(mockListarTimes).not.toHaveBeenCalled();
  });
});

describe('useWebhooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarWebhooks.mockResolvedValue([]);
  });

  it('calls listarWebhooks with empresaId', async () => {
    const { result } = renderHook(() => useWebhooks('emp-9'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarWebhooks).toHaveBeenCalledWith('emp-9');
  });

  it('is disabled when no empresaId', () => {
    renderHook(() => useWebhooks(undefined), { wrapper });
    expect(mockListarWebhooks).not.toHaveBeenCalled();
  });
});

describe('useCriarWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarWebhook.mockResolvedValue({ id: 'w1' });
  });

  it('calls criarWebhook and invalidates webhooks', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCriarWebhook(), { wrapper: w });
    const payload = { url: 'https://example.com/hook' };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(mockCriarWebhook.mock.calls[0][0]).toEqual(payload);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['webhooks'] });
  });
});

describe('useFeriasColetivas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarFeriasColetivas.mockResolvedValue([]);
  });

  it('calls listarFeriasColetivas with empresaId', async () => {
    const { result } = renderHook(() => useFeriasColetivas('emp-9'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarFeriasColetivas).toHaveBeenCalledWith('emp-9');
  });

  it('is disabled when no empresaId', () => {
    renderHook(() => useFeriasColetivas(''), { wrapper });
    expect(mockListarFeriasColetivas).not.toHaveBeenCalled();
  });
});

describe('useCriarFeriasColetivas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarFeriasColetivas.mockResolvedValue({ id: 'fc1' });
  });

  it('calls criarFeriasColetivas and invalidates ferias-coletivas', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCriarFeriasColetivas(), { wrapper: w });
    const payload = { empresa_id: 'emp-1', data_inicio: '2026-12-20', data_fim: '2027-01-05', dias: 16 };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(mockCriarFeriasColetivas.mock.calls[0][0]).toEqual(payload);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ferias-coletivas'] });
  });
});

describe('useCamposCustomizados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarCamposCustomizados.mockResolvedValue([]);
  });

  it('calls listarCamposCustomizados with empresaId', async () => {
    const { result } = renderHook(() => useCamposCustomizados('emp-9'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarCamposCustomizados).toHaveBeenCalledWith('emp-9');
  });

  it('is disabled when no empresaId', () => {
    renderHook(() => useCamposCustomizados(undefined), { wrapper });
    expect(mockListarCamposCustomizados).not.toHaveBeenCalled();
  });
});
