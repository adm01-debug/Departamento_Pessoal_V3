import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { parseLockoutState } from './lockoutContract.ts';

Deno.test('lockout contract aceita somente o resultado completo e único da RPC', () => {
  assertEquals(parseLockoutState([{ is_locked: false, locked_until: null }]), {
    isLocked: false,
    lockedUntil: null,
  });
  assertEquals(parseLockoutState([{ is_locked: true, locked_until: '2026-09-11T15:30:00.000Z' }]), {
    isLocked: true,
    lockedUntil: '2026-09-11T15:30:00.000Z',
  });
  assertEquals(parseLockoutState([{ is_locked: true, locked_until: null }]), {
    isLocked: true,
    lockedUntil: null,
  });
});

Deno.test('lockout contract falha fechado em formatos ausentes, parciais ou contraditórios', () => {
  for (const value of [
    null,
    undefined,
    [],
    [{ is_locked: false }],
    [{ locked_until: null }],
    [{ is_locked: 'false', locked_until: null }],
    [{ is_locked: false, locked_until: '2026-09-11T15:30:00.000Z' }],
    [{ is_locked: false, locked_until: null }, { is_locked: false, locked_until: null }],
  ]) {
    assertEquals(parseLockoutState(value), null);
  }
});
