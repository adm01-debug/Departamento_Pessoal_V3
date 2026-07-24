import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faltasService } from '../faltasService';

const EMPRESA_ID = 'test-empresa-id';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// select → order → optional eq → await (thenable)
function setupListChain(data: any[], error: any = null) {
  const response = { data, error };
  const chain: any = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve(response).then(fn);
  chain.catch = (fn: any) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: any) => Promise.resolve(response).finally(fn);
  const selectFn = vi.fn().mockReturnValue(chain);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, chain };
}

function setupInsertChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, selectFn, maybeSingle };
}

function setupUpdateChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const eqFn = vi.fn();
  const __eqChain = { select: selectFn, eq: eqFn };
  eqFn.mockReturnValue(__eqChain);
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn, selectFn, maybeSingle };
}

function setupDeleteChain(error: any = null) {
  const eqFn = vi.fn();
  const __delChain = { then: (r) => Promise.resolve({ error }).then(r), catch: (r) => Promise.resolve({ error }).catch(r), finally: (r) => Promise.resolve({ error }).finally(r), eq: eqFn };
  eqFn.mockReturnValue(__delChain);
  const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ delete: deleteFn });
  return { deleteFn, eqFn };
}

// ─── listar ───────────────────────────────────────────────────────────────────

describe('faltasService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns all faltas without empresa filter', async () => {
    const records = [{ id: 'f1', data: '2026-07-01' }];
    setupListChain(records);
    const result = await faltasService.listar(EMPRESA_ID);
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await faltasService.listar(EMPRESA_ID);
    expect(result).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await faltasService.listar('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('orders by data descending', async () => {
    const { chain } = setupListChain([]);
    await faltasService.listar(EMPRESA_ID);
    expect(chain.order).toHaveBeenCalledWith('data', { ascending: false });
  });

  it('includes colaborador join in select', async () => {
    const { selectFn } = setupListChain([]);
    await faltasService.listar(EMPRESA_ID);
    expect(selectFn).toHaveBeenCalledWith(
      expect.stringContaining('colaborador:colaboradores')
    );
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(faltasService.listar(EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── buscarPorColaborador ─────────────────────────────────────────────────────

describe('faltasService.buscarPorColaborador', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns faltas for given colaboradorId', async () => {
    const records = [{ id: 'f1', colaborador_id: 'c1' }];
    const { chain } = setupListChain(records);
    const result = await faltasService.buscarPorColaborador('c1', EMPRESA_ID);
    expect(result).toEqual(records);
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'c1');
  });

  it('returns empty array when no faltas', async () => {
    setupListChain(null as any);
    const result = await faltasService.buscarPorColaborador('c-x', EMPRESA_ID);
    expect(result).toEqual([]);
  });

  it('orders by data descending', async () => {
    const { chain } = setupListChain([]);
    await faltasService.buscarPorColaborador('c1', EMPRESA_ID);
    expect(chain.order).toHaveBeenCalledWith('data', { ascending: false });
  });
});

// ─── criar ────────────────────────────────────────────────────────────────────

describe('faltasService.criar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new falta', async () => {
    const created = { id: 'f-new', data: '2026-07-10' };
    const { insertFn } = setupInsertChain(created);
    const result = await faltasService.criar({ data: '2026-07-10' });
    expect(insertFn).toHaveBeenCalledWith({ data: '2026-07-10' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(faltasService.criar({})).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupInsertChain(null, { message: 'fail' });
    await expect(faltasService.criar({})).rejects.toBeDefined();
  });
});

// ─── atualizar ────────────────────────────────────────────────────────────────

describe('faltasService.atualizar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns falta', async () => {
    const updated = { id: 'f1', justificada: true };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await faltasService.atualizar('f1', { justificada: true }, EMPRESA_ID);
    expect(updateFn).toHaveBeenCalledWith({ justificada: true });
    expect(eqFn).toHaveBeenCalledWith('id', 'f1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(faltasService.atualizar('f1', {}, EMPRESA_ID)).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupUpdateChain(null, { message: 'fail' });
    await expect(faltasService.atualizar('f1', {}, EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── excluir ──────────────────────────────────────────────────────────────────

describe('faltasService.excluir', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes falta by id', async () => {
    const { deleteFn, eqFn } = setupDeleteChain();
    await faltasService.excluir('f1', EMPRESA_ID);
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'f1');
  });

  it('throws on DB error', async () => {
    setupDeleteChain({ message: 'fail' });
    await expect(faltasService.excluir('f1', EMPRESA_ID)).rejects.toBeDefined();
  });
});
