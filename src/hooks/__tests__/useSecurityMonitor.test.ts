import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockOnAuthStateChange, mockSignOut } = vi.hoisted(() => {
  const mockOnAuthStateChange = vi.fn().mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  const mockSignOut = vi.fn().mockResolvedValue({});
  return { mockOnAuthStateChange, mockSignOut };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { onAuthStateChange: mockOnAuthStateChange, signOut: mockSignOut },
  },
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: { clear: vi.fn() },
}));

import { useSecurityMonitor } from '../useSecurityMonitor';

describe('useSecurityMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('subscribes to auth state changes on mount', () => {
    renderHook(() => useSecurityMonitor());
    expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
  });

  it('unsubscribes on unmount', () => {
    const unsubscribe = vi.fn();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });
    const { unmount } = renderHook(() => useSecurityMonitor());
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('does nothing when session has no user', () => {
    let capturedCallback: Function;
    mockOnAuthStateChange.mockImplementation((cb: Function) => {
      capturedCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    renderHook(() => useSecurityMonitor());
    capturedCallback!('SIGNED_OUT', null);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('stores session fingerprint on first auth', () => {
    let capturedCallback: Function;
    mockOnAuthStateChange.mockImplementation((cb: Function) => {
      capturedCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    renderHook(() => useSecurityMonitor());
    capturedCallback!('SIGNED_IN', { user: { id: 'user-1' } });
    expect(sessionStorage.getItem('dp_session_fp')).toBeTruthy();
  });

  it('returns undefined (renders without error)', () => {
    const { result } = renderHook(() => useSecurityMonitor());
    expect(result.current).toBeUndefined();
  });
});
