import { describe, it, expect, vi, beforeEach } from 'vitest';
import { medidasDisciplinaresService } from '../medidasDisciplinaresService';

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

describe('medidasDisciplinaresService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns all medidas without empresa filter', async () => {
    const records = [{ id: 'm1', tipo: 'advertencia' }];
    setupListChain(records);
    const result = await medidasDisciplinaresService.listar();
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await medidasDisciplinaresService.listar();
    expect(result).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await medidasDisciplinaresService.listar('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('orders by data_ocorrencia descending', async () => {
    const { chain } = setupListChain([]);
    await medidasDisciplinaresService.listar();
    expect(chain.order).toHaveBeenCalledWith('data_ocorrencia', { ascending: false });
  });

  it('includes colaborador join', async () => {
    const { selectFn } = setupListChain([]);
    await medidasDisciplinaresService.listar();
    expect(selectFn).toHaveBeenCalledWith(
      expect.stringContaining('colaborador:colaboradores')
    );
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(medidasDisciplinaresService.listar()).rejects.toBeDefined();
  });
});

// ─── buscarPorColaborador ─────────────────────────────────────────────────────

describe('medidasDisciplinaresService.buscarPorColaborador', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns medidas for given colaboradorId', async () => {
    const records = [{ id: 'm1', colaborador_id: 'c1' }];
    const { chain } = setupListChain(records);
    const result = await medidasDisciplinaresService.buscarPorColaborador('c1');
    expect(result).toEqual(records);
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'c1');
  });

  it('returns empty array when no medidas', async () => {
    setupListChain(null as any);
    const result = await medidasDisciplinaresService.buscarPorColaborador('c-x');
    expect(result).toEqual([]);
  });

  it('orders by data_ocorrencia descending', async () => {
    const { chain } = setupListChain([]);
    await medidasDisciplinaresService.buscarPorColaborador('c1');
    expect(chain.order).toHaveBeenCalledWith('data_ocorrencia', { ascending: false });
  });
});

// ─── criar ────────────────────────────────────────────────────────────────────

describe('medidasDisciplinaresService.criar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new medida', async () => {
    const created = { id: 'm-new', tipo: 'suspensao' };
    const { insertFn } = setupInsertChain(created);
    const result = await medidasDisciplinaresService.criar({ tipo: 'suspensao' });
    expect(insertFn).toHaveBeenCalledWith({ tipo: 'suspensao' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(medidasDisciplinaresService.criar({})).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupInsertChain(null, { message: 'fail' });
    await expect(medidasDisciplinaresService.criar({})).rejects.toBeDefined();
  });
});

// ─── atualizar ────────────────────────────────────────────────────────────────

describe('medidasDisciplinaresService.atualizar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns medida', async () => {
    const updated = { id: 'm1', status: 'concluida' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await medidasDisciplinaresService.atualizar('m1', { status: 'concluida' });
    expect(updateFn).toHaveBeenCalledWith({ status: 'concluida' });
    expect(eqFn).toHaveBeenCalledWith('id', 'm1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(medidasDisciplinaresService.atualizar('m1', {})).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupUpdateChain(null, { message: 'fail' });
    await expect(medidasDisciplinaresService.atualizar('m1', {})).rejects.toBeDefined();
  });
});

// ─── excluir ──────────────────────────────────────────────────────────────────

describe('medidasDisciplinaresService.excluir', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes medida by id', async () => {
    const { deleteFn, eqFn } = setupDeleteChain();
    await medidasDisciplinaresService.excluir('m1');
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'm1');
  });

  it('throws on DB error', async () => {
    setupDeleteChain({ message: 'fail' });
    await expect(medidasDisciplinaresService.excluir('m1')).rejects.toBeDefined();
  });
});
