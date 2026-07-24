import { describe, it, expect, vi, beforeEach } from 'vitest';
import { episService, episEntregasService } from '../episService';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// Thenable chain with optional eq (listar)
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

// select → eq → order → resolvedValue
function setupEqOrderChain(data: any[], error: any = null) {
  const orderFn = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ order: orderFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, orderFn };
}

// insert(d).select().maybeSingle()
function setupInsertChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, maybeSingle };
}

// update.eq.select.maybeSingle
function setupUpdateChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const eqFn = vi.fn().mockReturnValue({ select: selectFn });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn, maybeSingle };
}

// delete.eq → resolvedValue
function setupDeleteChain(error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ error });
  const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ delete: deleteFn });
  return { deleteFn, eqFn };
}

// ─── episService ──────────────────────────────────────────────────────────────

describe('episService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns EPIs without empresa filter', async () => {
    const records = [{ id: 'e1', nome: 'Capacete' }];
    setupListChain(records);
    expect(await episService.listar()).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    expect(await episService.listar()).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await episService.listar('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(episService.listar()).rejects.toBeDefined();
  });
});

describe('episService.criar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new EPI', async () => {
    const created = { id: 'e-new', nome: 'Luva' };
    const { insertFn } = setupInsertChain(created);
    const result = await episService.criar({ nome: 'Luva' });
    expect(insertFn).toHaveBeenCalledWith({ nome: 'Luva' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(episService.criar({})).rejects.toThrow('Nenhum registro de EPI foi retornado.');
  });
});

describe('episService.atualizar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns EPI', async () => {
    const updated = { id: 'e1', nome: 'Capacete Atualizado' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await episService.atualizar('e1', { nome: 'Capacete Atualizado' });
    expect(updateFn).toHaveBeenCalledWith({ nome: 'Capacete Atualizado' });
    expect(eqFn).toHaveBeenCalledWith('id', 'e1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(episService.atualizar('e1', {})).rejects.toThrow('Nenhum registro de EPI foi retornado.');
  });
});

describe('episService.excluir', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes EPI by id', async () => {
    const { deleteFn, eqFn } = setupDeleteChain();
    await episService.excluir('e1');
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'e1');
  });

  it('throws on DB error', async () => {
    setupDeleteChain({ message: 'fail' });
    await expect(episService.excluir('e1')).rejects.toBeDefined();
  });
});

// ─── episEntregasService ──────────────────────────────────────────────────────

describe('episEntregasService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns entregas without empresa filter', async () => {
    const records = [{ id: 'ee1' }];
    setupListChain(records);
    expect(await episEntregasService.listar()).toEqual(records);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await episEntregasService.listar('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    expect(await episEntregasService.listar()).toEqual([]);
  });
});

describe('episEntregasService.buscarPorColaborador', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('filters by colaborador_id', async () => {
    const records = [{ id: 'ee1', colaborador_id: 'c1' }];
    const { eqFn } = setupEqOrderChain(records);
    const result = await episEntregasService.buscarPorColaborador('c1');
    expect(result).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });
});

describe('episEntregasService.criar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new entrega', async () => {
    const created = { id: 'ee-new', epi_id: 'e1' };
    const { insertFn } = setupInsertChain(created);
    const result = await episEntregasService.criar({ epi_id: 'e1' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(episEntregasService.criar({})).rejects.toThrow('Nenhum registro de entrega de EPI foi retornado.');
  });
});

describe('episEntregasService.registrarDevolucao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates data_devolucao and returns result', async () => {
    const updated = { id: 'ee1', data_devolucao: '2026-07-01' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await episEntregasService.registrarDevolucao('ee1', '2026-07-01');
    expect(updateFn).toHaveBeenCalledWith({ data_devolucao: '2026-07-01' });
    expect(eqFn).toHaveBeenCalledWith('id', 'ee1');
    expect(result).toEqual(updated);
  });
});

describe('episEntregasService.excluir', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes entrega by id', async () => {
    const { deleteFn, eqFn } = setupDeleteChain();
    await episEntregasService.excluir('ee1');
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'ee1');
  });
});
