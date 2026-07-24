import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update value before delay elapses', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 300 },
    });

    rerender({ value: 'updated', delay: 300 });
    act(() => { vi.advanceTimersByTime(200); });

    expect(result.current).toBe('initial');
  });

  it('updates value after delay elapses', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 300 },
    });

    rerender({ value: 'updated', delay: 300 });
    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current).toBe('updated');
  });

  it('resets timer when value changes before delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'a', delay: 300 },
    });

    rerender({ value: 'b', delay: 300 });
    act(() => { vi.advanceTimersByTime(200); });

    rerender({ value: 'c', delay: 300 });
    act(() => { vi.advanceTimersByTime(200); });

    // Only 200ms since last change — still should not have updated
    expect(result.current).toBe('a');

    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('c');
  });

  it('works with number values', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 0, delay: 500 },
    });

    rerender({ value: 42, delay: 500 });
    act(() => { vi.advanceTimersByTime(500); });

    expect(result.current).toBe(42);
  });

  it('works with object values', () => {
    const initial = { a: 1 };
    const updated = { a: 2 };

    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: initial, delay: 200 },
    });

    rerender({ value: updated, delay: 200 });
    act(() => { vi.advanceTimersByTime(200); });

    expect(result.current).toEqual({ a: 2 });
  });

  it('respects different delay values', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'a', delay: 100 },
    });

    rerender({ value: 'b', delay: 100 });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('b');

    rerender({ value: 'c', delay: 1000 });
    act(() => { vi.advanceTimersByTime(999); });
    expect(result.current).toBe('b');

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('c');
  });

  it('clears timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { rerender, unmount } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'a', delay: 300 },
    });

    rerender({ value: 'b', delay: 300 });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
