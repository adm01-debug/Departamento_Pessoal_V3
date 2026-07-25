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

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { useAlertasPagamentoD2 } from '../useAlertasPagamentoD2';

const MOCK_ALERTAS = [
  { id: 'a1', severidade: 'critico', colaborador_id: 'c1', data_inicio: '2026-08-01', dias_ate_inicio: 2 },
  { id: 'a2', severidade: 'ok', colaborador_id: 'c2', data_inicio: '2026-09-01', dias_ate_inicio: 30 },
];

describe('useAlertasPagamentoD2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    mockUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('is enabled when empresaId is present', () => {
    renderHook(() => useAlertasPagamentoD2());
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );
  });

  it('uses ferias alertas-pagamento-d2 queryKey', () => {
    renderHook(() => useAlertasPagamentoD2());
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['ferias', 'alertas-pagamento-d2', 'emp-1'] })
    );
  });

  it('returns data from query', () => {
    mockUseQuery.mockReturnValue({ data: MOCK_ALERTAS, isLoading: false });
    const { result } = renderHook(() => useAlertasPagamentoD2());
    expect(result.current.data).toEqual(MOCK_ALERTAS);
  });

  it('exposes isLoading flag', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useAlertasPagamentoD2());
    expect(result.current.isLoading).toBe(true);
  });
});
