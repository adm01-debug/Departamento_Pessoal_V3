import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockUseMutation, mockUseQueryClient, mockInvalidate } = vi.hoisted(() => {
  const mockInvalidate = vi.fn();
  return {
    mockUseMutation: vi.fn(),
    mockUseQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidate })),
    mockInvalidate,
  };
});

vi.mock('@tanstack/react-query', () => ({
  useMutation: mockUseMutation,
  useQueryClient: mockUseQueryClient,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/contexts', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@test.com' } }),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: { from: vi.fn() },
    rpc: vi.fn(),
  },
}));

vi.mock('@/utils/avisoFeriasPDF', () => ({
  gerarAvisoFeriasPDF: vi.fn(),
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: any, fallback: string) => fallback),
}));

import { useAssinarAvisoFerias } from '../useAssinarAvisoFerias';

describe('useAssinarAvisoFerias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
    });
  });

  it('exposes assinar function', () => {
    const { result } = renderHook(() => useAssinarAvisoFerias());
    expect(typeof result.current.assinar).toBe('function');
  });

  it('exposes isSigning flag', () => {
    mockUseMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    });
    const { result } = renderHook(() => useAssinarAvisoFerias());
    expect(result.current.isSigning).toBe(true);
  });

  it('exposes baixarAvisoAssinado function', () => {
    const { result } = renderHook(() => useAssinarAvisoFerias());
    expect(typeof result.current.baixarAvisoAssinado).toBe('function');
  });

  it('calls useMutation to set up the signing mutation', () => {
    renderHook(() => useAssinarAvisoFerias());
    expect(mockUseMutation).toHaveBeenCalledWith(
      expect.objectContaining({ mutationFn: expect.any(Function) })
    );
  });

  it('invalidates ferias queries on mutation success', () => {
    let capturedOnSuccess: Function;
    mockUseMutation.mockImplementation(({ onSuccess }: any) => {
      capturedOnSuccess = onSuccess;
      return { mutateAsync: vi.fn(), isPending: false };
    });
    renderHook(() => useAssinarAvisoFerias());
    capturedOnSuccess!();
    expect(mockInvalidate).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['ferias'] })
    );
  });

  it('isSigning is false by default', () => {
    const { result } = renderHook(() => useAssinarAvisoFerias());
    expect(result.current.isSigning).toBe(false);
  });
});
