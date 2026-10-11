import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { wrapper, createWrapper } from '@/test/queryWrapper';
import { PCS_FATORES_PADRAO } from '@/types/pcs';

const {
  listarPlanos,
  criarPlano,
  criarFatores,
  atualizarPlano,
  listarFatores,
  excluirFator,
  listarAvaliacoes,
  salvarAvaliacao,
  listarGrades,
  gradesMercado,
  gerarGrades,
  enquadramento,
  simularImpacto,
  listarPesquisas,
  criarPesquisa,
  excluirPesquisa,
  toastSuccess,
  toastError,
} = vi.hoisted(() => ({
  listarPlanos: vi.fn(),
  criarPlano: vi.fn(),
  criarFatores: vi.fn(),
  atualizarPlano: vi.fn(),
  listarFatores: vi.fn(),
  excluirFator: vi.fn(),
  listarAvaliacoes: vi.fn(),
  salvarAvaliacao: vi.fn(),
  listarGrades: vi.fn(),
  gradesMercado: vi.fn(),
  gerarGrades: vi.fn(),
  enquadramento: vi.fn(),
  simularImpacto: vi.fn(),
  listarPesquisas: vi.fn(),
  criarPesquisa: vi.fn(),
  excluirPesquisa: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/services/pcsService', () => ({
  pcsService: {
    listarPlanos,
    criarPlano,
    criarFatores,
    atualizarPlano,
    listarFatores,
    excluirFator,
    listarAvaliacoes,
    salvarAvaliacao,
    listarGrades,
    gradesMercado,
    gerarGrades,
    enquadramento,
    simularImpacto,
    listarPesquisas,
    criarPesquisa,
    excluirPesquisa,
  },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }));

import {
  usePcsPlanos,
  usePcsFatores,
  usePcsAvaliacoes,
  usePcsGrades,
  usePcsEquidade,
  usePcsBenchmark,
} from '../usePcs';

beforeEach(() => vi.clearAllMocks());

describe('usePcsPlanos', () => {
  it('lista planos da empresa atual', async () => {
    listarPlanos.mockResolvedValue([{ id: 'p1' }]);
    const { result } = renderHook(() => usePcsPlanos(), { wrapper });
    await waitFor(() => expect(result.current.planos).toEqual([{ id: 'p1' }]));
    expect(listarPlanos).toHaveBeenCalledWith('emp-1');
  });

  it('criar semeia os fatores da metodologia padrão no plano novo', async () => {
    criarPlano.mockResolvedValue({ id: 'plano-9' });
    criarFatores.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePcsPlanos(), { wrapper });
    await act(() =>
      result.current.criar.mutateAsync({ nome: 'PCS 2026', amplitude_pct: 30, overlap_pct: 20, num_steps: 5 })
    );
    expect(criarPlano).toHaveBeenCalledWith(
      expect.objectContaining({ empresa_id: 'emp-1', nome: 'PCS 2026', created_by: 'user-1' })
    );
    const fatores = criarFatores.mock.calls[0][0] as {
      plano_id: string;
      nome: string;
      ordem: number;
      graus: unknown;
    }[];
    expect(fatores).toHaveLength(PCS_FATORES_PADRAO.length);
    expect(fatores.every((f) => f.plano_id === 'plano-9')).toBe(true);
    expect(fatores.map((f) => f.ordem)).toEqual(PCS_FATORES_PADRAO.map((_, i) => i));
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('atualizar delega ao service e toasta sucesso', async () => {
    listarPlanos.mockResolvedValue([]);
    atualizarPlano.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePcsPlanos(), { wrapper });
    await act(() => result.current.atualizar.mutateAsync({ id: 'p1', patch: { nome: 'Novo' } }));
    expect(atualizarPlano).toHaveBeenCalledWith('p1', { nome: 'Novo' });
    expect(toastSuccess).toHaveBeenCalledWith('Plano atualizado');
  });

  it('onError usa a mensagem do Error e toasta', async () => {
    listarPlanos.mockResolvedValue([]);
    atualizarPlano.mockRejectedValue(new Error('falhou feio'));
    const { result } = renderHook(() => usePcsPlanos(), { wrapper });
    await expect(act(() => result.current.atualizar.mutateAsync({ id: 'p1', patch: {} }))).rejects.toThrow();
    expect(toastError).toHaveBeenCalledWith('falhou feio');
  });
});

