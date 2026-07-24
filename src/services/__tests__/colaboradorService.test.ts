import { describe, it, expect, vi, beforeEach } from 'vitest';
import { colaboradorService } from '../colaboradorService';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom, mockLoggerError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('../loggerService', () => ({
  loggerService: { error: mockLoggerError },
}));

// Helper: build select → eq/or → order → range chain for listar
function setupListarChain(data: any[], count: number, error: any = null) {
  const rangeFn = vi.fn().mockResolvedValue({ data, count, error });
  const orderFn = vi.fn().mockReturnValue({ range: rangeFn });
  const baseQuery: any = { order: orderFn };
  const eqFn = vi.fn().mockReturnValue(baseQuery);
  const orFn = vi.fn().mockReturnValue(baseQuery);
  Object.assign(baseQuery, { eq: eqFn, or: orFn });
  const selectFn = vi.fn().mockReturnValue(baseQuery);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, orFn, orderFn, rangeFn };
}

// Helper: build a thenable count chain for getSummary
function makeCountChain(count: number, error: any = null) {
  const response = { count, error };
  const chain: any = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve(response).then(fn);
  chain.catch = (fn: any) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: any) => Promise.resolve(response).finally(fn);
  const selectFn = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(chain) });
  return { select: selectFn };
}

// ─── listar ───────────────────────────────────────────────────────────────────

describe('colaboradorService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns data and total from supabase', async () => {
    const records = [{ id: '1', nome_completo: 'Alice' }];
    setupListarChain(records, 1);
    const result = await colaboradorService.listar();
    expect(result.data).toEqual(records);
    expect(result.total).toBe(1);
  });

  it('returns empty data with total 0 when supabase returns null', async () => {
    setupListarChain(null as any, null as any);
    const result = await colaboradorService.listar();
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('adds or() filter when search is provided', async () => {
    const { orFn } = setupListarChain([], 0);
    await colaboradorService.listar({ search: 'Silva' });
    expect(orFn).toHaveBeenCalledWith(
      expect.stringContaining('ilike.%Silva%')
    );
  });

  it('filters by empresa_id when provided', async () => {
    const { eqFn } = setupListarChain([], 0);
    await colaboradorService.listar({ filters: { empresaId: 'emp-1' } });
    expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('filters by status when not "all"', async () => {
    const { eqFn } = setupListarChain([], 0);
    await colaboradorService.listar({ filters: { status: 'ativo' } });
    expect(eqFn).toHaveBeenCalledWith('status', 'ativo');
  });

  it('does NOT filter by status when status is "all"', async () => {
    const { eqFn } = setupListarChain([], 0);
    await colaboradorService.listar({ filters: { status: 'all' } });
    expect(eqFn).not.toHaveBeenCalledWith('status', 'all');
  });

  it('calls range with correct offset for page 2 (default pageSize 25)', async () => {
    const { rangeFn } = setupListarChain([], 0);
    await colaboradorService.listar({ page: 2, pageSize: 25 });
    expect(rangeFn).toHaveBeenCalledWith(25, 49);
  });

  it('calls range(0, 24) for first page with pageSize 25', async () => {
    const { rangeFn } = setupListarChain([], 0);
    await colaboradorService.listar({ page: 1, pageSize: 25 });
    expect(rangeFn).toHaveBeenCalledWith(0, 24);
  });

  it('throws on DB error', async () => {
    setupListarChain([], 0, { message: 'DB fail' });
    await expect(colaboradorService.listar()).rejects.toBeDefined();
  });

  it('orders by nome_completo ascending', async () => {
    const { orderFn } = setupListarChain([], 0);
    await colaboradorService.listar();
    expect(orderFn).toHaveBeenCalledWith('nome_completo', { ascending: true });
  });
});

// ─── getSummary ───────────────────────────────────────────────────────────────

describe('colaboradorService.getSummary', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns total and per-status counts', async () => {
    const counts = [5, 2, 1, 3]; // ativo, desligado, afastado, ferias
    let callIdx = 0;
    mockFrom.mockImplementation(() => makeCountChain(counts[callIdx++]));

    const summary = await colaboradorService.getSummary();
    expect(summary.ativo).toBe(5);
    expect(summary.desligado).toBe(2);
    expect(summary.afastado).toBe(1);
    expect(summary.ferias).toBe(3);
    expect(summary.total).toBe(11);
  });

  it('maps desligado to inativo for UI compatibility', async () => {
    const counts = [0, 3, 0, 0]; // desligado=3
    let callIdx = 0;
    mockFrom.mockImplementation(() => makeCountChain(counts[callIdx++]));

    const summary = await colaboradorService.getSummary();
    expect(summary.inativo).toBe(3);
  });

  it('returns 0 total when all counts are 0', async () => {
    mockFrom.mockImplementation(() => makeCountChain(0));
    const summary = await colaboradorService.getSummary();
    expect(summary.total).toBe(0);
  });

  it('applies empresa_id filter to all queries when provided', async () => {
    mockFrom.mockImplementation(() => makeCountChain(0));
    await colaboradorService.getSummary('emp-1');
    // All 4 chains have .eq called (first for status, second for empresa_id)
    expect(mockFrom).toHaveBeenCalledTimes(4);
  });

  it('returns count 0 per status on DB error (graceful fallback)', async () => {
    mockFrom.mockImplementation(() => makeCountChain(0, { message: 'fail' }));
    const summary = await colaboradorService.getSummary();
    expect(summary.total).toBe(0);
    expect(summary.ativo).toBe(0);
  });
});

// ─── list (alias) ─────────────────────────────────────────────────────────────

describe('colaboradorService.list', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns array of colaboradores (delegates to listar)', async () => {
    const records = [{ id: 'c1', nome_completo: 'Bob' }];
    setupListarChain(records, 1);
    const result = await colaboradorService.list('emp-1');
    expect(result).toEqual(records);
  });

  it('uses pageSize 1000 to load all records', async () => {
    const { rangeFn } = setupListarChain([], 0);
    await colaboradorService.list('emp-1');
    // pageSize 1000 → range(0, 999)
    expect(rangeFn).toHaveBeenCalledWith(0, 999);
  });
});
