import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useEmpresas', async () => (await import('@/test/empresaMock')).useEmpresasMockModule());

const {
  mockListarNacionalidades,
  mockListarTiposDesligamento,
  mockListarTiposAvisoPrevio,
  mockListarTiposDeficiencia,
  mockListarTiposPagamento,
  mockListarTiposSalario,
  mockListarRelacionamentosDependentes,
  mockListarGenerosDocumento,
  mockListarTiposVisto,
  mockListarCondicoesIngresso,
  mockListarTemposResidencia,
  mockListarDescricoesLogradouro,
  mockListarPaises,
  mockListarCategoriasTrabalhador,
  mockListarRelacionamentosContatoEmergencia,
  mockListarMotivosAfastamento,
  mockListarCentrosCusto,
  mockCriarCentroCusto,
  mockAtualizarCentroCusto,
  mockExcluirCentroCusto,
  mockListarContasBancarias,
  mockCriarContaBancaria,
  mockAtualizarContaBancaria,
  mockExcluirContaBancaria,
  mockObterDadosEstagiario,
  mockSalvarDadosEstagiario,
  mockListarDocumentosPessoais,
  mockCriarDocumentoPessoal,
  mockExcluirDocumentoPessoal,
  mockListarFeriasAprovacoes,
  mockCriarFeriasAprovacao,
  mockAtualizarFeriasAprovacao,
  mockListarFeriasArquivos,
  mockCriarFeriasArquivo,
  mockListarDependentesBeneficios,
  mockVincularDependenteBeneficio,
  mockDesvincularDependenteBeneficio,
} = vi.hoisted(() => ({
  mockListarNacionalidades: vi.fn(),
  mockListarTiposDesligamento: vi.fn(),
  mockListarTiposAvisoPrevio: vi.fn(),
  mockListarTiposDeficiencia: vi.fn(),
  mockListarTiposPagamento: vi.fn(),
  mockListarTiposSalario: vi.fn(),
  mockListarRelacionamentosDependentes: vi.fn(),
  mockListarGenerosDocumento: vi.fn(),
  mockListarTiposVisto: vi.fn(),
  mockListarCondicoesIngresso: vi.fn(),
  mockListarTemposResidencia: vi.fn(),
  mockListarDescricoesLogradouro: vi.fn(),
  mockListarPaises: vi.fn(),
  mockListarCategoriasTrabalhador: vi.fn(),
  mockListarRelacionamentosContatoEmergencia: vi.fn(),
  mockListarMotivosAfastamento: vi.fn(),
  mockListarCentrosCusto: vi.fn(),
  mockCriarCentroCusto: vi.fn(),
  mockAtualizarCentroCusto: vi.fn(),
  mockExcluirCentroCusto: vi.fn(),
  mockListarContasBancarias: vi.fn(),
  mockCriarContaBancaria: vi.fn(),
  mockAtualizarContaBancaria: vi.fn(),
  mockExcluirContaBancaria: vi.fn(),
  mockObterDadosEstagiario: vi.fn(),
  mockSalvarDadosEstagiario: vi.fn(),
  mockListarDocumentosPessoais: vi.fn(),
  mockCriarDocumentoPessoal: vi.fn(),
  mockExcluirDocumentoPessoal: vi.fn(),
  mockListarFeriasAprovacoes: vi.fn(),
  mockCriarFeriasAprovacao: vi.fn(),
  mockAtualizarFeriasAprovacao: vi.fn(),
  mockListarFeriasArquivos: vi.fn(),
  mockCriarFeriasArquivo: vi.fn(),
  mockListarDependentesBeneficios: vi.fn(),
  mockVincularDependenteBeneficio: vi.fn(),
  mockDesvincularDependenteBeneficio: vi.fn(),
}));

