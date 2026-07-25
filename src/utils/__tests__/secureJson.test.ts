import { describe, it, expect } from 'vitest';
import { secureJsonParse } from '../secureJson';

describe('secureJsonParse', () => {
  it('parses simple valid JSON', () => {
    const result = secureJsonParse<{ a: number }>('{"a": 1}');
    expect(result).toEqual({ a: 1 });
  });

  it('parses JSON arrays', () => {
    const result = secureJsonParse<number[]>('[1,2,3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('strips __proto__ keys to prevent prototype pollution', () => {
    const json = '{"__proto__": {"isAdmin": true}, "name": "test"}';
    const result = secureJsonParse<Record<string, unknown>>(json);
    expect(result.__proto__).toBeUndefined();
    expect(result.name).toBe('test');
  });

  it('strips constructor keys', () => {
    const json = '{"constructor": {"name": "hacked"}, "id": 1}';
    const result = secureJsonParse<Record<string, unknown>>(json);
    expect('constructor' in result).toBe(false);
    expect(result.id).toBe(1);
  });

  it('strips prototype keys', () => {
    const json = '{"prototype": {"polluted": true}, "safe": "value"}';
    const result = secureJsonParse<Record<string, unknown>>(json);
    expect('prototype' in result).toBe(false);
    expect(result.safe).toBe('value');
  });

  it('strips dangerous keys nested in arrays', () => {
    const json = '[{"__proto__": {"evil": true}, "ok": 1}]';
    const result = secureJsonParse<Record<string, unknown>[]>(json);
    expect(result[0].__proto__).toBeUndefined();
    expect(result[0].ok).toBe(1);
  });

  it('preserves nested safe objects', () => {
    const json = '{"user": {"id": 42, "name": "Alice"}}';
    const result = secureJsonParse<{ user: { id: number; name: string } }>(json);
    expect(result.user.id).toBe(42);
    expect(result.user.name).toBe('Alice');
  });

  it('throws on invalid JSON', () => {
    expect(() => secureJsonParse('{invalid')).toThrow();
  });

  it('handles null JSON value', () => {
    const result = secureJsonParse<null>('null');
    expect(result).toBeNull();
  });

  it('handles primitive string JSON', () => {
    const result = secureJsonParse<string>('"hello"');
    expect(result).toBe('hello');
  });
});
