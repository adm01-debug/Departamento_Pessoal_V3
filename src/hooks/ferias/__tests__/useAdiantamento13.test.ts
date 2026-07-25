import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockUseMutation, mockUseQueryClient } = vi.hoisted(() => ({
  mockUseMutation: vi.fn(),
  mockUseQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: mockUseMutation,
  useQueryClient: mockUseQueryClient,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn() },
}));

import { useSolicitarAdiantamento13 } from '../useAdiantamento13';

describe('useSolicitarAdiantamento13', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('calls useMutation with a mutationFn', () => {
    renderHook(() => useSolicitarAdiantamento13());
    expect(mockUseMutation).toHaveBeenCalledWith(
      expect.objectContaining({ mutationFn: expect.any(Function) })
    );
  });

  it('exposes mutate function', () => {
    const { result } = renderHook(() => useSolicitarAdiantamento13());
    expect(typeof result.current.mutate).toBe('function');
  });

  it('invalidates ferias queries on success', () => {
    const invalidate = vi.fn();
    mockUseQueryClient.mockReturnValue({ invalidateQueries: invalidate });
    let capturedOnSuccess: Function;
    mockUseMutation.mockImplementation(({ onSuccess }: any) => {
      capturedOnSuccess = onSuccess;
      return { mutate: vi.fn(), isPending: false };
    });
    renderHook(() => useSolicitarAdiantamento13());
    capturedOnSuccess!({ ok: true, ano: 2026, valor: 1500, meses_avos: 12 });
    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['ferias'] })
    );
  });

  it('isPending is false by default', () => {
    const { result } = renderHook(() => useSolicitarAdiantamento13());
    expect(result.current.isPending).toBe(false);
  });
});
