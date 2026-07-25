import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockGetSession, mockRefreshSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn().mockResolvedValue({
    data: { session: { expires_at: Math.floor(Date.now() / 1000) + 400 } },
  }),
  mockRefreshSession: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: mockGetSession, refreshSession: mockRefreshSession },
  },
}));

import { useSecureVisibility } from '../useSecureVisibility';

describe('useSecureVisibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds visibilitychange listener on mount', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    renderHook(() => useSecureVisibility());
    expect(addSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('removes visibilitychange listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useSecureVisibility());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('refreshes session when tab becomes visible with expiring token', async () => {
    const nearExpiry = Math.floor(Date.now() / 1000) + 200; // <5 min
    mockGetSession.mockResolvedValue({
      data: { session: { expires_at: nearExpiry } },
    });

    renderHook(() => useSecureVisibility());

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible', configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await vi.waitFor(() => expect(mockGetSession).toHaveBeenCalled());
    await vi.waitFor(() => expect(mockRefreshSession).toHaveBeenCalled());
  });

  it('does not refresh when session has plenty of time left', async () => {
    const farExpiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    mockGetSession.mockResolvedValue({
      data: { session: { expires_at: farExpiry } },
    });

    renderHook(() => useSecureVisibility());

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible', configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await vi.waitFor(() => expect(mockGetSession).toHaveBeenCalled());
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  it('returns undefined (renders without error)', () => {
    const { result } = renderHook(() => useSecureVisibility());
    expect(result.current).toBeUndefined();
  });
});
