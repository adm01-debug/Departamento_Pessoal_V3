import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cn, truncate, capitalize, debounce, formatBytes, sleep } from '../utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('deduplicates tailwind classes (tw-merge)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('filters falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });
});

describe('truncate', () => {
  it('returns string unchanged when shorter than length', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('returns string unchanged when exactly at length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('truncates and appends ellipsis when over length', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
  });
});

describe('capitalize', () => {
  it('capitalizes first letter and lowercases rest', () => {
    expect(capitalize('hELLO')).toBe('Hello');
  });

  it('handles all-lower input', () => {
    expect(capitalize('world')).toBe('World');
  });

  it('handles single char', () => {
    expect(capitalize('a')).toBe('A');
  });
});

describe('formatBytes', () => {
  it('returns "0 Bytes" for 0', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 Bytes');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
  });

  it('respects decimals parameter', () => {
    expect(formatBytes(1536, 1)).toBe('1.5 KB');
  });
});

describe('sleep', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('resolves after specified ms', async () => {
    const p = sleep(1000);
    vi.advanceTimersByTime(1000);
    await expect(p).resolves.toBeUndefined();
  });
});

describe('debounce', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('calls fn after delay', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);
    debouncedFn('arg1');
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledWith('arg1');
  });

  it('resets timer on repeated calls', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);
    debouncedFn('a');
    vi.advanceTimersByTime(200);
    debouncedFn('b');
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('b');
  });
});
