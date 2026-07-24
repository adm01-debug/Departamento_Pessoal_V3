import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns initial value when key does not exist', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('returns stored value when key exists', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('stored');
  });

  it('stores value and updates state', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 0));
    act(() => {
      result.current[1](42);
    });
    expect(result.current[0]).toBe(42);
    expect(JSON.parse(localStorage.getItem('test-key')!)).toBe(42);
  });

  it('supports functional updater', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0));
    act(() => {
      result.current[1]((prev) => prev + 10);
    });
    expect(result.current[0]).toBe(10);
  });

  it('removes value and resets to initial', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[2]();
    });

    expect(result.current[0]).toBe('initial');
    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('handles complex object values', () => {
    const obj = { name: 'João', age: 30 };
    const { result } = renderHook(() => useLocalStorage<typeof obj | null>('obj-key', null));

    act(() => {
      result.current[1](obj);
    });

    expect(result.current[0]).toEqual(obj);
  });

  it('handles array values', () => {
    const { result } = renderHook(() => useLocalStorage<number[]>('arr-key', []));

    act(() => {
      result.current[1]([1, 2, 3]);
    });

    expect(result.current[0]).toEqual([1, 2, 3]);
  });

  it('syncs across tabs via storage event', () => {
    const { result } = renderHook(() => useLocalStorage('shared-key', 'original'));

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'shared-key',
          newValue: JSON.stringify('from-other-tab'),
        })
      );
    });

    expect(result.current[0]).toBe('from-other-tab');
  });

  it('ignores storage events for different keys', () => {
    const { result } = renderHook(() => useLocalStorage('my-key', 'original'));

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'other-key',
          newValue: JSON.stringify('should-not-update'),
        })
      );
    });

    expect(result.current[0]).toBe('original');
  });

  it('falls back to initial value when stored JSON is invalid', () => {
    localStorage.setItem('bad-json', '{not valid json}');
    const { result } = renderHook(() => useLocalStorage('bad-json', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('dispatches storage event on set so sibling instances sync', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const { result } = renderHook(() => useLocalStorage('event-key', ''));

    act(() => {
      result.current[1]('new-value');
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'storage', key: 'event-key' })
    );
  });
});
