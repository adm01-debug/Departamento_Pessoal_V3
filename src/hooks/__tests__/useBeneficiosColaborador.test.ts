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

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

import { useBeneficiosColaborador } from '../useBeneficiosColaborador';

function buildChains(selectData: any[] = [], insertData: any = null) {
  const selectResponse = { data: selectData, error: null };
  const selectChain: any = {
    eq: vi.fn().mockReturnThis(),
    then: (fn: any) => Promise.resolve(selectResponse).then(fn),
    catch: (fn: any) => Promise.resolve(selectResponse).catch(fn),
    finally: (fn: any) => Promise.resolve(selectResponse).finally(fn),
  };
  const insertChain: any = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: insertData, error: null }),
  };
  const deleteChain: any = {
    eq: vi.fn().mockResolvedValue({ error: null }),
  };
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue(selectChain),
    insert: vi.fn().mockReturnValue(insertChain),
    delete: vi.fn().mockReturnValue(deleteChain),
  });
  return { selectChain, insertChain, deleteChain };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useBeneficiosColaborador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildChains([]);
  });

  it('returns empty array and is not loading when no colaboradorId', () => {
    const { result } = renderHook(() => useBeneficiosColaborador(undefined), { wrapper });
    expect(result.current.beneficios).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('queries beneficios_colaborador table for given colaboradorId', async () => {
    const { result } = renderHook(() => useBeneficiosColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('beneficios_colaborador');
  });

  it('returns beneficios from service', async () => {
    buildChains([{ id: 'b1', beneficio: { nome: 'VT', tipo: 'transporte' } }]);
    const { result } = renderHook(() => useBeneficiosColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.beneficios).toHaveLength(1);
  });

  it('vincularBeneficio inserts into beneficios_colaborador with colaborador_id', async () => {
    buildChains([], { id: 'b1' });
    const { result } = renderHook(() => useBeneficiosColaborador('col-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let insertFn: ReturnType<typeof vi.fn>;
    mockFrom.mockImplementation(() => {
      insertFn = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'b1' }, error: null }),
        }),
      });
      const selectChain: any = {
        eq: vi.fn().mockReturnThis(),
        then: (fn: any) => Promise.resolve({ data: [], error: null }).then(fn),
        catch: (fn: any) => Promise.resolve({ data: [], error: null }).catch(fn),
        finally: (fn: any) => Promise.resolve({ data: [], error: null }).finally(fn),
      };
      return { select: vi.fn().mockReturnValue(selectChain), insert: insertFn! };
    });

    await act(async () => {
      await result.current.vincularBeneficio({ beneficio_id: 'ben-1' });
    });

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Benefício vinculado com sucesso!'));
  });

  it('desvincularBeneficio deletes by id and shows success toast', async () => {
    buildChains([]);
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockImplementation(() => {
      const selectChain: any = {
        eq: vi.fn().mockReturnThis(),
        then: (fn: any) => Promise.resolve({ data: [], error: null }).then(fn),
        catch: (fn: any) => Promise.resolve({ data: [], error: null }).catch(fn),
        finally: (fn: any) => Promise.resolve({ data: [], error: null }).finally(fn),
      };
      return { select: vi.fn().mockReturnValue(selectChain), delete: deleteFn };
    });

    const { result } = renderHook(() => useBeneficiosColaborador('col-1'), { wrapper });

    await act(async () => {
      await result.current.desvincularBeneficio('b1');
    });

    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'b1');
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Benefício removido!'));
  });
});
