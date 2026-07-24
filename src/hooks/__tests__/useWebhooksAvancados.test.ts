import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockWebhookService } = vi.hoisted(() => ({
  mockWebhookService: {
    listar: vi.fn().mockResolvedValue({ data: [{ id: 'w1', url: 'https://example.com/hook' }], total: 1 }),
    listarLogs: vi.fn().mockResolvedValue([{ id: 'log1', status: 200 }]),
    criar: vi.fn().mockResolvedValue({ id: 'w2' }),
    atualizar: vi.fn().mockResolvedValue({}),
    excluir: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/services/webhookService', () => ({ webhookService: mockWebhookService }));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useWebhooksAvancados, useWebhookLogs } from '../useWebhooksAvancados';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useWebhooksAvancados', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns webhooks array', async () => {
    const { result } = renderHook(() => useWebhooksAvancados(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.webhooks)).toBe(true);
  });

  it('exposes crud functions', () => {
    const { result } = renderHook(() => useWebhooksAvancados(), { wrapper });
    expect(typeof result.current.criar).toBe('function');
    expect(typeof result.current.atualizar).toBe('function');
    expect(typeof result.current.excluir).toBe('function');
  });
});

describe('useWebhookLogs', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('fetches logs for a given webhookId', async () => {
    const { result } = renderHook(() => useWebhookLogs('w1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockWebhookService.listarLogs).toHaveBeenCalledWith('w1');
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('does not fetch when webhookId is empty', () => {
    renderHook(() => useWebhookLogs(''), { wrapper });
    expect(mockWebhookService.listarLogs).not.toHaveBeenCalled();
  });
});
