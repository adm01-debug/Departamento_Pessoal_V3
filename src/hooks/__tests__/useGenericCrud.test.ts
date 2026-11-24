import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockUseQuery, mockUseMutation, mockUseQueryClient } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockUseMutation: vi.fn(),
  mockUseQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
  useMutation: mockUseMutation,
  useQueryClient: mockUseQueryClient,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/services/loggerService', () => ({
  loggerService: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/utils/auditLogger', () => ({
  auditLogger: { log: vi.fn() },
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((_e: any, fallback: string) => fallback),
}));

import { useGenericCrud } from '../useGenericCrud';

const mockService = {
  listar: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  criar: vi.fn().mockResolvedValue({ id: 'new-id' }),
  atualizar: vi.fn().mockResolvedValue({ id: 'upd-id' }),
  excluir: vi.fn().mockResolvedValue(undefined),
};

const DEFAULT_QUERY = { data: { data: [{ id: '1' }], total: 1 }, isLoading: false, isFetching: false, error: null, refetch: vi.fn() };
const DEFAULT_MUTATION = { mutateAsync: vi.fn(), isPending: false };

describe('useGenericCrud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(DEFAULT_QUERY);
    mockUseMutation.mockReturnValue(DEFAULT_MUTATION);
  });

  it('passes queryKey and queryFn to useQuery', () => {
    renderHook(() => useGenericCrud({ queryKey: 'colaboradores', service: mockService }));
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(['colaboradores']),
        queryFn: expect.any(Function),
      })
    );
  });

  it('exposes items from query data', () => {
    const { result } = renderHook(() => useGenericCrud({ queryKey: 'colaboradores', service: mockService }));
    expect(result.current.items).toEqual([{ id: '1' }]);
  });

  it('exposes total from query data', () => {
    const { result } = renderHook(() => useGenericCrud({ queryKey: 'colaboradores', service: mockService }));
    expect(result.current.total).toBe(1);
  });

  it('returns empty items when query data is undefined', () => {
    mockUseQuery.mockReturnValue({ ...DEFAULT_QUERY, data: undefined });
    const { result } = renderHook(() => useGenericCrud({ queryKey: 'colaboradores', service: mockService }));
    expect(result.current.items).toEqual([]);
  });

  it('exposes isLoading flag', () => {
    mockUseQuery.mockReturnValue({ ...DEFAULT_QUERY, isLoading: true });
    const { result } = renderHook(() => useGenericCrud({ queryKey: 'colaboradores', service: mockService }));
    expect(result.current.isLoading).toBe(true);
  });

  it('exposes criar, atualizar, excluir mutations', () => {
    const { result } = renderHook(() => useGenericCrud({ queryKey: 'colaboradores', service: mockService }));
    expect(typeof result.current.criar).toBe('function');
    expect(typeof result.current.atualizar).toBe('function');
    expect(typeof result.current.excluir).toBe('function');
  });

  it('exposes search and setSearch', () => {
    const { result } = renderHook(() => useGenericCrud({ queryKey: 'colaboradores', service: mockService }));
    expect(result.current.search).toBe('');
    expect(typeof result.current.setSearch).toBe('function');
  });

  it('exposes page and setPage with default 1', () => {
    const { result } = renderHook(() => useGenericCrud({ queryKey: 'colaboradores', service: mockService }));
    expect(result.current.page).toBe(1);
    expect(typeof result.current.setPage).toBe('function');
  });

  it('uses initialPageSize option', () => {
    const { result } = renderHook(() => useGenericCrud({ queryKey: 'test', service: mockService, initialPageSize: 25 }));
    expect(result.current.pageSize).toBe(25);
  });

  it('exposes isCreating/isUpdating/isDeleting as false by default', () => {
    const { result } = renderHook(() => useGenericCrud({ queryKey: 'test', service: mockService }));
    expect(result.current.isCreating).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
  });

  it('exposes refetch function', () => {
    const { result } = renderHook(() => useGenericCrud({ queryKey: 'test', service: mockService }));
    expect(typeof result.current.refetch).toBe('function');
  });
});
