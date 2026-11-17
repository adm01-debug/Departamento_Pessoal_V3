import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockFrom, mockGetUser, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUser: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    auth: { getUser: mockGetUser },
  },
}));

vi.mock('crypto-js', () => ({
  default: { SHA256: vi.fn().mockReturnValue({ toString: () => 'sha256mock' }) },
}));

vi.mock('@/services/notificacoesService', () => ({
  notificarAjustePonto: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('sonner', () => ({ toast: { success: mockToastSuccess, error: mockToastError } }));

import { usePontoMelhorado } from '../usePontoMelhorado';

function buildChain(data: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: data[0] || null, error: null });
  chain.then = (fn: (v?: unknown) => unknown) => Promise.resolve({ data, error: null }).then(fn);
  chain.catch = (fn: (v?: unknown) => unknown) => Promise.resolve({ data, error: null }).catch(fn);
  chain.finally = (fn: (v?: unknown) => unknown) => Promise.resolve({ data, error: null }).finally(fn);
  return chain;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('usePontoMelhorado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => buildChain([]));
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('returns empty solicitacoes and isLoading false', async () => {
    const { result } = renderHook(() => usePontoMelhorado('emp-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.solicitacoes).toEqual([]);
  });

  it('queries solicitacoes_ajuste_ponto with empresaId', async () => {
    const { result } = renderHook(() => usePontoMelhorado('emp-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('solicitacoes_ajuste_ponto');
  });

  it('filters by colaboradorId when provided', async () => {
    const chain = buildChain([]);
    mockFrom.mockReturnValue(chain);
    const { result } = renderHook(() => usePontoMelhorado('emp-1', 'col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
  });

  // Guardas de tenant resgatadas da branch `muri`. Sem empresa selecionada a
  // main montava a clausula como `empresa_id=eq.undefined` (por causa do
  // `empresaId!`) e o usuario via erro de uuid invalido vindo do banco.
  it('sem empresaId a consulta NAO sai e a lista vem vazia', async () => {
    const { result } = renderHook(() => usePontoMelhorado(undefined), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.solicitacoes).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalledWith('solicitacoes_ajuste_ponto');
  });

  it('sem empresaId responderSolicitacao falha explicitamente, sem tocar no banco', async () => {
    const { result } = renderHook(() => usePontoMelhorado(undefined), { wrapper });
    await expect(
      result.current.responderSolicitacao.mutateAsync({ id: 's1', status: 'aprovado' })
    ).rejects.toThrow(/empresa_id obrigatório/);
    expect(mockFrom).not.toHaveBeenCalledWith('solicitacoes_ajuste_ponto');
  });

  it('exposes criarSolicitacao and responderSolicitacao mutations', () => {
    const { result } = renderHook(() => usePontoMelhorado('emp-1'), { wrapper });
    expect(typeof result.current.criarSolicitacao.mutate).toBe('function');
    expect(typeof result.current.responderSolicitacao.mutate).toBe('function');
  });

  it('criarSolicitacao calls insert on solicitacoes_ajuste_ponto', async () => {
    const chain = buildChain([{ id: 's1' }]);
    mockFrom.mockReturnValue(chain);
    const { result } = renderHook(() => usePontoMelhorado('emp-1'), { wrapper });

    await act(async () => {
      await result.current.criarSolicitacao.mutateAsync({
        colaborador_id: 'col-1',
        empresa_id: 'emp-1',
        data_ponto: '2024-01-15',
        hora_original: '08:00',
        hora_sugerida: '08:05',
        tipo_ponto: 'entrada',
        motivo: 'Atraso justificado',
      });
    });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        colaborador_id: 'col-1',
        tipo_ponto: 'entrada',
      })
    );
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Solicitação de ajuste enviada com sucesso.'));
  });
});
