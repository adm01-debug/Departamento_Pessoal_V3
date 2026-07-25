import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { useReconciliacaoFolha } from '../useReconciliacaoFolha';

const MOCK_ROWS = [
  { ferias_id: 'f1', empresa_id: 'emp-1', situacao: 'divergente', rubricas_esperadas: 5, rubricas_geradas: 3 },
  { ferias_id: 'f2', empresa_id: 'emp-1', situacao: 'pendente_envio', rubricas_esperadas: 3, rubricas_geradas: 0 },
];

describe('useReconciliacaoFolha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
  });

  it('uses ferias reconciliacao-folha queryKey', () => {
    renderHook(() => useReconciliacaoFolha());
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['ferias', 'reconciliacao-folha', 'emp-1'] })
    );
  });

  it('is enabled when empresaId is present', () => {
    renderHook(() => useReconciliacaoFolha());
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );
  });

  it('returns data from query', () => {
    mockUseQuery.mockReturnValue({ data: MOCK_ROWS, isLoading: false });
    const { result } = renderHook(() => useReconciliacaoFolha());
    expect(result.current.data).toEqual(MOCK_ROWS);
  });

  it('exposes isLoading flag', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useReconciliacaoFolha());
    expect(result.current.isLoading).toBe(true);
  });
});
