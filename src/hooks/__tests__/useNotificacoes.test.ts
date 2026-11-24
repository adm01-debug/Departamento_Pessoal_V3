import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockFrom, mockGetUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    auth: { getUser: mockGetUser },
  },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtualId: 'emp-1' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

import { useNotificacoes } from '../useNotificacoes';

function buildSelectChain(data: any[] = []) {
  const response = { data, error: null };
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.lt = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  chain.then = (fn: any) => Promise.resolve(response).then(fn);
  chain.catch = (fn: any) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: any) => Promise.resolve(response).finally(fn);
  mockFrom.mockReturnValue(chain);
  return chain;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false }, mutations: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useNotificacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildSelectChain([]);
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('returns empty notificacoes initially', async () => {
    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notificacoes).toEqual([]);
  });

  it('naoLidas count is 0 when all notificacoes are read', async () => {
    buildSelectChain([
      { id: 'n1', lida: true, tipo: 'ferias_vencendo' },
      { id: 'n2', lida: true, tipo: 'contrato_vencendo' },
    ]);
    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.naoLidas).toBe(0);
  });

  it('naoLidas counts unread notificacoes', async () => {
    buildSelectChain([
      { id: 'n1', lida: false, tipo: 'ferias_vencendo' },
      { id: 'n2', lida: true, tipo: 'contrato_vencendo' },
    ]);
    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.naoLidas).toBe(1);
  });

  it('porTipo counts unread by type', async () => {
    buildSelectChain([
      { id: 'n1', lida: false, tipo: 'ferias_vencendo' },
      { id: 'n2', lida: false, tipo: 'contrato_vencendo' },
      { id: 'n3', lida: true, tipo: 'ferias_vencendo' },
    ]);
    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.porTipo.ferias_vencendo).toBe(1);
    expect(result.current.porTipo.contrato_vencendo).toBe(1);
  });

  it('queries notificacoes table with empresa_id', async () => {
    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('notificacoes');
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });

  it('criarNotificacao calls supabase insert', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation(() => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        insert: insertFn,
        then: (fn: any) => Promise.resolve({ data: [], error: null }).then(fn),
        catch: (fn: any) => Promise.resolve({ data: [], error: null }).catch(fn),
        finally: (fn: any) => Promise.resolve({ data: [], error: null }).finally(fn),
      };
      return chain;
    });

    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.criarNotificacao({
        tipo: 'ferias_aprovada',
        titulo: 'Férias Aprovadas',
        mensagem: 'Suas férias foram aprovadas',
        entidade_id: 'f1',
        entidade_tipo: 'ferias',
      });
    });

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ferias_aprovada', lida: false })
    );
  });
});
