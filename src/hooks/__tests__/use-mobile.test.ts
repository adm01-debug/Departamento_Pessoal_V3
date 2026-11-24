import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIsMobile } from '../use-mobile';

describe('useIsMobile', () => {
  const originalMatchMedia = window.matchMedia;
  const originalInnerWidth = window.innerWidth;

  function mockMatchMedia(matches: boolean) {
    const listeners: ((e: MediaQueryListEvent) => void)[] = [];
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches,
        addEventListener: vi.fn((event: string, fn: any) => listeners.push(fn)),
        removeEventListener: vi.fn(),
      }),
    });
    return listeners;
  }

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: originalMatchMedia });
    Object.defineProperty(window, 'innerWidth', { writable: true, value: originalInnerWidth });
  });

  it('returns true when window.innerWidth < 768', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });
    mockMatchMedia(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false when window.innerWidth >= 768', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
    mockMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns a boolean', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 500 });
    mockMatchMedia(true);
    const { result } = renderHook(() => useIsMobile());
    expect(typeof result.current).toBe('boolean');
  });
});
