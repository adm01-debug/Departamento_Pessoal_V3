import { beforeEach, describe, expect, it, vi } from 'vitest';

// Ver comentário em idempotency.test.ts: o setup global mocka este módulo;
// aqui precisamos da implementação real de callBridge/createQueryBuilder.
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key');
vi.stubEnv('VITE_SUPABASE_FUNCTIONS_BASE', 'https://test.supabase.co/functions/v1');

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/services/loggerService', () => ({
  loggerService: { error: vi.fn(), warn: vi.fn() },
}));

const { supabase, supabaseBase } = await vi.importActual<typeof import('../client')>('../client');
const { toast } = await import('sonner');

const BRIDGE_URL = 'https://test.supabase.co/functions/v1/external-db-bridge';

function okJson(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
function errJson(body: unknown, status = 400) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function lastFetchBody(fetchMock: ReturnType<typeof vi.fn>) {
  return JSON.parse((fetchMock.mock.calls.at(-1)?.[1]?.body as string) ?? '{}');
}

describe('client.ts — callBridge via query builder', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchMock = vi.fn(async () => okJson({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);
    // Sem sessão por padrão: reads passam com anon key; writes abortam cedo.
    vi.spyOn(supabaseBase.auth, 'getSession').mockResolvedValue({
      data: { session: null },
      error: null,
    } as Awaited<ReturnType<typeof supabaseBase.auth.getSession>>);
  });

  it('select serializa action/table/filters/order/limit no body do bridge', async () => {
    fetchMock.mockResolvedValue(okJson({ data: [{ id: 1 }] }));
    const res = await supabase
      .from('colaboradores')
      .select('id,nome')
      .eq('empresa_id', 'e1')
      .gt('idade', 18)
      .order('nome', { ascending: false })
      .limit(10);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(BRIDGE_URL);
    const body = lastFetchBody(fetchMock);
    expect(body.action).toBe('select');
    expect(body.table).toBe('colaboradores');
    expect(body.columns).toBe('id,nome');
    expect(body.filters).toEqual([
      { column: 'empresa_id', op: 'eq', value: 'e1' },
      { column: 'idade', op: 'gt', value: 18 },
    ]);
    expect(body.order).toEqual({ column: 'nome', ascending: false });
    expect(body.limit).toBe(10);
    expect(res.data).toEqual([{ id: 1 }]);
    expect(res.error).toBeNull();
  });

  it('filtro com valor "all" é ignorado (listagem completa)', async () => {
    await supabase.from('t').select().eq('departamento', 'all').eq('empresa_id', 'e1');
    const body = lastFetchBody(fetchMock);
    expect(body.filters).toEqual([{ column: 'empresa_id', op: 'eq', value: 'e1' }]);
  });

  it('ilike vazio e string "null" viram comportamento correto', async () => {
    await supabase.from('t').select().ilike('nome', '').eq('pai', 'null').eq('ativo', true);
    const body = lastFetchBody(fetchMock);
    // ilike '' descartado; 'null' string → null real
    expect(body.filters).toEqual([
      { column: 'pai', op: 'eq', value: null },
      { column: 'ativo', op: 'eq', value: true },
    ]);
  });

  it('or() e match() acumulam filtros', async () => {
    await supabase.from('t').select().match({ a: 1, b: 2 }).or('c.eq.3,d.eq.4');
    const body = lastFetchBody(fetchMock);
    expect(body.filters).toEqual([
      { column: 'a', op: 'eq', value: 1 },
      { column: 'b', op: 'eq', value: 2 },
      { column: '', op: 'or', value: 'c.eq.3,d.eq.4' },
    ]);
  });

  it('range(a,b) vira offset+limit e select count vira countMode', async () => {
    await supabase.from('t').select('*', { count: 'exact' }).range(20, 39);
    const body = lastFetchBody(fetchMock);
    expect(body.offset).toBe(20);
    expect(body.limit).toBe(20);
    expect(body.countMode).toBe('exact');
  });

  it('single pega o primeiro elemento do array retornado', async () => {
    fetchMock.mockResolvedValue(okJson({ data: [{ id: 'x' }, { id: 'y' }] }));
    const res = await supabase.from('t').select().eq('id', 'x').single();
    expect(res.data).toEqual({ id: 'x' });
  });

  it('write sem sessão aborta antes do fetch ("Sessão inválida")', async () => {
    const res = await supabase.from('t').insert({ a: 1 });
    expect(res.error?.message).toMatch(/Sessão inválida/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('write com sessão envia Bearer do JWT e Idempotency-Key', async () => {
    vi.spyOn(supabaseBase.auth, 'getSession').mockResolvedValue({
      data: { session: { access_token: 'jwt-123' } },
      error: null,
    } as Awaited<ReturnType<typeof supabaseBase.auth.getSession>>);
    fetchMock.mockResolvedValue(okJson({ data: [{ id: 1 }] }));

    await supabase.from('t').insert({ a: 1 });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer jwt-123');
    expect(headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(lastFetchBody(fetchMock).action).toBe('insert');
  });

  it('erro do bridge vira {message} e dispara toast (exceto objeto ausente)', async () => {
    fetchMock.mockResolvedValue(errJson({ error: 'permission denied' }));
    const res = await supabase.from('t').select();
    expect(res.error?.message).toBe('permission denied');
    expect(toast.error).toHaveBeenCalled();

    vi.mocked(toast.error).mockClear();
    fetchMock.mockResolvedValue(
      errJson({ error: { code: 'PGRST205', message: 'Could not find the table x in the schema cache' } })
    );
    const res2 = await supabase.from('x').select();
    // erro-objeto normalizado para string; "schema cache" suprime o toast
    expect(res2.error?.message).toMatch(/Could not find the table/);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('rpc vai para action=rpc com fn/params (sem table)', async () => {
    vi.spyOn(supabaseBase.auth, 'getSession').mockResolvedValue({
      data: { session: { access_token: 'jwt' } },
      error: null,
    } as Awaited<ReturnType<typeof supabaseBase.auth.getSession>>);
    fetchMock.mockResolvedValue(okJson({ data: true }));
    await supabase.rpc('is_admin', { _e: 'e1' });
    const body = lastFetchBody(fetchMock);
    expect(body.action).toBe('rpc');
    expect(body.fn).toBe('is_admin');
    expect(body.params).toEqual({ _e: 'e1' });
    expect(body.table).toBeUndefined();
  });

  it('falha de rede vira mensagem amigável + toast', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const res = await supabase.from('t').select();
    expect(res.error?.message).toMatch(/conexão com o banco/);
    expect(toast.error).toHaveBeenCalled();
  });
});