vi.mock('@/services/tabelasReferenciaService', () => ({
  listarNacionalidades: mockListarNacionalidades,
  listarTiposDesligamento: mockListarTiposDesligamento,
  listarTiposAvisoPrevio: mockListarTiposAvisoPrevio,
  listarTiposDeficiencia: mockListarTiposDeficiencia,
  listarTiposPagamento: mockListarTiposPagamento,
  listarTiposSalario: mockListarTiposSalario,
  listarRelacionamentosDependentes: mockListarRelacionamentosDependentes,
  listarGenerosDocumento: mockListarGenerosDocumento,
  listarTiposVisto: mockListarTiposVisto,
  listarCondicoesIngresso: mockListarCondicoesIngresso,
  listarTemposResidencia: mockListarTemposResidencia,
  listarDescricoesLogradouro: mockListarDescricoesLogradouro,
  listarPaises: mockListarPaises,
  listarCategoriasTrabalhador: mockListarCategoriasTrabalhador,
  listarRelacionamentosContatoEmergencia: mockListarRelacionamentosContatoEmergencia,
  listarMotivosAfastamento: mockListarMotivosAfastamento,
  listarCentrosCusto: mockListarCentrosCusto,
  criarCentroCusto: mockCriarCentroCusto,
  atualizarCentroCusto: mockAtualizarCentroCusto,
  excluirCentroCusto: mockExcluirCentroCusto,
  listarContasBancarias: mockListarContasBancarias,
  criarContaBancaria: mockCriarContaBancaria,
  atualizarContaBancaria: mockAtualizarContaBancaria,
  excluirContaBancaria: mockExcluirContaBancaria,
  obterDadosEstagiario: mockObterDadosEstagiario,
  salvarDadosEstagiario: mockSalvarDadosEstagiario,
  listarDocumentosPessoais: mockListarDocumentosPessoais,
  criarDocumentoPessoal: mockCriarDocumentoPessoal,
  excluirDocumentoPessoal: mockExcluirDocumentoPessoal,
  listarFeriasAprovacoes: mockListarFeriasAprovacoes,
  criarFeriasAprovacao: mockCriarFeriasAprovacao,
  atualizarFeriasAprovacao: mockAtualizarFeriasAprovacao,
  listarFeriasArquivos: mockListarFeriasArquivos,
  criarFeriasArquivo: mockCriarFeriasArquivo,
  listarDependentesBeneficios: mockListarDependentesBeneficios,
  vincularDependenteBeneficio: mockVincularDependenteBeneficio,
  desvincularDependenteBeneficio: mockDesvincularDependenteBeneficio,
}));

import {
  useNacionalidades,
  useTiposDesligamento,
  useTiposAvisoPrevio,
  useTiposDeficiencia,
  useTiposPagamento,
  useTiposSalario,
  useRelacionamentosDependentes,
  useGenerosDocumento,
  useTiposVisto,
  useCondicoesIngresso,
  useTemposResidencia,
  useDescricoesLogradouro,
  usePaises,
  useCategoriasTrabalhador,
  useRelacionamentosContatoEmergencia,
  useMotivosAfastamento,
  useCentrosCusto,
  useCriarCentroCusto,
  useAtualizarCentroCusto,
  useExcluirCentroCusto,
  useContasBancarias,
  useCriarContaBancaria,
  useAtualizarContaBancaria,
  useExcluirContaBancaria,
  useDadosEstagiario,
  useSalvarDadosEstagiario,
  useDocumentosPessoais,
  useCriarDocumentoPessoal,
  useExcluirDocumentoPessoal,
  useFeriasAprovacoes,
  useCriarFeriasAprovacao,
  useAtualizarFeriasAprovacao,
  useFeriasArquivos,
  useCriarFeriasArquivo,
  useDependentesBeneficios,
  useVincularDependenteBeneficio,
  useDesvincularDependenteBeneficio,
} from '../useTabelasReferencia';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  const queryWrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { wrapper: queryWrapper, invalidateSpy };
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
    expect(mockListarContasBancarias).toHaveBeenCalledWith('col-1', '00000000-0000-0000-0000-0000000000e1');
  });
});

const referenciaReadOnly = [
  ['useTiposAvisoPrevio', useTiposAvisoPrevio, mockListarTiposAvisoPrevio],
  ['useTiposDeficiencia', useTiposDeficiencia, mockListarTiposDeficiencia],
  ['useTiposPagamento', useTiposPagamento, mockListarTiposPagamento],
  ['useTiposSalario', useTiposSalario, mockListarTiposSalario],
  ['useRelacionamentosDependentes', useRelacionamentosDependentes, mockListarRelacionamentosDependentes],
  ['useGenerosDocumento', useGenerosDocumento, mockListarGenerosDocumento],
  ['useTiposVisto', useTiposVisto, mockListarTiposVisto],
  ['useCondicoesIngresso', useCondicoesIngresso, mockListarCondicoesIngresso],
  ['useTemposResidencia', useTemposResidencia, mockListarTemposResidencia],
  ['useDescricoesLogradouro', useDescricoesLogradouro, mockListarDescricoesLogradouro],
  ['usePaises', usePaises, mockListarPaises],
  ['useCategoriasTrabalhador', useCategoriasTrabalhador, mockListarCategoriasTrabalhador],
  [
    'useRelacionamentosContatoEmergencia',
    useRelacionamentosContatoEmergencia,
    mockListarRelacionamentosContatoEmergencia,
  ],
  ['useMotivosAfastamento', useMotivosAfastamento, mockListarMotivosAfastamento],
] as const;

