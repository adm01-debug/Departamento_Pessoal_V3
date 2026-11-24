import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  mockListSolicitacoes, mockCriar, mockAtualizar, mockExcluir,
  mockAprovarGestor, mockAprovarRH,
  mockToastSuccess, mockToastError,
} = vi.hoisted(() => ({
  mockListSolicitacoes: vi.fn(),
  mockCriar: vi.fn(),
  mockAtualizar: vi.fn(),
  mockExcluir: vi.fn(),
  mockAprovarGestor: vi.fn(),
  mockAprovarRH: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/services', () => ({
  feriasService: {
    listSolicitacoes: mockListSolicitacoes,
    criar: mockCriar,
    atualizar: mockAtualizar,
    excluir: mockExcluir,
    aprovarGestor: mockAprovarGestor,
    aprovarRH: mockAprovarRH,
  },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/utils/auditLogger', () => ({
  auditLogger: { log: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

import { useFerias } from '../useFerias';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useFerias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListSolicitacoes.mockResolvedValue({ data: [], count: 0 });
  });

  it('returns empty ferias and zero count initially', async () => {
    const { result } = renderHook(() => useFerias(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.ferias).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it('calls listSolicitacoes with empresaId', async () => {
    const { result } = renderHook(() => useFerias(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListSolicitacoes).toHaveBeenCalledWith('emp-1', undefined);
  });

  it('returns ferias data from service', async () => {
    mockListSolicitacoes.mockResolvedValue({ data: [{ id: 'f1', status: 'pendente' }], count: 1 });
    const { result } = renderHook(() => useFerias(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.ferias).toEqual([{ id: 'f1', status: 'pendente' }]);
    expect(result.current.totalCount).toBe(1);
  });

  it('create injects empresa_id into payload', async () => {
    mockCriar.mockResolvedValue({ id: 'f1' });
    const { result } = renderHook(() => useFerias(), { wrapper });

    await act(async () => {
      await result.current.create({ colaborador_id: 'col-1' });
    });

    expect(mockCriar).toHaveBeenCalledWith(
      expect.objectContaining({ colaborador_id: 'col-1', empresa_id: 'emp-1' })
    );
  });

  it('create shows success toast', async () => {
    mockCriar.mockResolvedValue({ id: 'f1' });
    const { result } = renderHook(() => useFerias(), { wrapper });

    await act(async () => { await result.current.create({}); });

    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith('Solicitação de férias criada com sucesso')
    );
  });

  it('update calls feriasService.atualizar with id and data', async () => {
    mockAtualizar.mockResolvedValue({ id: 'f1' });
    const { result } = renderHook(() => useFerias(), { wrapper });

    await act(async () => {
      await result.current.update({ id: 'f1', data: { status: 'aprovada' } });
    });

    expect(mockAtualizar).toHaveBeenCalledWith('f1', { status: 'aprovada' });
    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith('Solicitação de férias atualizada')
    );
  });

  it('remove calls feriasService.excluir with id', async () => {
    mockExcluir.mockResolvedValue(undefined);
    const { result } = renderHook(() => useFerias(), { wrapper });

    await act(async () => { await result.current.remove('f1'); });

    expect(mockExcluir).toHaveBeenCalledWith('f1');
    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith('Solicitação de férias excluída')
    );
  });

  it('shows error toast when create fails', async () => {
    mockCriar.mockRejectedValue(new Error('server error'));
    const { result } = renderHook(() => useFerias(), { wrapper });

    await act(async () => { await result.current.create({}).catch(() => {}); });

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('server error'))
    );
  });
});
