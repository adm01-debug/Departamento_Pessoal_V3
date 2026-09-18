import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  mockListarDependentes, mockCriarDependente, mockAtualizarDependente, mockExcluirDependente,
  mockListarContatosEmergencia, mockCriarContatoEmergencia, mockAtualizarContatoEmergencia, mockExcluirContatoEmergencia,
  mockObterValoresCamposCustomizados, mockSalvarValorCampoCustomizado,
  mockListarFeriasColaborador, mockListarLotacoes, mockListarHoleritesColaborador,
} = vi.hoisted(() => ({
  mockListarDependentes: vi.fn(),
  mockCriarDependente: vi.fn(),
  mockAtualizarDependente: vi.fn(),
  mockExcluirDependente: vi.fn(),
  mockListarContatosEmergencia: vi.fn(),
  mockCriarContatoEmergencia: vi.fn(),
  mockAtualizarContatoEmergencia: vi.fn(),
  mockExcluirContatoEmergencia: vi.fn(),
  mockObterValoresCamposCustomizados: vi.fn(),
  mockSalvarValorCampoCustomizado: vi.fn(),
  mockListarFeriasColaborador: vi.fn(),
  mockListarLotacoes: vi.fn(),
  mockListarHoleritesColaborador: vi.fn(),
}));

vi.mock('@/services/colaboradorDetalhesService', () => ({
  listarDependentes: mockListarDependentes,
  criarDependente: mockCriarDependente,
  atualizarDependente: mockAtualizarDependente,
  excluirDependente: mockExcluirDependente,
  listarContatosEmergencia: mockListarContatosEmergencia,
  criarContatoEmergencia: mockCriarContatoEmergencia,
  atualizarContatoEmergencia: mockAtualizarContatoEmergencia,
  excluirContatoEmergencia: mockExcluirContatoEmergencia,
  obterValoresCamposCustomizados: mockObterValoresCamposCustomizados,
  salvarValorCampoCustomizado: mockSalvarValorCampoCustomizado,
  listarFeriasColaborador: mockListarFeriasColaborador,
  listarLotacoes: mockListarLotacoes,
  listarHoleritesColaborador: mockListarHoleritesColaborador,
}));

import {
  useDependentes,
  useCriarDependente,
  useContatosEmergencia,
  useCriarContatoEmergencia,
  useAtualizarContatoEmergencia,
  useValoresCamposCustomizados,
  useSalvarValorCampoCustomizado,
  useFeriasResumoColaborador,
  useLotacoes,
  useHoleritesColaborador,
} from '../useColaboradorDetalhes';

vi.mock('@/hooks/useEmpresas', async () =>
  (await import('@/test/empresaMock')).useEmpresasMockModule()
);


function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

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
      await result.current.mutateAsync({ colaborador_id: 'col-1', nome: 'Filho' });
    });

    expect(mockCriarDependente.mock.calls[0][0]).toEqual({ colaborador_id: 'col-1', nome: 'Filho' });
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

describe('useAtualizarContatoEmergencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAtualizarContatoEmergencia.mockResolvedValue(undefined);
  });

  it('calls atualizarContatoEmergencia scoped by colaboradorId', async () => {
    const { result } = renderHook(() => useAtualizarContatoEmergencia('col-1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'c1', dados: { nome: 'Mãe Atualizada' } });
    });

    expect(mockAtualizarContatoEmergencia).toHaveBeenCalledWith('c1', { nome: 'Mãe Atualizada' }, 'col-1');
  });
});

describe('useValoresCamposCustomizados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObterValoresCamposCustomizados.mockResolvedValue([]);
  });

  it('calls obterValoresCamposCustomizados with colaboradorId', async () => {
    const { result } = renderHook(() => useValoresCamposCustomizados('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockObterValoresCamposCustomizados).toHaveBeenCalledWith('col-1');
  });

  it('is disabled when colaboradorId is empty', async () => {
    const { result } = renderHook(() => useValoresCamposCustomizados(''), { wrapper });
    await waitFor(() => !result.current.isLoading);
    expect(mockObterValoresCamposCustomizados).not.toHaveBeenCalled();
  });
});

describe('useSalvarValorCampoCustomizado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSalvarValorCampoCustomizado.mockResolvedValue({ id: 'v1' });
  });

  it('calls salvarValorCampoCustomizado scoped by colaboradorId', async () => {
    const { result } = renderHook(() => useSalvarValorCampoCustomizado('col-1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ campoId: 'cc1', valor: 'ABC-123' });
    });

    expect(mockSalvarValorCampoCustomizado).toHaveBeenCalledWith('cc1', 'col-1', 'ABC-123');
  });
});

describe('useFeriasResumoColaborador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarFeriasColaborador.mockResolvedValue([]);
  });

  it('calls listarFeriasColaborador with colaboradorId and empresaId', async () => {
    const { result } = renderHook(() => useFeriasResumoColaborador('col-1', 'emp-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarFeriasColaborador).toHaveBeenCalledWith('col-1', 'emp-1');
  });

  it('is disabled when empresaId is missing', () => {
    renderHook(() => useFeriasResumoColaborador('col-1', undefined), { wrapper });
    expect(mockListarFeriasColaborador).not.toHaveBeenCalled();
  });
});

describe('useLotacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarLotacoes.mockResolvedValue([]);
  });

  it('calls listarLotacoes with colaboradorId and empresaId', async () => {
    const { result } = renderHook(() => useLotacoes('col-1', 'emp-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarLotacoes).toHaveBeenCalledWith('col-1', 'emp-1');
  });

  it('is disabled when empresaId is missing', () => {
    renderHook(() => useLotacoes('col-1', undefined), { wrapper });
    expect(mockListarLotacoes).not.toHaveBeenCalled();
  });
});

describe('useHoleritesColaborador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarHoleritesColaborador.mockResolvedValue([]);
  });

  it('calls listarHoleritesColaborador with colaboradorId', async () => {
    const { result } = renderHook(() => useHoleritesColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarHoleritesColaborador).toHaveBeenCalledWith('col-1');
  });

  it('is disabled when no colaboradorId', () => {
    renderHook(() => useHoleritesColaborador(''), { wrapper });
    expect(mockListarHoleritesColaborador).not.toHaveBeenCalled();
  });
});
