import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useGenericCrud } from '../useGenericCrud';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/services/loggerService', () => ({
  loggerService: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function createMockService() {
  return {
    listar: vi.fn().mockResolvedValue({ data: [{ id: '1', nome: 'Test' }], total: 1 }),
    criar: vi.fn().mockResolvedValue({ id: '2', nome: 'New' }),
    atualizar: vi.fn().mockResolvedValue({ id: '1', nome: 'Updated' }),
    excluir: vi.fn().mockResolvedValue(undefined),
  };
}

describe('useGenericCrud', () => {
  let service: ReturnType<typeof createMockService>;

  beforeEach(() => {
    service = createMockService();
    vi.clearAllMocks();
  });

  it('initial state has correct defaults', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGenericCrud({ queryKey: 'test', service }),
      { wrapper }
    );
    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.search).toBe('');
  });

  it('respects custom initialPageSize', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGenericCrud({ queryKey: 'test', service, initialPageSize: 25 }),
      { wrapper }
    );
    expect(result.current.pageSize).toBe(25);
  });

  it('loads items from service after query resolves', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGenericCrud({ queryKey: 'test', service }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.total).toBe(1);
    expect(result.current.items[0]).toEqual({ id: '1', nome: 'Test' });
  });

  it('passes correct options to service.listar', async () => {
    const wrapper = createWrapper();
    renderHook(
      () => useGenericCrud({ queryKey: 'test', service }),
      { wrapper }
    );
    await waitFor(() => expect(service.listar).toHaveBeenCalled());
    expect(service.listar).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 10, search: '' })
    );
  });

  it('setSearch updates search value', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGenericCrud({ queryKey: 'test', service }),
      { wrapper }
    );
    act(() => { result.current.setSearch('foo'); });
    expect(result.current.search).toBe('foo');
  });

  it('setSearch resets page to 1', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGenericCrud({ queryKey: 'test', service }),
      { wrapper }
    );
    act(() => { result.current.setPage(3); });
    expect(result.current.page).toBe(3);
    act(() => { result.current.setSearch('bar'); });
    await waitFor(() => expect(result.current.page).toBe(1));
  });

  it('setPage updates page', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGenericCrud({ queryKey: 'test', service }),
      { wrapper }
    );
    act(() => { result.current.setPage(5); });
    expect(result.current.page).toBe(5);
  });

  it('setPageSize updates pageSize', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGenericCrud({ queryKey: 'test', service }),
      { wrapper }
    );
    act(() => { result.current.setPageSize(50); });
    expect(result.current.pageSize).toBe(50);
  });

  it('criar calls service.criar and shows default success toast', async () => {
    const { toast } = await import('sonner');
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGenericCrud({ queryKey: 'test', service }),
      { wrapper }
    );
    await act(async () => {
      await result.current.criar({ nome: 'New' });
    });
    expect(service.criar).toHaveBeenCalledWith({ nome: 'New' });
    expect(toast.success).toHaveBeenCalledWith('Registro criado com sucesso');
  });

  it('criar uses custom successMessages.create', async () => {
    const { toast } = await import('sonner');
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGenericCrud({
        queryKey: 'test',
        service,
        successMessages: { create: 'Colaborador criado!' },
      }),
      { wrapper }
    );
    await act(async () => {
      await result.current.criar({});
    });
    expect(toast.success).toHaveBeenCalledWith('Colaborador criado!');
  });

  it('atualizar calls service.atualizar with id and data', async () => {
    const { toast } = await import('sonner');
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGenericCrud({ queryKey: 'test', service }),
      { wrapper }
    );
    await act(async () => {
      await result.current.atualizar({ id: '1', data: { nome: 'Updated' } });
    });
    expect(service.atualizar).toHaveBeenCalledWith('1', { nome: 'Updated' });
    expect(toast.success).toHaveBeenCalledWith('Registro atualizado com sucesso');
  });

  it('atualizar uses custom successMessages.update', async () => {
    const { toast } = await import('sonner');
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGenericCrud({
        queryKey: 'test',
        service,
        successMessages: { update: 'Cargo atualizado!' },
      }),
      { wrapper }
    );
    await act(async () => {
      await result.current.atualizar({ id: '1', data: {} });
    });
    expect(toast.success).toHaveBeenCalledWith('Cargo atualizado!');
  });

  it('excluir calls service.excluir and shows default success toast', async () => {
    const { toast } = await import('sonner');
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGenericCrud({ queryKey: 'test', service }),
      { wrapper }
    );
    await act(async () => {
      await result.current.excluir('1');
    });
    expect(service.excluir).toHaveBeenCalledWith('1');
    expect(toast.success).toHaveBeenCalledWith('Registro excluído com sucesso');
  });

  it('excluir uses custom successMessages.delete', async () => {
    const { toast } = await import('sonner');
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGenericCrud({
        queryKey: 'test',
        service,
        successMessages: { delete: 'Removido com sucesso!' },
      }),
      { wrapper }
    );
    await act(async () => {
      await result.current.excluir('1');
    });
    expect(toast.success).toHaveBeenCalledWith('Removido com sucesso!');
  });

  it('criar error shows toast.error with error message', async () => {
    const { toast } = await import('sonner');
    service.criar.mockRejectedValue(new Error('Falha ao criar'));
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGenericCrud({ queryKey: 'test', service }),
      { wrapper }
    );
    await act(async () => {
      try { await result.current.criar({}); } catch { /* expected */ }
    });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Falha ao criar'));
  });

  it('excluir error shows toast.error', async () => {
    const { toast } = await import('sonner');
    service.excluir.mockRejectedValue(new Error('Não encontrado'));
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGenericCrud({ queryKey: 'test', service }),
      { wrapper }
    );
    await act(async () => {
      try { await result.current.excluir('99'); } catch { /* expected */ }
    });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Não encontrado'));
  });

  it('exposes isCreating, isUpdating, isDeleting flags', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGenericCrud({ queryKey: 'test', service }),
      { wrapper }
    );
    expect(result.current.isCreating).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
  });

  it('exposes refetch and isRefreshing', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useGenericCrud({ queryKey: 'test', service }),
      { wrapper }
    );
    expect(typeof result.current.refetch).toBe('function');
    expect(result.current.isRefreshing).toBe(false);
  });
});
