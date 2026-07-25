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

import { useContratoTokenTimeline } from '../useContratoTokenTimeline';

const MOCK_EVENTOS = [
  { id: 'e1', evento: 'gerado', token_id: 'tok-1', created_at: '2026-07-24T10:00:00Z', detalhes: {} },
  { id: 'e2', evento: 'assinado', token_id: 'tok-1', created_at: '2026-07-24T11:00:00Z', detalhes: {} },
];

describe('useContratoTokenTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
  });

  it('is disabled when tokenId is null', () => {
    renderHook(() => useContratoTokenTimeline(null));
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
  });

  it('is disabled when tokenId is undefined', () => {
    renderHook(() => useContratoTokenTimeline(undefined));
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
  });

  it('is enabled when tokenId is provided', () => {
    renderHook(() => useContratoTokenTimeline('tok-1'));
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );
  });

  it('uses correct queryKey with tokenId', () => {
    renderHook(() => useContratoTokenTimeline('tok-1'));
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['contrato-token-timeline', 'tok-1'] })
    );
  });

  it('passes data from useQuery to caller', () => {
    mockUseQuery.mockReturnValue({ data: MOCK_EVENTOS, isLoading: false });
    const { result } = renderHook(() => useContratoTokenTimeline('tok-1'));
    expect(result.current.data).toEqual(MOCK_EVENTOS);
  });

  it('exposes isLoading flag', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useContratoTokenTimeline('tok-1'));
    expect(result.current.isLoading).toBe(true);
  });
});
