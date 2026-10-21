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
    localStorage.clear();
    sessionStorage.clear();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignOut.mockResolvedValue({});
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
    await vi.advanceTimersByTimeAsync(60_000);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('expira a sessão sem apagar dados locais e limpa só o token do Supabase', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    localStorage.setItem('sb-frjbfeamybqsejlvmqbl-auth-token', 'token');
    localStorage.setItem('dp-desempenho-demo-registros', 'dados-demo');
    localStorage.setItem('ponto_offline_queue', 'fila-offline');
    localStorage.setItem('ui-theme', 'dark');

    renderHook(() => useSessionTimeout());
    await vi.advanceTimersByTimeAsync(31 * 60 * 1000);

    expect(mockSignOut).toHaveBeenCalled();
    expect(localStorage.getItem('sb-frjbfeamybqsejlvmqbl-auth-token')).toBeNull();
    expect(localStorage.getItem('dp-desempenho-demo-registros')).toBe('dados-demo');
    expect(localStorage.getItem('ponto_offline_queue')).toBe('fila-offline');
    expect(localStorage.getItem('ui-theme')).toBe('dark');
  });

  it('não expira a sessão quando outra aba registra atividade recente', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });

    renderHook(() => useSessionTimeout());
    await vi.advanceTimersByTimeAsync(25 * 60 * 1000);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'dp_last_activity_at',
        newValue: String(Date.now()),
      })
    );
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('returns undefined (renders without error)', () => {
    const { result } = renderHook(() => useSessionTimeout());
    expect(result.current).toBeUndefined();
  });
});
