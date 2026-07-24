import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockFrom, mockValidarDocumento, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockValidarDocumento: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/services/contratacaoService', () => ({
  contratacaoService: { validarDocumento: mockValidarDocumento },
}));

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

import { useContratacaoDigital } from '../useContratacaoDigital';

function buildUpdateChain(returnData: any = { id: 't1' }) {
  const singleFn = vi.fn().mockResolvedValue({ data: returnData, error: null });
  const selectFn = vi.fn().mockReturnValue({ single: singleFn });
  const eqFn = vi.fn().mockReturnValue({ select: selectFn });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn, singleFn };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useContratacaoDigital', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('atualizarEtapa calls supabase update on admissao_tokens with tokenId', async () => {
    const { updateFn, eqFn } = buildUpdateChain();
    const { result } = renderHook(() => useContratacaoDigital(), { wrapper });

    await act(async () => {
      await result.current.atualizarEtapa.mutateAsync({ tokenId: 'tok-1', campos: { etapa: 'documentos' } });
    });

    expect(mockFrom).toHaveBeenCalledWith('admissao_tokens');
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ etapa: 'documentos' }));
    expect(eqFn).toHaveBeenCalledWith('id', 'tok-1');
  });

  it('atualizarEtapa shows error toast on failure', async () => {
    const singleFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    const eqFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ update: vi.fn().mockReturnValue({ eq: eqFn }) });

    const { result } = renderHook(() => useContratacaoDigital(), { wrapper });

    await act(async () => {
      await result.current.atualizarEtapa.mutateAsync({ tokenId: 'tok-1', campos: {} }).catch(() => {});
    });

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
  });

  it('validarDocumento calls contratacaoService.validarDocumento', async () => {
    mockValidarDocumento.mockResolvedValue({ success: true });
    buildUpdateChain();
    const { result } = renderHook(() => useContratacaoDigital(), { wrapper });

    await act(async () => {
      await result.current.validarDocumento.mutateAsync({
        admissaoId: 'adm-1',
        docType: 'rg',
        status: 'validado',
        observacao: 'ok',
      });
    });

    expect(mockValidarDocumento).toHaveBeenCalledWith('adm-1', 'rg', 'validado', 'ok');
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Validação do documento atualizada'));
  });
});
