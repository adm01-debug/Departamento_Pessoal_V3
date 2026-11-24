import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockUseQuery, mockUseMutation, mockUseQueryClient } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockUseMutation: vi.fn(),
  mockUseQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn(), cancelQueries: vi.fn(), getQueriesData: vi.fn(() => []), setQueryData: vi.fn() })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
  useMutation: mockUseMutation,
  useQueryClient: mockUseQueryClient,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: any, fallback: string) => fallback),
}));

import { useProgramacaoFerias, useProgramacaoMutations } from '../useProgramacaoFerias';

const MOCK_PROGRAMACOES = [
  {
    id: 'prog-1',
    empresa_id: 'emp-1',
    colaborador_id: 'col-1',
    ano: 2026,
    mes_previsto: 7,
    dias_previstos: 30,
    status: 'sugerido_gestor' as const,
    colaborador: { id: 'col-1', nome_completo: 'Alice', foto_url: null, departamento_id: 'dep-1' },
  },
];

describe('useProgramacaoFerias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, refetch: vi.fn() });
    mockUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('uses ferias-programacao queryKey with ano and filters', () => {
    renderHook(() => useProgramacaoFerias(2026));
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['ferias-programacao', 'emp-1', 2026, {}],
      })
    );
  });

  it('is enabled when empresaId is present', () => {
    renderHook(() => useProgramacaoFerias(2026));
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );
  });

  it('returns data from query', () => {
    mockUseQuery.mockReturnValue({ data: MOCK_PROGRAMACOES, isLoading: false, refetch: vi.fn() });
    const { result } = renderHook(() => useProgramacaoFerias(2026));
    expect(result.current.data).toEqual(MOCK_PROGRAMACOES);
  });

  it('returns empty array when query data is undefined', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, refetch: vi.fn() });
    const { result } = renderHook(() => useProgramacaoFerias(2026));
    expect(result.current.data).toEqual([]);
  });

  it('exposes isLoading flag', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true, refetch: vi.fn() });
    const { result } = renderHook(() => useProgramacaoFerias(2026));
    expect(result.current.isLoading).toBe(true);
  });

  it('exposes refetch function', () => {
    const refetch = vi.fn();
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, refetch });
    const { result } = renderHook(() => useProgramacaoFerias(2026));
    expect(typeof result.current.refetch).toBe('function');
  });

  it('exposes empresaId', () => {
    const { result } = renderHook(() => useProgramacaoFerias(2026));
    expect(result.current.empresaId).toBe('emp-1');
  });

  it('passes status filter in queryKey', () => {
    renderHook(() => useProgramacaoFerias(2026, { status: 'aprovado_gestor' }));
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['ferias-programacao', 'emp-1', 2026, { status: 'aprovado_gestor' }],
      })
    );
  });
});

describe('useProgramacaoMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('exposes criar mutation', () => {
    const { result } = renderHook(() => useProgramacaoMutations(2026));
    expect(result.current.criar).toBeDefined();
    expect(typeof result.current.criar.mutate).toBe('function');
  });

  it('exposes mover mutation', () => {
    const { result } = renderHook(() => useProgramacaoMutations(2026));
    expect(result.current.mover).toBeDefined();
    expect(typeof result.current.mover.mutate).toBe('function');
  });

  it('exposes aprovarGestor mutation', () => {
    const { result } = renderHook(() => useProgramacaoMutations(2026));
    expect(result.current.aprovarGestor).toBeDefined();
    expect(typeof result.current.aprovarGestor.mutate).toBe('function');
  });

  it('exposes aprovarRH mutation', () => {
    const { result } = renderHook(() => useProgramacaoMutations(2026));
    expect(result.current.aprovarRH).toBeDefined();
    expect(typeof result.current.aprovarRH.mutate).toBe('function');
  });

  it('exposes rejeitar mutation', () => {
    const { result } = renderHook(() => useProgramacaoMutations(2026));
    expect(result.current.rejeitar).toBeDefined();
    expect(typeof result.current.rejeitar.mutate).toBe('function');
  });

  it('exposes converter mutation', () => {
    const { result } = renderHook(() => useProgramacaoMutations(2026));
    expect(result.current.converter).toBeDefined();
    expect(typeof result.current.converter.mutate).toBe('function');
  });

  it('criar calls useMutation with mutationFn', () => {
    renderHook(() => useProgramacaoMutations(2026));
    expect(mockUseMutation).toHaveBeenCalledWith(
      expect.objectContaining({ mutationFn: expect.any(Function) })
    );
  });

  it('criar invalidates ferias-programacao on success', () => {
    const invalidate = vi.fn();
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: invalidate,
      cancelQueries: vi.fn(),
      getQueriesData: vi.fn(() => []),
      setQueryData: vi.fn(),
    });
    const onSuccessCalls: Function[] = [];
    mockUseMutation.mockImplementation(({ onSuccess }: any) => {
      if (onSuccess) onSuccessCalls.push(onSuccess);
      return { mutate: vi.fn(), isPending: false };
    });
    renderHook(() => useProgramacaoMutations(2026));
    onSuccessCalls[0]?.();
    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: expect.arrayContaining(['ferias-programacao']) })
    );
  });
});