for (const [nome, useHook, mock] of referenciaReadOnly) {
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

describe('useAtualizarCentroCusto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAtualizarCentroCusto.mockResolvedValue(undefined);
  });

  it('calls atualizarCentroCusto with id, dados and empresaId', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useAtualizarCentroCusto(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ id: 'cc-1', dados: { nome: 'RH' } });
    });

    expect(mockAtualizarCentroCusto).toHaveBeenCalledWith(
      'cc-1',
      { nome: 'RH' },
      '00000000-0000-0000-0000-0000000000e1'
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['centros-custo'] });
  });
});

describe('useExcluirCentroCusto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExcluirCentroCusto.mockResolvedValue(undefined);
  });

  it('calls excluirCentroCusto with id and empresaId', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useExcluirCentroCusto(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync('cc-1');
    });

    expect(mockExcluirCentroCusto).toHaveBeenCalledWith('cc-1', '00000000-0000-0000-0000-0000000000e1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['centros-custo'] });
  });
});

describe('useCriarContaBancaria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarContaBancaria.mockResolvedValue({ id: 'cb-1' });
  });

  it('calls criarContaBancaria and invalidates contas do colaborador', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCriarContaBancaria(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ colaborador_id: 'col-1', banco_codigo: '001' });
    });

    expect(mockCriarContaBancaria).toHaveBeenCalledWith(expect.objectContaining({ colaborador_id: 'col-1' }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['contas-bancarias', 'col-1'] });
  });
});

describe('useAtualizarContaBancaria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAtualizarContaBancaria.mockResolvedValue(undefined);
  });

  it('calls atualizarContaBancaria with id, dados and empresaId', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useAtualizarContaBancaria(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ id: 'cb-1', dados: { agencia: '1234' } });
    });

    expect(mockAtualizarContaBancaria).toHaveBeenCalledWith(
      'cb-1',
      { agencia: '1234' },
      '00000000-0000-0000-0000-0000000000e1'
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['contas-bancarias'] });
  });
});

describe('useExcluirContaBancaria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExcluirContaBancaria.mockResolvedValue(undefined);
  });

  it('calls excluirContaBancaria and invalidates contas do colaborador', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useExcluirContaBancaria('col-1'), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync('cb-1');
    });

    expect(mockExcluirContaBancaria).toHaveBeenCalledWith('cb-1', '00000000-0000-0000-0000-0000000000e1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['contas-bancarias', 'col-1'] });
  });
});

describe('useDadosEstagiario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObterDadosEstagiario.mockResolvedValue({ instituicao_nome: 'USP' });
  });

  it('calls obterDadosEstagiario with colaboradorId', async () => {
    const { result } = renderHook(() => useDadosEstagiario('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockObterDadosEstagiario).toHaveBeenCalledWith('col-1');
    expect(result.current.data).toEqual({ instituicao_nome: 'USP' });
  });

  it('is disabled when no colaboradorId', () => {
    renderHook(() => useDadosEstagiario(''), { wrapper });
    expect(mockObterDadosEstagiario).not.toHaveBeenCalled();
  });
});

describe('useSalvarDadosEstagiario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSalvarDadosEstagiario.mockResolvedValue({});
  });

  it('calls salvarDadosEstagiario and invalidates dados-estagiario', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useSalvarDadosEstagiario(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ colaboradorId: 'col-1', dados: { instituicao_nome: 'USP' } });
    });

    expect(mockSalvarDadosEstagiario).toHaveBeenCalledWith('col-1', { instituicao_nome: 'USP' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dados-estagiario', 'col-1'] });
  });
});

describe('useDocumentosPessoais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarDocumentosPessoais.mockResolvedValue([]);
  });

  it('calls listarDocumentosPessoais with colaboradorId', async () => {
    const { result } = renderHook(() => useDocumentosPessoais('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarDocumentosPessoais).toHaveBeenCalledWith('col-1');
  });

  it('is disabled when no colaboradorId', () => {
    renderHook(() => useDocumentosPessoais(''), { wrapper });
    expect(mockListarDocumentosPessoais).not.toHaveBeenCalled();
  });
});

describe('useCriarDocumentoPessoal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarDocumentoPessoal.mockResolvedValue({ id: 'doc-1' });
  });

  it('calls criarDocumentoPessoal and invalidates documentos do colaborador', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCriarDocumentoPessoal(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ colaborador_id: 'col-1', tipo_documento: 'rg' });
    });

    expect(mockCriarDocumentoPessoal).toHaveBeenCalledWith(expect.objectContaining({ tipo_documento: 'rg' }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documentos-pessoais', 'col-1'] });
  });
});

