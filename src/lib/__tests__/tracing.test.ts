import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateTraceId, getTraceId, tracedFetch, withTrace, withTraceId } from '../tracing';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('tracing', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('getTraceId persiste no sessionStorage e reutiliza', () => {
    const id1 = getTraceId();
    const id2 = getTraceId();
    expect(id1).toMatch(UUID_RE);
    expect(id2).toBe(id1);
    expect(sessionStorage.getItem('dp_trace_id')).toBe(id1);
  });

  it('generateTraceId gera UUID novo a cada chamada (sem persistir)', () => {
    const a = generateTraceId();
    const b = generateTraceId();
    expect(a).toMatch(UUID_RE);
    expect(b).toMatch(UUID_RE);
    expect(a).not.toBe(b);
    expect(sessionStorage.getItem('dp_trace_id')).toBeNull();
  });

  it('withTraceId injeta trace_id no body sem mutar o original', () => {
    const body = { empresa_id: 'e1' };
    const out = withTraceId(body);
    expect(out.trace_id).toMatch(UUID_RE);
    expect(body).not.toHaveProperty('trace_id');
  });

  it('tracedFetch mescla body (string ou objeto) com trace_id e força JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);

    await tracedFetch('https://x/fn', { method: 'POST', body: JSON.stringify({ a: 1 }) });
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.a).toBe(1);
    expect(sent.trace_id).toMatch(UUID_RE);
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      'Content-Type': 'application/json',
    });

    // body já objeto (não-string) também é mesclado
    await tracedFetch('https://x/fn', { body: { b: 2 } });
    const sent2 = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect(sent2.b).toBe(2);
    expect(sent2.trace_id).toBeTruthy();
  });

  it('withTrace passa o traceId para a fn e relança erro com log', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const got = await withTrace(async (id) => `ok-${id.length}`, 'trace-fixo');
    expect(got).toBe('ok-10');

    await expect(
      withTrace(async () => {
        throw new Error('falhou');
      }, 'trace-fixo')
    ).rejects.toThrow('falhou');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('trace-fixo'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('falhou'));
  });
});
