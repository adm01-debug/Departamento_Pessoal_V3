import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseService } from '../baseService';

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

// Concrete subclass for testing
class TestService extends BaseService<{ id: string; nome: string }> {
  constructor() {
    super('test_table', { searchColumn: 'nome', defaultOrderBy: 'nome' });
  }
}

// Helper: build a range → data/count/error chain for listar
function setupListChain(data: any[], count: number, error: any = null) {
  const rangeFn = vi.fn().mockResolvedValue({ data, count, error });
  const orderFn = vi.fn().mockReturnValue({ range: rangeFn });
  const eqFn = vi.fn();
  const ilikeFn = vi.fn();

  const baseQuery: any = { order: orderFn, eq: eqFn, ilike: ilikeFn };
  eqFn.mockReturnValue(baseQuery);
  ilikeFn.mockReturnValue(baseQuery);

  const selectFn = vi.fn().mockReturnValue(baseQuery);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, orderFn, rangeFn };
}

// Helper: build maybeSingle chain
function setupMaybeSingleChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ maybeSingle });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, maybeSingle };
}

// ─── listar ───────────────────────────────────────────────────────────────────

describe('BaseService.listar', () => {
  const service = new TestService();
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns data and total from supabase', async () => {
    const records = [{ id: '1', nome: 'Alice' }];
    setupListChain(records, 1);
    const result = await service.listar();
    expect(result.data).toEqual(records);
    expect(result.total).toBe(1);
  });

  it('returns empty data with total 0 when supabase returns null', async () => {
    setupListChain(null as any, null as any);
    const result = await service.listar();
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('queries page 2 with correct range offset', async () => {
    const { rangeFn } = setupListChain([], 0);
    await service.listar({ page: 2, pageSize: 10 });
    expect(rangeFn).toHaveBeenCalledWith(10, 19);
  });

  it('queries page 1 with default pageSize 10', async () => {
    const { rangeFn } = setupListChain([], 0);
    await service.listar({ page: 1, pageSize: 10 });
    expect(rangeFn).toHaveBeenCalledWith(0, 9);
  });

  it('throws and logs on DB error', async () => {
    setupListChain([], 0, { message: 'DB fail' });
    await expect(service.listar()).rejects.toBeDefined();
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

// ─── buscarPorId ──────────────────────────────────────────────────────────────

describe('BaseService.buscarPorId', () => {
  const service = new TestService();
  beforeEach(() => { vi.clearAllMocks(); });

  it('throws when id is empty string', async () => {
    await expect(service.buscarPorId('')).rejects.toThrow('ID é obrigatório');
  });

  it('returns data when found', async () => {
    const record = { id: '1', nome: 'Bob' };
    setupMaybeSingleChain(record);
    const result = await service.buscarPorId('1');
    expect(result).toEqual(record);
  });

  it('returns null when not found', async () => {
    setupMaybeSingleChain(null);
    const result = await service.buscarPorId('unknown');
    expect(result).toBeNull();
  });

  it('throws on DB error', async () => {
    setupMaybeSingleChain(null, { message: 'fail' });
    await expect(service.buscarPorId('1')).rejects.toBeDefined();
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

// ─── criar ────────────────────────────────────────────────────────────────────

describe('BaseService.criar', () => {
  const service = new TestService();
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns the created record', async () => {
    const created = { id: 'new-1', nome: 'Carol' };
    const maybeSingle = vi.fn().mockResolvedValue({ data: created, error: null });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });

    const result = await service.criar({ nome: 'Carol' } as any);
    expect(insertFn).toHaveBeenCalledWith({ nome: 'Carol' });
    expect(result).toEqual(created);
  });

  it('throws when data is null (no record returned)', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });

    await expect(service.criar({} as any)).rejects.toThrow();
  });

  it('throws and logs on DB error', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });

    await expect(service.criar({} as any)).rejects.toBeDefined();
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

// ─── excluir ──────────────────────────────────────────────────────────────────

describe('BaseService.excluir', () => {
  const service = new TestService();
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls delete with the given id', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ delete: deleteFn });

    await service.excluir('id-1');
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'id-1');
  });

  it('throws on DB error', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ delete: deleteFn });

    await expect(service.excluir('id-1')).rejects.toBeDefined();
    expect(mockLoggerError).toHaveBeenCalled();
  });
});
