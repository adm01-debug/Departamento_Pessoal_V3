import { describe, it, expect, vi, beforeEach } from 'vitest';
import { historicoContratoService } from '../historicoContratoService';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

function setupListChain(data: any[], error: any = null) {
  const orderFn = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ order: orderFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, orderFn };
}

function setupInsertChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, selectFn, maybeSingle };
}

function setupDeleteChain(error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ error });
  const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ delete: deleteFn });
  return { deleteFn, eqFn };
}

// ─── listar ───────────────────────────────────────────────────────────────────

describe('historicoContratoService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns historico for given colaboradorId', async () => {
    const records = [{ id: 'h1', colaborador_id: 'c1', data_inicio: '2020-01-01' }];
    setupListChain(records);
    const result = await historicoContratoService.listar('c1');
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    expect(await historicoContratoService.listar('c1')).toEqual([]);
  });

  it('filters by colaborador_id', async () => {
    const { eqFn } = setupListChain([]);
    await historicoContratoService.listar('colab-42');
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'colab-42');
  });

  it('orders by data_inicio descending', async () => {
    const { orderFn } = setupListChain([]);
    await historicoContratoService.listar('c1');
    expect(orderFn).toHaveBeenCalledWith('data_inicio', { ascending: false });
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(historicoContratoService.listar('c1')).rejects.toBeDefined();
  });
});

// ─── criar ────────────────────────────────────────────────────────────────────

describe('historicoContratoService.criar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new historico', async () => {
    const created = { id: 'h-new', colaborador_id: 'c1' };
    const { insertFn } = setupInsertChain(created);
    const result = await historicoContratoService.criar({ colaborador_id: 'c1' });
    expect(insertFn).toHaveBeenCalledWith({ colaborador_id: 'c1' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(historicoContratoService.criar({})).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupInsertChain(null, { message: 'fail' });
    await expect(historicoContratoService.criar({})).rejects.toBeDefined();
  });
});

// ─── excluir ──────────────────────────────────────────────────────────────────

describe('historicoContratoService.excluir', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes historico by id', async () => {
    const { deleteFn, eqFn } = setupDeleteChain();
    await historicoContratoService.excluir('h1');
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'h1');
  });

  it('throws on DB error', async () => {
    setupDeleteChain({ message: 'fail' });
    await expect(historicoContratoService.excluir('h1')).rejects.toBeDefined();
  });
});
