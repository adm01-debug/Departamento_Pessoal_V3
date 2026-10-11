import { describe, expect, it } from 'vitest';
import { toError, toErrorMessage } from '../toError';

describe('toError / toErrorMessage', () => {
  it('devolve a própria instância de Error', () => {
    const e = new Error('x');
    expect(toError(e)).toBe(e);
  });

  it('string vira Error com a mensagem', () => {
    expect(toError('falhou').message).toBe('falhou');
  });

  it('objeto com .message string usa a mensagem', () => {
    expect(toError({ message: 'm1' }).message).toBe('m1');
  });

  it('objeto sem .message serializa para JSON; não-serializável cai em String()', () => {
    expect(toError({ a: 1 }).message).toBe('{"a":1}');
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(toError(circular).message).toContain('[object Object]');
  });

  it('toErrorMessage nunca lança e sempre retorna string', () => {
    expect(() => toErrorMessage(undefined)).not.toThrow();
    expect(() => toErrorMessage(null)).not.toThrow();
    expect(() => toErrorMessage(Symbol('s'))).not.toThrow();
    expect(typeof toErrorMessage(undefined)).toBe('string');
    expect(toErrorMessage('falhou')).toBe('falhou');
  });
});