describe('useExcluirDocumentoPessoal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExcluirDocumentoPessoal.mockResolvedValue(undefined);
  });

  it('calls excluirDocumentoPessoal with colaboradorId and id', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useExcluirDocumentoPessoal('col-1'), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync('doc-1');
    });

    expect(mockExcluirDocumentoPessoal).toHaveBeenCalledWith('col-1', 'doc-1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documentos-pessoais', 'col-1'] });
  });
});

describe('useFeriasAprovacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarFeriasAprovacoes.mockResolvedValue([]);
  });

  it('calls listarFeriasAprovacoes with feriasId', async () => {
    const { result } = renderHook(() => useFeriasAprovacoes('fer-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarFeriasAprovacoes).toHaveBeenCalledWith('fer-1');
  });

  it('is disabled when no feriasId', () => {
    renderHook(() => useFeriasAprovacoes(''), { wrapper });
    expect(mockListarFeriasAprovacoes).not.toHaveBeenCalled();
  });
});

describe('useCriarFeriasAprovacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarFeriasAprovacao.mockResolvedValue({ id: 'fa-1' });
  });

  it('calls criarFeriasAprovacao and invalidates aprovacoes da ferias', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCriarFeriasAprovacao(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ ferias_id: 'fer-1', tipo: 'aprovacao' });
    });

    expect(mockCriarFeriasAprovacao).toHaveBeenCalledWith(expect.objectContaining({ ferias_id: 'fer-1' }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ferias-aprovacoes', 'fer-1'] });
  });
});

describe('useAtualizarFeriasAprovacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAtualizarFeriasAprovacao.mockResolvedValue(undefined);
  });

  it('calls atualizarFeriasAprovacao with feriasId, id and dados', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useAtualizarFeriasAprovacao(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ id: 'fa-1', feriasId: 'fer-1', dados: { status: 'aprovado' } });
    });

    expect(mockAtualizarFeriasAprovacao).toHaveBeenCalledWith('fer-1', 'fa-1', { status: 'aprovado' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ferias-aprovacoes'] });
  });
});

describe('useFeriasArquivos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarFeriasArquivos.mockResolvedValue([]);
  });

  it('calls listarFeriasArquivos with feriasId', async () => {
    const { result } = renderHook(() => useFeriasArquivos('fer-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarFeriasArquivos).toHaveBeenCalledWith('fer-1');
  });

  it('is disabled when no feriasId', () => {
    renderHook(() => useFeriasArquivos(''), { wrapper });
    expect(mockListarFeriasArquivos).not.toHaveBeenCalled();
  });
});

describe('useCriarFeriasArquivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCriarFeriasArquivo.mockResolvedValue({ id: 'far-1' });
  });

  it('calls criarFeriasArquivo and invalidates arquivos da ferias', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCriarFeriasArquivo(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ ferias_id: 'fer-1', nome: 'aviso.pdf' });
    });

    expect(mockCriarFeriasArquivo).toHaveBeenCalledWith(expect.objectContaining({ nome: 'aviso.pdf' }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['ferias-arquivos', 'fer-1'] });
  });
});

describe('useDependentesBeneficios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListarDependentesBeneficios.mockResolvedValue([]);
  });

  it('calls listarDependentesBeneficios with dependenteId', async () => {
    const { result } = renderHook(() => useDependentesBeneficios('dep-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListarDependentesBeneficios).toHaveBeenCalledWith('dep-1');
  });

  it('is disabled when no dependenteId', () => {
    renderHook(() => useDependentesBeneficios(''), { wrapper });
    expect(mockListarDependentesBeneficios).not.toHaveBeenCalled();
  });
});

describe('useVincularDependenteBeneficio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVincularDependenteBeneficio.mockResolvedValue({ id: 'v-1' });
  });

  it('calls vincularDependenteBeneficio and invalidates dependentes-beneficios', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useVincularDependenteBeneficio(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ dependente_id: 'dep-1', beneficio_id: 'ben-1' });
    });

    expect(mockVincularDependenteBeneficio).toHaveBeenCalledWith({ dependente_id: 'dep-1', beneficio_id: 'ben-1' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dependentes-beneficios'] });
  });
});

describe('useDesvincularDependenteBeneficio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDesvincularDependenteBeneficio.mockResolvedValue(undefined);
  });

  it('calls desvincularDependenteBeneficio with ids and invalidates', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useDesvincularDependenteBeneficio(), { wrapper: w });

    await act(async () => {
      await result.current.mutateAsync({ dependenteId: 'dep-1', beneficioId: 'ben-1' });
    });

    expect(mockDesvincularDependenteBeneficio).toHaveBeenCalledWith('dep-1', 'ben-1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dependentes-beneficios'] });
  });
});
