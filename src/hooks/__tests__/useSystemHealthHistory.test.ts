import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockMaybeSingle } = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  },
}));

import { useSystemHealthHistory } from '../useSystemHealthHistory';

describe('useSystemHealthHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockMaybeSingle.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial empty samples array', () => {
    mockMaybeSingle.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useSystemHealthHistory());
    expect(result.current.samples).toEqual([]);
  });

  it('returns null p95 and avg when no samples', () => {
    mockMaybeSingle.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useSystemHealthHistory());
    expect(result.current.p95).toBeNull();
    expect(result.current.avg).toBeNull();
  });

  it('returns 0 failRate when no samples', () => {
    mockMaybeSingle.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useSystemHealthHistory());
    expect(result.current.failRate).toBe(0);
  });

  it('adds a sample when health check resolves (online)', async () => {
    mockMaybeSingle.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useSystemHealthHistory(60_000));
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.samples.length).toBeGreaterThan(0);
    const sample = result.current.last;
    expect(sample?.status).toBe('online');
  });

  it('marks sample as offline when error occurs', async () => {
    mockMaybeSingle.mockResolvedValue({ error: { message: 'DB down' } });
    const { result } = renderHook(() => useSystemHealthHistory(60_000));
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.last?.status).toBe('offline');
  });

  it('caps samples to keep limit', async () => {
    const keep = 3;
    mockMaybeSingle.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useSystemHealthHistory(1_000, keep));
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(1_000);
      }
    });
    expect(result.current.samples.length).toBeLessThanOrEqual(keep);
  });

  it('exposes last sample', async () => {
    mockMaybeSingle.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useSystemHealthHistory(60_000));
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.last).toBeDefined();
    expect(result.current.last?.at).toBeTypeOf('number');
  });
});
