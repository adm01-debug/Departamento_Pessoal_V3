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

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtualId: 'emp-1' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

import { useDocumentos } from '../useDocumentos';

function buildListChain(data: any[], error: any = null) {
  const response = { data, error };
  const chain: any = {};
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve(response).then(fn);
  chain.catch = (fn: any) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: any) => Promise.resolve(response).finally(fn);
  const selectFn = vi.fn().mockReturnValue(chain);
  mockFrom.mockReturnValue({ select: selectFn });
  return chain;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useDocumentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildListChain([]);
  });

  it('returns empty documentos initially', async () => {
    const { result } = renderHook(() => useDocumentos(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.documentos).toEqual([]);
  });

  it('queries documentos table with eq empresa_id', async () => {
    const docs = [{ id: 'd1', nome: 'Contrato' }];
    buildListChain(docs);
    const { result } = renderHook(() => useDocumentos(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.documentos).toEqual(docs);
    expect(mockFrom).toHaveBeenCalledWith('documentos');
  });

  it('criarDocumento inserts into documentos with empresa_id', async () => {
    buildListChain([]);
    const insertResult = { id: 'd1', nome: 'Doc' };
    const maybeSingleFn = vi.fn().mockResolvedValue({ data: insertResult, error: null });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle: maybeSingleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'documentos') return { select: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ then: (fn: any) => Promise.resolve({ data: [], error: null }).then(fn), catch: (fn: any) => Promise.resolve({ data: [], error: null }).catch(fn), finally: (fn: any) => Promise.resolve({ data: [], error: null }).finally(fn) }) }) }) }), insert: insertFn };
      return { select: vi.fn() };
    });

    const { result } = renderHook(() => useDocumentos(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.criarDocumento.mutateAsync({ nome: 'Doc', tipo: 'contrato' });
    });

    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Doc',
      empresa_id: 'emp-1',
    }));
  });

  it('criarDocumento shows success toast', async () => {
    buildListChain([]);
    const maybeSingleFn = vi.fn().mockResolvedValue({ data: { id: 'd1' }, error: null });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle: maybeSingleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'documentos') return {
        select: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ then: (fn: any) => Promise.resolve({ data: [], error: null }).then(fn), catch: (fn: any) => Promise.resolve({ data: [], error: null }).catch(fn), finally: (fn: any) => Promise.resolve({ data: [], error: null }).finally(fn) }) }) }) }),
        insert: insertFn,
      };
      return {};
    });

    const { result } = renderHook(() => useDocumentos(), { wrapper });
    await act(async () => {
      await result.current.criarDocumento.mutateAsync({ nome: 'Doc', tipo: 'contrato' });
    });

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Documento criado!'));
  });

  it('excluirDocumento deletes from documentos by id', async () => {
    buildListChain([]);
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'documentos') return {
        select: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ then: (fn: any) => Promise.resolve({ data: [], error: null }).then(fn), catch: (fn: any) => Promise.resolve({ data: [], error: null }).catch(fn), finally: (fn: any) => Promise.resolve({ data: [], error: null }).finally(fn) }) }) }) }),
        delete: deleteFn,
      };
      return {};
    });

    const { result } = renderHook(() => useDocumentos(), { wrapper });

    await act(async () => {
      await result.current.excluirDocumento.mutateAsync('d1');
    });

    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'd1');
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Documento excluído'));
  });
});
