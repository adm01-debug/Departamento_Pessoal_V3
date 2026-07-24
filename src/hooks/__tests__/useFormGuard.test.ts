import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFormGuard } from '../useFormGuard';

function makeBeforeUnloadEvent() {
  const e = new Event('beforeunload') as BeforeUnloadEvent;
  Object.defineProperty(e, 'preventDefault', { value: vi.fn(), writable: true });
  Object.defineProperty(e, 'returnValue', { value: '', writable: true });
  return e;
}

describe('useFormGuard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('adds beforeunload listener on mount', () => {
    const spy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useFormGuard(false));
    expect(spy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('removes listener on unmount', () => {
    const spy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useFormGuard(false));
    unmount();
    expect(spy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('does NOT block navigation when isDirty is false', () => {
    renderHook(() => useFormGuard(false));
    const e = makeBeforeUnloadEvent();
    window.dispatchEvent(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it('calls preventDefault when isDirty is true', () => {
    renderHook(() => useFormGuard(true));
    const e = makeBeforeUnloadEvent();
    window.dispatchEvent(e);
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('sets returnValue to the default message when isDirty is true', () => {
    renderHook(() => useFormGuard(true));
    const e = makeBeforeUnloadEvent();
    window.dispatchEvent(e);
    expect(e.returnValue).toBe('Você tem alterações não salvas. Deseja realmente sair?');
  });

  it('uses custom message when provided', () => {
    const msg = 'Dados não salvos!';
    renderHook(() => useFormGuard(true, msg));
    const e = makeBeforeUnloadEvent();
    window.dispatchEvent(e);
    expect(e.returnValue).toBe(msg);
  });

  it('removes previous listener and adds new one when isDirty changes', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { rerender } = renderHook(({ dirty }) => useFormGuard(dirty), {
      initialProps: { dirty: false },
    });

    rerender({ dirty: true });

    expect(removeSpy).toHaveBeenCalled();
    expect(addSpy).toHaveBeenCalledTimes(2);
  });
});