describe('usePcsFatores', () => {
  it('não busca sem planoId', () => {
    renderHook(() => usePcsFatores(null), { wrapper });
    expect(listarFatores).not.toHaveBeenCalled();
  });

  it('excluir invalida fatores E avaliações do plano', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    listarFatores.mockResolvedValue([]);
    excluirFator.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePcsFatores('pl-1'), { wrapper: w });
    await act(() => result.current.excluir.mutateAsync('fat-1'));
    const keys = invalidateSpy.mock.calls.map((c) => (c[0] as { queryKey: string[] }).queryKey);
    expect(keys).toContainEqual(['pcs', 'fatores', 'pl-1']);
    expect(keys).toContainEqual(['pcs', 'avaliacoes', 'pl-1']);
  });
});

describe('usePcsAvaliacoes', () => {
  it('salvar envia avaliadoPor = user.id', async () => {
    listarAvaliacoes.mockResolvedValue([]);
    salvarAvaliacao.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePcsAvaliacoes('pl-1'), { wrapper });
    await act(() => result.current.salvar.mutateAsync({ cargoId: 'cargo-1', pontuacoes: { f1: 3 } }));
    expect(salvarAvaliacao).toHaveBeenCalledWith(
      expect.objectContaining({ planoId: 'pl-1', cargoId: 'cargo-1', avaliadoPor: 'user-1' })
    );
  });
});

describe('usePcsGrades', () => {
  it('gerar invalida as 4 visões derivadas do plano', async () => {
    const { wrapper: w, invalidateSpy } = createWrapper();
    listarGrades.mockResolvedValue([]);
    gradesMercado.mockResolvedValue([]);
    gerarGrades.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePcsGrades('pl-1'), { wrapper: w });
    await act(() => result.current.gerar.mutateAsync({ numGrades: 8, salarioBase: 5000 }));
    expect(gerarGrades).toHaveBeenCalledWith('pl-1', 8, 5000);
    const keys = invalidateSpy.mock.calls.map((c) => (c[0] as { queryKey: string[] }).queryKey);
    for (const k of ['grades', 'grades-mercado', 'enquadramento', 'impacto']) {
      expect(keys).toContainEqual(['pcs', k, 'pl-1']);
    }
  });
});

describe('usePcsEquidade', () => {
  it('busca enquadramento e simula impacto com o pct de encargos', async () => {
    enquadramento.mockResolvedValue([{ cargo: 'Analista' }]);
    simularImpacto.mockResolvedValue({ total: 1000 });
    const { result } = renderHook(() => usePcsEquidade('pl-1', 80), { wrapper });
    await waitFor(() => expect(result.current.linhas).toEqual([{ cargo: 'Analista' }]));
    expect(simularImpacto).toHaveBeenCalledWith('pl-1', 80);
  });
});

describe('usePcsBenchmark', () => {
  it('criar injeta empresa_id no payload', async () => {
    listarPesquisas.mockResolvedValue([]);
    criarPesquisa.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePcsBenchmark(), { wrapper });
    await act(() =>
      result.current.criar.mutateAsync({
        cargo_referencia: 'Dev',
        p50: 9000,
        fonte: 'Glassdoor',
        data_referencia: '2026-10-01',
      })
    );
    expect(criarPesquisa).toHaveBeenCalledWith(
      expect.objectContaining({ empresa_id: 'emp-1', cargo_referencia: 'Dev' })
    );
  });

  it('excluir passa o empresaId para o tenant filter', async () => {
    listarPesquisas.mockResolvedValue([]);
    excluirPesquisa.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePcsBenchmark(), { wrapper });
    await act(() => result.current.excluir.mutateAsync('pesq-1'));
    expect(excluirPesquisa).toHaveBeenCalledWith('pesq-1', 'emp-1');
  });
});
