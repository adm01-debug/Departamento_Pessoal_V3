import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { useReconciliacaoLogs } from '../useReconciliacaoLogs';

const MOCK_LOGS = [
  { id: 'log-1', executado_em: '2026-07-24T10:00:00Z', verificadas: 100, corrigidas: 5, restantes: 95, duracao_ms: 230 },
  { id: 'log-2', executado_em: '2026-07-23T10:00:00Z', verificadas: 80, corrigidas: 2, restantes: 78, duracao_ms: 180 },
];

describe('useReconciliacaoLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
  });

  it('uses ferias reconciliacao-logs queryKey with default limit', () => {
    renderHook(() => useReconciliacaoLogs());
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['ferias', 'reconciliacao-logs', 10] })
    );
  });

  it('uses custom limit in queryKey', () => {
    renderHook(() => useReconciliacaoLogs(20));
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['ferias', 'reconciliacao-logs', 20] })
    );
  });

  it('returns data from query', () => {
    mockUseQuery.mockReturnValue({ data: MOCK_LOGS, isLoading: false });
    const { result } = renderHook(() => useReconciliacaoLogs());
    expect(result.current.data).toEqual(MOCK_LOGS);
  });

  it('exposes isLoading flag', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useReconciliacaoLogs());
    expect(result.current.isLoading).toBe(true);
  });

  it('passes queryFn to useQuery', () => {
    renderHook(() => useReconciliacaoLogs());
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryFn: expect.any(Function) })
    );
  });
});
