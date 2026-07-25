import { describe, it, expect, vi, beforeEach } from 'vitest';
import { turnoService } from '../turnoService';

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

// insert/update → eq → select → maybeSingle
function setupWriteChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const eqFn = vi.fn();
  const __eqChain = { select: selectFn, eq: eqFn };
  eqFn.mockReturnValue(__eqChain);
  return { maybeSingle, selectFn, eqFn };
}

function setupInsertChain(data: any, error: any = null) {
  const { maybeSingle, selectFn } = setupWriteChain(data, error);
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, selectFn, maybeSingle };
}

function setupUpdateChain(data: any, error: any = null) {
  const { maybeSingle, selectFn, eqFn } = setupWriteChain(data, error);
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

// ─── listarTurnos ─────────────────────────────────────────────────────────────

describe('turnoService.listarTurnos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns all turnos without empresa filter', async () => {
    const records = [{ id: 't1', nome: 'Manhã' }];
    setupListChain(records);
    const result = await turnoService.listarTurnos(EMPRESA_ID);
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await turnoService.listarTurnos(EMPRESA_ID);
    expect(result).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await turnoService.listarTurnos('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('orders by nome', async () => {
    const { chain } = setupListChain([]);
    await turnoService.listarTurnos(EMPRESA_ID);
    expect(chain.order).toHaveBeenCalledWith('nome');
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(turnoService.listarTurnos(EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── criarTurno ───────────────────────────────────────────────────────────────

describe('turnoService.criarTurno', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new turno', async () => {
    const created = { id: 't-new', nome: 'Noite' };
    const { insertFn } = setupInsertChain(created);
    const result = await turnoService.criarTurno({ nome: 'Noite' });
    expect(insertFn).toHaveBeenCalledWith({ nome: 'Noite' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(turnoService.criarTurno({})).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupInsertChain(null, { message: 'fail' });
    await expect(turnoService.criarTurno({})).rejects.toBeDefined();
  });
});

// ─── atualizarTurno ───────────────────────────────────────────────────────────

describe('turnoService.atualizarTurno', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns the turno', async () => {
    const updated = { id: 't1', nome: 'Tarde' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await turnoService.atualizarTurno('t1', { nome: 'Tarde' }, EMPRESA_ID);
    expect(updateFn).toHaveBeenCalledWith({ nome: 'Tarde' });
    expect(eqFn).toHaveBeenCalledWith('id', 't1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(turnoService.atualizarTurno('t1', {}, EMPRESA_ID)).rejects.toThrow();
  });
});

// ─── excluirTurno ─────────────────────────────────────────────────────────────

describe('turnoService.excluirTurno', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes turno by id', async () => {
    const { deleteFn, eqFn } = setupDeleteChain();
    await turnoService.excluirTurno('t1', EMPRESA_ID);
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 't1');
  });

  it('throws on DB error', async () => {
    setupDeleteChain({ message: 'fail' });
    await expect(turnoService.excluirTurno('t1', EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── listarEscalas ────────────────────────────────────────────────────────────

describe('turnoService.listarEscalas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns all escalas without filters', async () => {
    const records = [{ id: 'e1', data: '2026-07-24' }];
    setupListChain(records);
    const result = await turnoService.listarEscalas(EMPRESA_ID);
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await turnoService.listarEscalas(EMPRESA_ID);
    expect(result).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await turnoService.listarEscalas('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('filters by data when provided', async () => {
    const { chain } = setupListChain([]);
    await turnoService.listarEscalas(EMPRESA_ID, '2026-07-24');
    expect(chain.eq).toHaveBeenCalledWith('data', '2026-07-24');
  });

  it('includes colaborador and turno joins in select', async () => {
    const { selectFn } = setupListChain([]);
    await turnoService.listarEscalas(EMPRESA_ID);
    expect(selectFn).toHaveBeenCalledWith(
      expect.stringContaining('colaborador:colaboradores')
    );
    expect(selectFn).toHaveBeenCalledWith(
      expect.stringContaining('turno:turnos')
    );
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(turnoService.listarEscalas(EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── criarEscala ──────────────────────────────────────────────────────────────

describe('turnoService.criarEscala', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new escala', async () => {
    const created = { id: 'e-new', data: '2026-07-24' };
    const { insertFn } = setupInsertChain(created);
    const result = await turnoService.criarEscala({ data: '2026-07-24' });
    expect(insertFn).toHaveBeenCalledWith({ data: '2026-07-24' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(turnoService.criarEscala({})).rejects.toThrow();
  });
});

// ─── excluirEscala ────────────────────────────────────────────────────────────

describe('turnoService.excluirEscala', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes escala by id', async () => {
    const { deleteFn, eqFn } = setupDeleteChain();
    await turnoService.excluirEscala('e1', EMPRESA_ID);
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'e1');
  });

  it('throws on DB error', async () => {
    setupDeleteChain({ message: 'fail' });
    await expect(turnoService.excluirEscala('e1', EMPRESA_ID)).rejects.toBeDefined();
  });
});
