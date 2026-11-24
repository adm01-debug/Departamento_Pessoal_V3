import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOnMount } from '../useMountEffects';

describe('useOnMount', () => {
  it('executa o efeito uma única vez mesmo com rerenders', () => {
    const effect = vi.fn();
    const { rerender } = renderHook(() => useOnMount(effect));
    rerender();
    rerender();
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('roda o cleanup retornado ao desmontar', () => {
    const cleanup = vi.fn();
    const { unmount } = renderHook(() => useOnMount(() => cleanup));
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
