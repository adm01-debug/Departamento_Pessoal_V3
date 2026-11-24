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

vi.mock('sonner', () => ({ toast: { success: mockToastSuccess, error: mockToastError } }));

import { useAdmissaoWorkflow } from '../useAdmissaoWorkflow';

function buildSelectChain(data: any) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data, error: null });
  return chain;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useAdmissaoWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => buildSelectChain(null));
  });

  it('is disabled when no admissaoId', () => {
    renderHook(() => useAdmissaoWorkflow(undefined), { wrapper });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('queries workflows_execucoes when admissaoId is provided', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workflows_execucoes') return buildSelectChain(null);
      return buildSelectChain(null);
    });
    const { result } = renderHook(() => useAdmissaoWorkflow('adm-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFrom).toHaveBeenCalledWith('workflows_execucoes');
  });

  it('returns null workflow when no data found', async () => {
    const { result } = renderHook(() => useAdmissaoWorkflow('adm-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.workflow).toBeNull();
  });

  it('exposes iniciarWorkflow and avancarEtapa mutation objects', () => {
    const { result } = renderHook(() => useAdmissaoWorkflow('adm-1'), { wrapper });
    expect(typeof result.current.iniciarWorkflow).toBe('object');
    expect(typeof result.current.iniciarWorkflow.mutate).toBe('function');
    expect(typeof result.current.avancarEtapa).toBe('object');
    expect(typeof result.current.avancarEtapa.mutate).toBe('function');
  });

  it('exposes isLoading boolean', async () => {
    const { result } = renderHook(() => useAdmissaoWorkflow('adm-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLoading).toBe(false);
  });

  it('returns workflow data when found', async () => {
    const workflowData = { id: 'wf-1', status: 'em_andamento', etapa_atual: 1 };
    mockFrom.mockImplementation((table: string) => {
      const chain = buildSelectChain(workflowData);
      return chain;
    });
    const { result } = renderHook(() => useAdmissaoWorkflow('adm-1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.workflow).toEqual(workflowData);
  });
});
