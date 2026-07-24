import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdempotencyKey } from '../useIdempotencyKey';

describe('useIdempotencyKey', () => {
  it('returns a string key for an intent', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const k = result.current.key('op1');
    expect(typeof k).toBe('string');
    expect(k.length).toBeGreaterThan(0);
  });

  it('returns the same key for the same intent on repeated calls', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const k1 = result.current.key('op1');
    const k2 = result.current.key('op1');
    expect(k1).toBe(k2);
  });

  it('returns different keys for different intents', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const k1 = result.current.key('op1');
    const k2 = result.current.key('op2');
    expect(k1).not.toBe(k2);
  });

  it('generates a new key after reset', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const k1 = result.current.key('op1');

    act(() => {
      result.current.reset('op1');
    });

    const k2 = result.current.key('op1');
    expect(k2).not.toBe(k1);
  });

  it('only resets the specified intent', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const k1 = result.current.key('op1');
    const k2 = result.current.key('op2');

    act(() => {
      result.current.reset('op1');
    });

    const k1After = result.current.key('op1');
    const k2After = result.current.key('op2');
    expect(k1After).not.toBe(k1);
    expect(k2After).toBe(k2);
  });

  it('resetAll clears all keys', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const k1 = result.current.key('op1');
    const k2 = result.current.key('op2');

    act(() => {
      result.current.resetAll();
    });

    const k1After = result.current.key('op1');
    const k2After = result.current.key('op2');
    expect(k1After).not.toBe(k1);
    expect(k2After).not.toBe(k2);
  });

  it('key is alphanumeric (no dashes)', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const k = result.current.key('test-intent');
    expect(k).toMatch(/^[a-z0-9]+$/i);
  });

  it('key length is at most 32 characters', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const k = result.current.key('long-intent');
    expect(k.length).toBeLessThanOrEqual(32);
  });
});
