import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockFrom, mockToastError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('sonner', () => ({
  toast: { error: mockToastError },
}));

import { useFolhaAuditoria } from '../useFolhaAuditoria';

function buildChains(selectData: any[] = []) {
  const response = { data: selectData, error: null };
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (fn: any) => Promise.resolve(response).then(fn),
    catch: (fn: any) => Promise.resolve(response).catch(fn),
    finally: (fn: any) => Promise.resolve(response).finally(fn),
  };
  const singleFn = vi.fn().mockResolvedValue({ data: { id: 'a1' }, error: null });
  const insertSelectFn = vi.fn().mockReturnValue({ single: singleFn });
  const insertFn = vi.fn().mockReturnValue({ select: insertSelectFn });
  mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain), insert: insertFn });
  return { chain, insertFn, singleFn };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useFolhaAuditoria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildChains([]);
  });

  it('is disabled and returns empty when no folhaId', () => {
    const { result } = renderHook(() => useFolhaAuditoria(undefined), { wrapper });
    expect(result.current.logs).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('queries folha_auditoria with folhaId', async () => {
    const { result } = renderHook(() => useFolhaAuditoria('f1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('folha_auditoria');
  });

  it('returns logs from service', async () => {
    buildChains([{ id: 'a1', tipo_evento: 'CALCULO', severidade: 'INFO', mensagem: 'ok' }]);
    const { result } = renderHook(() => useFolhaAuditoria('f1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.logs).toHaveLength(1);
  });

  it('registrar calls supabase insert on folha_auditoria', async () => {
    const { insertFn } = buildChains([]);
    const { result } = renderHook(() => useFolhaAuditoria('f1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.registrarLog({
        folha_id: 'f1',
        tipo_evento: 'CALCULO',
        severidade: 'INFO',
        mensagem: 'Cálculo iniciado',
        detalhes: {},
      });
    });

    expect(insertFn).toHaveBeenCalledWith([expect.objectContaining({ mensagem: 'Cálculo iniciado' })]);
  });
});
