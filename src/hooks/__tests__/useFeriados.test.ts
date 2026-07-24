import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockFrom, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/contexts/EmpresaContext', () => ({
  useEmpresa: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

import { useFeriados } from '../useFeriados';

function buildSelectChain(data: any[] = []) {
  const response = { data, error: null };
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve(response).then(fn);
  chain.catch = (fn: any) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: any) => Promise.resolve(response).finally(fn);
  const insertFn = vi.fn().mockResolvedValue({ error: null });
  const eqFn = vi.fn().mockResolvedValue({ error: null });
  const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain), insert: insertFn, delete: deleteFn });
  return { chain, insertFn, deleteFn, eqFn };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useFeriados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildSelectChain([]);
  });

  it('returns empty feriados initially', async () => {
    const { result } = renderHook(() => useFeriados(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.feriados).toEqual([]);
  });

  it('queries feriados table', async () => {
    const { result } = renderHook(() => useFeriados(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('feriados');
  });

  it('returns feriados from service', async () => {
    buildSelectChain([{ id: 'h1', descricao: 'Natal', data: '2024-12-25' }]);
    const { result } = renderHook(() => useFeriados(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.feriados).toHaveLength(1);
  });

  it('criarFeriado inserts into feriados and shows success toast', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    const selectChain: any = {
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: (fn: any) => Promise.resolve({ data: [], error: null }).then(fn),
      catch: (fn: any) => Promise.resolve({ data: [], error: null }).catch(fn),
      finally: (fn: any) => Promise.resolve({ data: [], error: null }).finally(fn),
    };
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(selectChain), insert: insertFn });

    const { result } = renderHook(() => useFeriados(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.criarFeriado.mutateAsync({ nome: 'Natal', data: '2024-12-25', tipo: 'nacional' });
    });

    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ descricao: 'Natal', data: '2024-12-25' }));
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Feriado cadastrado!'));
  });

  it('excluirFeriado deletes by id and shows success toast', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
    const selectChain: any = {
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then: (fn: any) => Promise.resolve({ data: [], error: null }).then(fn),
      catch: (fn: any) => Promise.resolve({ data: [], error: null }).catch(fn),
      finally: (fn: any) => Promise.resolve({ data: [], error: null }).finally(fn),
    };
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(selectChain), delete: deleteFn });

    const { result } = renderHook(() => useFeriados(), { wrapper });

    await act(async () => {
      await result.current.excluirFeriado.mutateAsync('h1');
    });

    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'h1');
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Feriado excluído'));
  });
});
