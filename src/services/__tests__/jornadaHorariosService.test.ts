import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jornadaHorariosService } from '../jornadaHorariosService';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// select → eq → order → await
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

// insert (salvarGrade multi-row) → select → data[]
function setupInsertMultiChain(data: any[], error: any = null) {
  const selectFn = vi.fn().mockResolvedValue({ data, error });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, selectFn };
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

describe('jornadaHorariosService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns horarios for jornada', async () => {
    const records = [{ id: 'h1', jornada_id: 'j1', dia_semana: 1 }];
    setupListChain(records);
    const result = await jornadaHorariosService.listar('j1');
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await jornadaHorariosService.listar('j1');
    expect(result).toEqual([]);
  });

  it('filters by jornada_id', async () => {
    const { eqFn } = setupListChain([]);
    await jornadaHorariosService.listar('jornada-42');
    expect(eqFn).toHaveBeenCalledWith('jornada_id', 'jornada-42');
  });

  it('orders by dia_semana', async () => {
    const { orderFn } = setupListChain([]);
    await jornadaHorariosService.listar('j1');
    expect(orderFn).toHaveBeenCalledWith('dia_semana');
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(jornadaHorariosService.listar('j1')).rejects.toBeDefined();
  });
});

// ─── criar ────────────────────────────────────────────────────────────────────

describe('jornadaHorariosService.criar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new horario', async () => {
    const created = { id: 'h-new', jornada_id: 'j1', dia_semana: 2 };
    const { insertFn } = setupInsertChain(created);
    const result = await jornadaHorariosService.criar({ jornada_id: 'j1', dia_semana: 2 });
    expect(insertFn).toHaveBeenCalledWith({ jornada_id: 'j1', dia_semana: 2 });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(jornadaHorariosService.criar({})).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupInsertChain(null, { message: 'fail' });
    await expect(jornadaHorariosService.criar({})).rejects.toBeDefined();
  });
});

// ─── atualizar ────────────────────────────────────────────────────────────────

describe('jornadaHorariosService.atualizar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns horario', async () => {
    const updated = { id: 'h1', hora_inicio: '09:00' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await jornadaHorariosService.atualizar('h1', { hora_inicio: '09:00' });
    expect(updateFn).toHaveBeenCalledWith({ hora_inicio: '09:00' });
    expect(eqFn).toHaveBeenCalledWith('id', 'h1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(jornadaHorariosService.atualizar('h1', {})).rejects.toThrow();
  });
});

// ─── excluir ──────────────────────────────────────────────────────────────────

describe('jornadaHorariosService.excluir', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes horario by id', async () => {
    const { deleteFn, eqFn } = setupDeleteChain();
    await jornadaHorariosService.excluir('h1');
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'h1');
  });

  it('throws on DB error', async () => {
    setupDeleteChain({ message: 'fail' });
    await expect(jornadaHorariosService.excluir('h1')).rejects.toBeDefined();
  });
});

// ─── salvarGrade ──────────────────────────────────────────────────────────────

describe('jornadaHorariosService.salvarGrade', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns empty array when no horarios provided', async () => {
    // delete existing, then no insert needed
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ delete: deleteFn });

    const result = await jornadaHorariosService.salvarGrade('j1', []);
    expect(result).toEqual([]);
  });

  it('deletes existing then inserts new grade', async () => {
    const horarios = [{ dia_semana: 1, hora_inicio: '08:00' }];
    const inserted = [{ id: 'h-new', jornada_id: 'j1', dia_semana: 1, hora_inicio: '08:00' }];

    // First call: delete
    const eqDeleteFn = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqDeleteFn });

    // Second call: insert
    const selectInsert = vi.fn().mockResolvedValue({ data: inserted, error: null });
    const insertFn = vi.fn().mockReturnValue({ select: selectInsert });

    mockFrom
      .mockReturnValueOnce({ delete: deleteFn })
      .mockReturnValueOnce({ insert: insertFn });

    const result = await jornadaHorariosService.salvarGrade('j1', horarios);
    expect(eqDeleteFn).toHaveBeenCalledWith('jornada_id', 'j1');
    expect(insertFn).toHaveBeenCalledWith([{ dia_semana: 1, hora_inicio: '08:00', jornada_id: 'j1' }]);
    expect(result).toEqual(inserted);
  });

  it('wraps errors in Falha message', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: { message: 'db fail' } });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ delete: deleteFn });

    await expect(
      jornadaHorariosService.salvarGrade('j1', [{ dia_semana: 1 }])
    ).rejects.toThrow('Falha ao salvar grade de horários');
  });
});
