import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSystemHealth } from '../useSystemHealth';

const mockFrom = vi.fn();
const mockGetSession = vi.fn();
const mockInvoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: { getSession: () => mockGetSession() },
    functions: { invoke: (...args: any[]) => mockInvoke(...args) },
  },
}));

function makeFromChain(error: any = null) {
  return {
    select: () => ({
      limit: () => ({
        maybeSingle: () => Promise.resolve({ data: null, error }),
      }),
    }),
  };
}

describe('useSystemHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(performance, 'now').mockReturnValue(0);
    mockFrom.mockReturnValue(makeFromChain(null));
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockInvoke.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns initial status as online', () => {
    const { result } = renderHook(() => useSystemHealth());
    expect(result.current.status).toBe('online');
  });

  it('returns initial latency as null', () => {
    const { result } = renderHook(() => useSystemHealth());
    expect(result.current.latency).toBeNull();
  });

  it('sets latency after health check', async () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(120);

    const { result } = renderHook(() => useSystemHealth());

    await waitFor(() => {
      expect(result.current.latency).not.toBeNull();
    });
  });

  it('stays online when ping succeeds with no session', async () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(100);

    const { result } = renderHook(() => useSystemHealth());

    await waitFor(() => {
      expect(result.current.latency).not.toBeNull();
    });

    expect(result.current.status).toBe('online');
  });

  it('sets status to offline when DB ping throws', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('connection refused');
    });

    const { result } = renderHook(() => useSystemHealth());

    await waitFor(() => {
      expect(result.current.status).toBe('offline');
    });
  });

  it('fetches metrics when session exists', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    mockInvoke.mockResolvedValue({
      data: { monitoring: { success_rate: 98, avg_latency: 80, recent_failures: 0 } },
      error: null,
    });
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(100);

    const { result } = renderHook(() => useSystemHealth());

    await waitFor(() => {
      expect(result.current.metrics).not.toBeNull();
    });

    expect(result.current.metrics?.success_rate).toBe(98);
  });

  it('sets status to slow when success_rate drops below 90%', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    mockInvoke.mockResolvedValue({
      data: { monitoring: { success_rate: 80, avg_latency: 100, recent_failures: 5 } },
      error: null,
    });
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(100);

    const { result } = renderHook(() => useSystemHealth());

    await waitFor(() => {
      expect(result.current.status).toBe('slow');
    });
  });

  it('returns null metrics initially', () => {
    const { result } = renderHook(() => useSystemHealth());
    expect(result.current.metrics).toBeNull();
  });
});
