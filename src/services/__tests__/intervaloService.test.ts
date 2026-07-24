import { describe, it, expect, vi, beforeEach } from 'vitest';
import { intervaloService } from '../intervaloService';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

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
  const eqFn = vi.fn().mockReturnValue({ select: selectFn });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn, selectFn, maybeSingle };
}

function setupDeleteChain(error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ error });
  const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ delete: deleteFn });
  return { deleteFn, eqFn };
}

// ─── listar ───────────────────────────────────────────────────────────────────

describe('intervaloService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns intervalos without empresa filter', async () => {
    const records = [{ id: 'i1', nome: 'Almoço 1h' }];
    setupListChain(records);
    expect(await intervaloService.listar()).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    expect(await intervaloService.listar()).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await intervaloService.listar('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('orders by nome', async () => {
    const { chain } = setupListChain([]);
    await intervaloService.listar();
    expect(chain.order).toHaveBeenCalledWith('nome');
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(intervaloService.listar()).rejects.toBeDefined();
  });
});

// ─── criar ────────────────────────────────────────────────────────────────────

describe('intervaloService.criar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new intervalo', async () => {
    const created = { id: 'i-new', nome: 'Descanso 15min' };
    const { insertFn } = setupInsertChain(created);
    const result = await intervaloService.criar({ nome: 'Descanso 15min' });
    expect(insertFn).toHaveBeenCalledWith({ nome: 'Descanso 15min' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(intervaloService.criar({})).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupInsertChain(null, { message: 'fail' });
    await expect(intervaloService.criar({})).rejects.toBeDefined();
  });
});

// ─── atualizar ────────────────────────────────────────────────────────────────

describe('intervaloService.atualizar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns intervalo', async () => {
    const updated = { id: 'i1', duracao_minutos: 60 };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await intervaloService.atualizar('i1', { duracao_minutos: 60 });
    expect(updateFn).toHaveBeenCalledWith({ duracao_minutos: 60 });
    expect(eqFn).toHaveBeenCalledWith('id', 'i1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(intervaloService.atualizar('i1', {})).rejects.toThrow();
  });
});

// ─── excluir ──────────────────────────────────────────────────────────────────

describe('intervaloService.excluir', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes intervalo by id', async () => {
    const { deleteFn, eqFn } = setupDeleteChain();
    await intervaloService.excluir('i1');
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'i1');
  });

  it('throws on DB error', async () => {
    setupDeleteChain({ message: 'fail' });
    await expect(intervaloService.excluir('i1')).rejects.toBeDefined();
  });
});
