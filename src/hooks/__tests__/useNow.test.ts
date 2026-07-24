import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNow } from '../useNow';

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a number (timestamp)', () => {
    const { result } = renderHook(() => useNow());
    expect(typeof result.current).toBe('number');
    expect(result.current).toBeGreaterThan(0);
  });

  it('initial value is close to Date.now()', () => {
    const before = Date.now();
    const { result } = renderHook(() => useNow());
    const after = Date.now();
    expect(result.current).toBeGreaterThanOrEqual(before);
    expect(result.current).toBeLessThanOrEqual(after);
  });

  it('updates after the default interval (60s)', () => {
    const { result } = renderHook(() => useNow());
    const initial = result.current;

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current).toBeGreaterThan(initial);
  });

  it('does not update before the interval elapses', () => {
    const { result } = renderHook(() => useNow());
    const initial = result.current;

    act(() => {
      vi.advanceTimersByTime(59_999);
    });

    expect(result.current).toBe(initial);
  });

  it('respects a custom interval', () => {
    const { result } = renderHook(() => useNow(5_000));
    const initial = result.current;

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(result.current).toBeGreaterThan(initial);
  });

  it('clears the interval on unmount', () => {
    const { result, unmount } = renderHook(() => useNow());
    const initial = result.current;

    unmount();

    act(() => {
      vi.advanceTimersByTime(120_000);
    });

    expect(result.current).toBe(initial);
  });

  it('updates multiple times over multiple intervals', () => {
    const { result } = renderHook(() => useNow(10_000));
    const initial = result.current;

    act(() => { vi.advanceTimersByTime(10_000); });
    const after1 = result.current;

    act(() => { vi.advanceTimersByTime(10_000); });
    const after2 = result.current;

    expect(after1).toBeGreaterThan(initial);
    expect(after2).toBeGreaterThan(after1);
  });
});
