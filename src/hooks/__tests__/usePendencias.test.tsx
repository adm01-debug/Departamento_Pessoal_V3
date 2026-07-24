import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePendencias } from '../usePendencias';

const { mockFrom, mockToastFn } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockToastFn: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn().mockReturnValue({ toast: mockToastFn, toasts: [], dismiss: vi.fn() }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function setupSelectMock(data: any[], error: any = null) {
  const order = vi.fn().mockResolvedValue({ data, error });
  const eqSelect = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq: eqSelect });
  const eqUpdate = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq: eqUpdate });
  mockFrom.mockReturnValue({ select, update });
  return { select, eqSelect, order, update, eqUpdate };
}

const mockPendencias = [
  {
    id: 'p1',
    tipo: 'ferias',
    titulo: 'Férias vencidas',
    descricao: 'Colaborador com férias vencidas há 30 dias',
    prioridade: 'alta',
    status: 'pendente',
    criado_at: '2026-01-10T10:00:00Z',
  },
  {
    id: 'p2',
    tipo: 'documentos',
    titulo: 'Documento pendente',
    descricao: 'RG não enviado',
    prioridade: 'media',
    status: 'em_analise',
    criado_at: '2026-01-09T10:00:00Z',
  },
];

describe('usePendencias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT query when empresaId is undefined', () => {
    setupSelectMock([]);
    const wrapper = createWrapper();
    renderHook(() => usePendencias(undefined), { wrapper });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('queries pendencias when empresaId is provided', async () => {
    const { select, eqSelect } = setupSelectMock(mockPendencias);
    const wrapper = createWrapper();
    renderHook(() => usePendencias('empresa-123'), { wrapper });
    await waitFor(() => expect(select).toHaveBeenCalledWith('*'));
    expect(eqSelect).toHaveBeenCalledWith('empresa_id', 'empresa-123');
  });

  it('returns pendencias data after query resolves', async () => {
    setupSelectMock(mockPendencias);
    const wrapper = createWrapper();
    const { result } = renderHook(() => usePendencias('empresa-123'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.data![0].id).toBe('p1');
  });

  it('exposes updateStatus mutation', () => {
    setupSelectMock([]);
    const wrapper = createWrapper();
    const { result } = renderHook(() => usePendencias('empresa-123'), { wrapper });
    expect(typeof result.current.updateStatus.mutate).toBe('function');
    expect(typeof result.current.updateStatus.mutateAsync).toBe('function');
  });

  it('updateStatus calls supabase update with correct args', async () => {
    const { update, eqUpdate } = setupSelectMock(mockPendencias);
    const wrapper = createWrapper();
    const { result } = renderHook(() => usePendencias('empresa-123'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    await act(async () => {
      await result.current.updateStatus.mutateAsync({ id: 'p1', status: 'concluido' });
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'concluido' })
    );
    expect(eqUpdate).toHaveBeenCalledWith('id', 'p1');
  });

  it('updateStatus shows success toast on success', async () => {
    setupSelectMock(mockPendencias);
    const wrapper = createWrapper();
    const { result } = renderHook(() => usePendencias('empresa-123'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    await act(async () => {
      await result.current.updateStatus.mutateAsync({ id: 'p1', status: 'concluido' });
    });
    expect(mockToastFn).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Sucesso' })
    );
  });

  it('updateStatus shows error toast when supabase returns error', async () => {
    setupSelectMock(mockPendencias);
    const eqError = vi.fn().mockResolvedValue({ error: { message: 'DB error' } });
    const update = vi.fn().mockReturnValue({ eq: eqError });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'pendencias') {
        // distinguish select vs update by checking if code calls select or update
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockPendencias, error: null }) }) }),
          update,
        };
      }
      return {};
    });
    const wrapper = createWrapper();
    const { result } = renderHook(() => usePendencias('empresa-123'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    await act(async () => {
      try {
        await result.current.updateStatus.mutateAsync({ id: 'p1', status: 'concluido' });
      } catch { /* mutation error expected */ }
    });
    await waitFor(() =>
      expect(mockToastFn).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Erro' })
      )
    );
  });

  it('isLoading is true initially when empresaId is provided', () => {
    const order = vi.fn().mockImplementation(() => new Promise(() => {}));
    const eqSelect = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq: eqSelect });
    mockFrom.mockReturnValue({ select, update: vi.fn() });
    const wrapper = createWrapper();
    const { result } = renderHook(() => usePendencias('empresa-123'), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });
});
