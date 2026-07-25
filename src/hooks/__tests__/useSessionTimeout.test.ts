import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockGetSession, mockSignOut } = vi.hoisted(() => ({
  mockGetSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  mockSignOut: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: mockGetSession, signOut: mockSignOut },
  },
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: { clear: vi.fn() },
}));

import { useSessionTimeout } from '../useSessionTimeout';

describe('useSessionTimeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers activity event listeners on mount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useSessionTimeout());
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    for (const evt of activityEvents) {
      expect(addSpy).toHaveBeenCalledWith(evt, expect.any(Function), { passive: true });
    }
  });

  it('removes event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useSessionTimeout());
    unmount();
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    for (const evt of activityEvents) {
      expect(removeSpy).toHaveBeenCalledWith(evt, expect.any(Function));
    }
  });

  it('does not call signOut if session is null when interval fires', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderHook(() => useSessionTimeout());
    vi.advanceTimersByTime(31 * 60 * 1000); // > 30min inactivity
    await vi.runAllTimersAsync();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('returns undefined (renders without error)', () => {
    const { result } = renderHook(() => useSessionTimeout());
    expect(result.current).toBeUndefined();
  });
});
