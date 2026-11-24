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
  contratoTemplateService: { gerarTokenAssinatura: vi.fn() },
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: any, fallback: string) => fallback),
}));

import { useContratosVencendo } from '../useContratosVencendo';

const DEFAULT_MUTATION = { mutate: vi.fn(), isPending: false, isError: false };

const MOCK_CONTRATOS = [
  { id: 'c1', data_fim: '2026-08-01', severidade: 'critico' as const, empresa_id: 'emp-1', tipo_contrato: 'clt_indeterminado', template_nome: 'CLT', dias_para_vencer: 7 },
  { id: 'c2', data_fim: '2026-07-24', severidade: 'vencido' as const, empresa_id: 'emp-1', tipo_contrato: 'pj', template_nome: 'PJ', dias_para_vencer: -1 },
  { id: 'c3', data_fim: '2026-09-01', severidade: 'ok' as const, empresa_id: 'emp-1', tipo_contrato: 'clt_indeterminado', template_nome: 'CLT', dias_para_vencer: 40 },
];

describe('useContratosVencendo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue(DEFAULT_MUTATION);
  });

  it('queries with empresa_id key', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    renderHook(() => useContratosVencendo());
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['contratos-vencendo', 'emp-1'] })
    );
  });

  it('is enabled when empresaId is defined', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    renderHook(() => useContratosVencendo());
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );
  });

  it('returns isLoading from query', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useContratosVencendo());
    expect(result.current.isLoading).toBe(true);
  });

  it('exposes contratos sorted by severidade', () => {
    mockUseQuery.mockReturnValue({ data: MOCK_CONTRATOS, isLoading: false });
    const { result } = renderHook(() => useContratosVencendo());
    const { contratos } = result.current;
    expect(contratos[0].severidade).toBe('vencido');
    expect(contratos[1].severidade).toBe('critico');
    expect(contratos[2].severidade).toBe('ok');
  });

  it('computes resumo counts correctly', () => {
    mockUseQuery.mockReturnValue({ data: MOCK_CONTRATOS, isLoading: false });
    const { result } = renderHook(() => useContratosVencendo());
    expect(result.current.resumo.vencido).toBe(1);
    expect(result.current.resumo.critico).toBe(1);
    expect(result.current.resumo.ok).toBe(1);
    expect(result.current.resumo.total).toBe(3);
  });

  it('exposes gerarLink mutation', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    const { result } = renderHook(() => useContratosVencendo());
    expect(result.current.gerarLink).toBeDefined();
    expect(typeof result.current.gerarLink.mutate).toBe('function');
  });

  it('exposes refetch function', () => {
    const refetch = vi.fn();
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, refetch });
    const { result } = renderHook(() => useContratosVencendo());
    expect(typeof result.current.refetch).toBe('function');
  });
});
