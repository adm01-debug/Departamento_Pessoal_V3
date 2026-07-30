import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSyncedState } from '@/hooks/useSyncedState';

describe('useSyncedState', () => {
  it('inicializa derivando da fonte', () => {
    const { result } = renderHook(() => useSyncedState(5, (v) => v * 2));
    expect(result.current[0]).toBe(10);
  });

  it('ressincroniza quando a fonte muda', () => {
    const { result, rerender } = renderHook(({ v }) => useSyncedState(v, (x) => x * 2), {
      initialProps: { v: 5 },
    });
    rerender({ v: 7 });
    expect(result.current[0]).toBe(14);
  });

  it('mantém alterações locais enquanto a fonte não muda', () => {
    const { result, rerender } = renderHook(({ v }) => useSyncedState(v, (x) => x), {
      initialProps: { v: 1 },
    });
    act(() => result.current[1](99));
    expect(result.current[0]).toBe(99);
    rerender({ v: 1 });
    expect(result.current[0]).toBe(99);
  });

  it('suspende a sincronização quando enabled=false', () => {
    const { result, rerender } = renderHook(
      ({ v, on }) => useSyncedState(v, (x) => x, on),
      { initialProps: { v: 1, on: false } }
    );
    rerender({ v: 2, on: false });
    expect(result.current[0]).toBe(1);
  });

  it('ressincroniza com a fonte mais recente ao reabilitar', () => {
    const { result, rerender } = renderHook(
      ({ v, on }) => useSyncedState(v, (x) => x, on),
      { initialProps: { v: 1, on: true } }
    );
    rerender({ v: 2, on: false });
    rerender({ v: 3, on: false });
    expect(result.current[0]).toBe(1);
    rerender({ v: 3, on: true });
    expect(result.current[0]).toBe(3);
  });

  it('não dispara render em cascata para fontes iguais por Object.is', () => {
    const obj = { a: 1 };
    let derives = 0;
    const { result, rerender } = renderHook(({ v }) => useSyncedState(v, (x) => { derives++; return { ...x }; }), {
      initialProps: { v: obj },
    });
    const first = result.current[0];
    rerender({ v: obj });
    expect(result.current[0]).toBe(first);
    expect(derives).toBe(1);
  });
});
