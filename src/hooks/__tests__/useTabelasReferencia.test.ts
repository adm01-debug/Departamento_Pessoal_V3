import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  mockListarNacionalidades, mockListarTiposDesligamento, mockListarTiposAvisoPrevio,
  mockListarCentrosCusto, mockCriarCentroCusto,
  mockListarContasBancarias, mockCriarContaBancaria,
} = vi.hoisted(() => ({
  mockListarNacionalidades: vi.fn(),
  mockListarTiposDesligamento: vi.fn(),
  mockListarTiposAvisoPrevio: vi.fn(),
  mockListarCentrosCusto: vi.fn(),
  mockCriarCentroCusto: vi.fn(),
  mockListarContasBancarias: vi.fn(),
  mockCriarContaBancaria: vi.fn(),
}));

vi.mock('@/services/tabelasReferenciaService', () => ({
  listarNacionalidades: mockListarNacionalidades,
  listarTiposDesligamento: mockListarTiposDesligamento,
  listarTiposAvisoPrevio: mockListarTiposAvisoPrevio,
  listarTiposDeficiencia: vi.fn().mockResolvedValue([]),
  listarTiposPagamento: vi.fn().mockResolvedValue([]),
  listarTiposSalario: vi.fn().mockResolvedValue([]),
  listarRelacionamentosDependentes: vi.fn().mockResolvedValue([]),
  listarGenerosDocumento: vi.fn().mockResolvedValue([]),
  listarTiposVisto: vi.fn().mockResolvedValue([]),
  listarCondicoesIngresso: vi.fn().mockResolvedValue([]),
  listarTemposResidencia: vi.fn().mockResolvedValue([]),
  listarDescricoesLogradouro: vi.fn().mockResolvedValue([]),
  listarPaises: vi.fn().mockResolvedValue([]),
  listarCategoriasTrabalhador: vi.fn().mockResolvedValue([]),
  listarRelacionamentosContatoEmergencia: vi.fn().mockResolvedValue([]),
  listarMotivosAfastamento: vi.fn().mockResolvedValue([]),
  listarCentrosCusto: mockListarCentrosCusto,
  criarCentroCusto: mockCriarCentroCusto,
  atualizarCentroCusto: vi.fn().mockResolvedValue({}),
  excluirCentroCusto: vi.fn().mockResolvedValue(undefined),
  listarContasBancarias: mockListarContasBancarias,
  criarContaBancaria: mockCriarContaBancaria,
  atualizarContaBancaria: vi.fn().mockResolvedValue({}),
  excluirContaBancaria: vi.fn().mockResolvedValue(undefined),
  salvarDadosEstagiario: vi.fn().mockResolvedValue({}),
  obterDadosEstagiario: vi.fn().mockResolvedValue(null),
  listarDocumentosPessoais: vi.fn().mockResolvedValue([]),
  criarDocumentoPessoal: vi.fn().mockResolvedValue({}),
  excluirDocumentoPessoal: vi.fn().mockResolvedValue(undefined),
  listarFeriasAprovacoes: vi.fn().mockResolvedValue([]),
  criarFeriasAprovacao: vi.fn().mockResolvedValue({}),
}));

import {
  useNacionalidades,
  useTiposDesligamento,
  useCentrosCusto,
  useCriarCentroCusto,
  useContasBancarias,
} from '../useTabelasReferencia';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useNacionalidades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarNacionalidades.mockResolvedValue([{ id: 'n1', nome: 'Brasileiro' }]);
  });

  it('calls listarNacionalidades', async () => {
    const { result } = renderHook(() => useNacionalidades(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarNacionalidades).toHaveBeenCalled();
    expect(result.current.data).toHaveLength(1);
  });
});

describe('useTiposDesligamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarTiposDesligamento.mockResolvedValue([{ id: 'td1', nome: 'Pedido de demissão' }]);
  });

  it('calls listarTiposDesligamento and returns data', async () => {
    const { result } = renderHook(() => useTiposDesligamento(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
  });
});

describe('useCentrosCusto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarCentrosCusto.mockResolvedValue([]);
  });

  it('is disabled when no empresaId', () => {
    const { result } = renderHook(() => useCentrosCusto(undefined), { wrapper });
    expect(mockListarCentrosCusto).not.toHaveBeenCalled();
  });

  it('calls listarCentrosCusto with empresaId', async () => {
    const { result } = renderHook(() => useCentrosCusto('emp-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarCentrosCusto).toHaveBeenCalledWith('emp-1');
  });
});

describe('useCriarCentroCusto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarCentroCusto.mockResolvedValue({ id: 'cc1' });
  });

  it('calls criarCentroCusto with data', async () => {
    const { result } = renderHook(() => useCriarCentroCusto(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ nome: 'TI', empresa_id: 'emp-1' });
    });

    expect(mockCriarCentroCusto.mock.calls[0][0]).toMatchObject({ nome: 'TI', empresa_id: 'emp-1' });
  });
});

describe('useContasBancarias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarContasBancarias.mockResolvedValue([]);
  });

  it('is disabled when no colaboradorId', () => {
    const { result } = renderHook(() => useContasBancarias(''), { wrapper });
    expect(mockListarContasBancarias).not.toHaveBeenCalled();
  });

  it('calls listarContasBancarias with colaboradorId', async () => {
    const { result } = renderHook(() => useContasBancarias('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarContasBancarias).toHaveBeenCalledWith('col-1');
  });
});
