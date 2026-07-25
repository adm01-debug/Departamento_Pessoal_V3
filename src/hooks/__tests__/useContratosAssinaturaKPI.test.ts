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
  supabase: { from: vi.fn() },
}));

vi.mock('@/services/contratoTemplateService', () => ({
  contratoTemplateService: {
    revogarToken: vi.fn(),
    gerarTokenAssinatura: vi.fn(),
    estenderExpiracaoToken: vi.fn(),
  },
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: any, fallback: string) => fallback),
}));

import { useContratosAssinaturaKPI } from '../useContratosAssinaturaKPI';

const DEFAULT_MUTATION = { mutate: vi.fn(), isPending: false };

describe('useContratosAssinaturaKPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue(DEFAULT_MUTATION);
    mockUseQuery.mockReturnValue({ data: null, isLoading: false });
  });

  it('queries kpi with empresa_id', () => {
    renderHook(() => useContratosAssinaturaKPI());
    const calls = mockUseQuery.mock.calls;
    const kpiCall = calls.find(([opts]: any) =>
      Array.isArray(opts.queryKey) && opts.queryKey[0] === 'contratos-assinatura-kpi'
    );
    expect(kpiCall).toBeDefined();
    expect(kpiCall[0].queryKey).toEqual(['contratos-assinatura-kpi', 'emp-1']);
  });

  it('queries pendentes with empresa_id', () => {
    renderHook(() => useContratosAssinaturaKPI());
    const calls = mockUseQuery.mock.calls;
    const pendentesCall = calls.find(([opts]: any) =>
      Array.isArray(opts.queryKey) && opts.queryKey[0] === 'contratos-tokens-pendentes'
    );
    expect(pendentesCall).toBeDefined();
    expect(pendentesCall[0].queryKey).toEqual(['contratos-tokens-pendentes', 'emp-1']);
  });

  it('exposes kpi query result', () => {
    const kpiData = { tokens_gerados: 10, tokens_assinados: 8, taxa_conversao_pct: 80 };
    mockUseQuery
      .mockReturnValueOnce({ data: kpiData, isLoading: false })
      .mockReturnValueOnce({ data: [], isLoading: false });
    const { result } = renderHook(() => useContratosAssinaturaKPI());
    expect(result.current.kpi.data).toEqual(kpiData);
  });

  it('exposes pendentes query result', () => {
    const pendentesData = [{ id: 'tok-1', contrato_id: 'c-1' }];
    mockUseQuery
      .mockReturnValueOnce({ data: null, isLoading: false })
      .mockReturnValueOnce({ data: pendentesData, isLoading: false });
    const { result } = renderHook(() => useContratosAssinaturaKPI());
    expect(result.current.pendentes.data).toEqual(pendentesData);
  });

  it('exposes revogar mutation', () => {
    const { result } = renderHook(() => useContratosAssinaturaKPI());
    expect(result.current.revogar).toBeDefined();
    expect(typeof result.current.revogar.mutate).toBe('function');
  });

  it('exposes reenviar mutation', () => {
    const { result } = renderHook(() => useContratosAssinaturaKPI());
    expect(result.current.reenviar).toBeDefined();
    expect(typeof result.current.reenviar.mutate).toBe('function');
  });

  it('exposes estender mutation', () => {
    const { result } = renderHook(() => useContratosAssinaturaKPI());
    expect(result.current.estender).toBeDefined();
    expect(typeof result.current.estender.mutate).toBe('function');
  });
});
