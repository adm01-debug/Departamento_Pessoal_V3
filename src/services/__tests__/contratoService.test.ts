import { describe, it, expect, vi, beforeEach } from 'vitest';
import { contratoService } from '../contratoService';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// Thenable list chain (select → order → optional eq → await)
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

// Insert chain
function setupInsertChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, selectFn, maybeSingle };
}

// Update chain
function setupUpdateChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const eqFn = vi.fn().mockReturnValue({ select: selectFn });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn, selectFn, maybeSingle };
}

// ─── listar ───────────────────────────────────────────────────────────────────

describe('contratoService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns all contratos without empresa filter', async () => {
    const records = [{ id: 'c1', tipo: 'clt' }];
    setupListChain(records);
    const result = await contratoService.listar();
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await contratoService.listar();
    expect(result).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await contratoService.listar('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('orders by data_inicio descending', async () => {
    const { chain } = setupListChain([]);
    await contratoService.listar();
    expect(chain.order).toHaveBeenCalledWith('data_inicio', { ascending: false });
  });

  it('selects with colaborador join', async () => {
    const { selectFn } = setupListChain([]);
    await contratoService.listar();
    expect(selectFn).toHaveBeenCalledWith(
      expect.stringContaining('colaborador:colaboradores')
    );
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(contratoService.listar()).rejects.toBeDefined();
  });
});

// ─── buscarPorId ──────────────────────────────────────────────────────────────

describe('contratoService.buscarPorId', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns contrato for given id', async () => {
    const contrato = { id: 'c1', tipo: 'clt' };
    const maybeSingle = vi.fn().mockResolvedValue({ data: contrato, error: null });
    const eqFn = vi.fn().mockReturnValue({ maybeSingle });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ select: selectFn });

    const result = await contratoService.buscarPorId('c1');
    expect(result).toEqual(contrato);
    expect(eqFn).toHaveBeenCalledWith('id', 'c1');
  });

  it('returns null when not found', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqFn = vi.fn().mockReturnValue({ maybeSingle });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ select: selectFn });

    const result = await contratoService.buscarPorId('unknown');
    expect(result).toBeNull();
  });

  it('throws on DB error', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const eqFn = vi.fn().mockReturnValue({ maybeSingle });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ select: selectFn });

    await expect(contratoService.buscarPorId('c1')).rejects.toBeDefined();
  });
});

// ─── buscarPorColaborador ─────────────────────────────────────────────────────

describe('contratoService.buscarPorColaborador', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns contratos for given colaboradorId', async () => {
    const records = [{ id: 'c1', colaborador_id: 'col-1' }];
    const { chain } = setupListChain(records);
    const result = await contratoService.buscarPorColaborador('col-1');
    expect(result).toEqual(records);
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
  });

  it('returns empty array when no contratos', async () => {
    setupListChain(null as any);
    const result = await contratoService.buscarPorColaborador('col-x');
    expect(result).toEqual([]);
  });
});

// ─── criar ────────────────────────────────────────────────────────────────────

describe('contratoService.criar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns the new contrato', async () => {
    const created = { id: 'c-new', tipo: 'clt' };
    const { insertFn } = setupInsertChain(created);
    const result = await contratoService.criar({ tipo: 'clt' });
    expect(insertFn).toHaveBeenCalledWith({ tipo: 'clt' });
    expect(result).toEqual(created);
  });

  it('throws when data is null (no record returned)', async () => {
    setupInsertChain(null);
    await expect(contratoService.criar({})).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupInsertChain(null, { message: 'fail' });
    await expect(contratoService.criar({})).rejects.toBeDefined();
  });
});

// ─── atualizar ────────────────────────────────────────────────────────────────

describe('contratoService.atualizar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns the updated contrato', async () => {
    const updated = { id: 'c1', status: 'ativo' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await contratoService.atualizar('c1', { status: 'ativo' });
    expect(updateFn).toHaveBeenCalledWith({ status: 'ativo' });
    expect(eqFn).toHaveBeenCalledWith('id', 'c1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(contratoService.atualizar('c1', {})).rejects.toThrow();
  });
});

// ─── encerrar ─────────────────────────────────────────────────────────────────

describe('contratoService.encerrar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls atualizar with status=encerrado and motivo as observacoes', async () => {
    const { updateFn } = setupUpdateChain({ id: 'c1', status: 'encerrado' });
    await contratoService.encerrar('c1', 'Demissão sem justa causa');
    const updateArgs = (updateFn as any).mock.calls[0][0];
    expect(updateArgs.status).toBe('encerrado');
    expect(updateArgs.observacoes).toBe('Demissão sem justa causa');
  });
});

// ─── renovar ──────────────────────────────────────────────────────────────────

describe('contratoService.renovar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls atualizar with new data_fim and status=ativo', async () => {
    const { updateFn, eqFn } = setupUpdateChain({ id: 'c1', status: 'ativo' });
    await contratoService.renovar('c1', '2027-12-31');
    const updateArgs = (updateFn as any).mock.calls[0][0];
    expect(updateArgs.data_fim).toBe('2027-12-31');
    expect(updateArgs.status).toBe('ativo');
    expect(eqFn).toHaveBeenCalledWith('id', 'c1');
  });
});
