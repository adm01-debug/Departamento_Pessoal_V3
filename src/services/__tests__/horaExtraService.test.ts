import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeChain } from '@/test/chain';
import { horaExtraService } from '../horaExtraService';

const EMPRESA_ID = 'test-empresa-id';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// Helper: thenable chain for select → order → (optional eq) → await
function setupListarChain(data: any[], error: any = null) {
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

// Helper: update → eq → select → maybeSingle chain
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

// ─── listar ───────────────────────────────────────────────────────────────────

describe('horaExtraService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns records without empresa filter', async () => {
    const records = [{ id: 'he-1', status: 'pendente' }];
    setupListarChain(records);
    const result = await horaExtraService.listar(EMPRESA_ID);
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListarChain(null as any);
    const result = await horaExtraService.listar(EMPRESA_ID);
    expect(result).toEqual([]);
  });

  it('applies empresa_id filter when provided', async () => {
    const { chain } = setupListarChain([]);
    await horaExtraService.listar('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('rejeita quando empresaId não é informado (isolamento de tenant)', async () => {
    const { chain } = setupListarChain([]);
    await expect(horaExtraService.listar('' as unknown as string)).rejects.toThrow('empresa_id');
    expect(chain.eq).not.toHaveBeenCalled();
  });

  it('orders by created_at descending', async () => {
    const { chain } = setupListarChain([]);
    await horaExtraService.listar(EMPRESA_ID);
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('selects with colaborador join', async () => {
    const { selectFn } = setupListarChain([]);
    await horaExtraService.listar(EMPRESA_ID);
    expect(selectFn).toHaveBeenCalledWith(
      expect.stringContaining('colaborador:colaboradores')
    );
  });

  it('throws on DB error', async () => {
    setupListarChain([], { message: 'fail' });
    await expect(horaExtraService.listar(EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── criar ────────────────────────────────────────────────────────────────────

describe('horaExtraService.criar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns the created record', async () => {
    const created = { id: 'he-new', status: 'pendente' };
    const maybeSingle = vi.fn().mockResolvedValue({ data: created, error: null });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });

    const result = await horaExtraService.criar({ colaborador_id: 'c1', horas: 2 });
    expect(insertFn).toHaveBeenCalledWith({ colaborador_id: 'c1', horas: 2 });
    expect(result).toEqual(created);
  });

  it('throws when data is null (no record returned)', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });

    await expect(horaExtraService.criar({})).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });

    await expect(horaExtraService.criar({})).rejects.toBeDefined();
  });
});

// ─── aprovar ──────────────────────────────────────────────────────────────────

describe('horaExtraService.aprovar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates status to aprovada with aprovado_por', async () => {
    const updated = { id: 'he-1', status: 'aprovada' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    await horaExtraService.aprovar('he-1', 'user-1', EMPRESA_ID);
    const updateArgs = (updateFn as any).mock.calls[0][0];
    expect(updateArgs.status).toBe('aprovada');
    expect(updateArgs.aprovado_por).toBe('user-1');
    expect(eqFn).toHaveBeenCalledWith('id', 'he-1');
  });

  it('includes observacoes_aprovador when obs is provided', async () => {
    const { updateFn } = setupUpdateChain({ id: 'he-1', status: 'aprovada' });
    await horaExtraService.aprovar('he-1', 'user-1', EMPRESA_ID, 'Autorizado pelo gestor');
    const updateArgs = (updateFn as any).mock.calls[0][0];
    expect(updateArgs.observacoes_aprovador).toBe('Autorizado pelo gestor');
  });

  it('throws when data is null (record not found)', async () => {
    setupUpdateChain(null);
    await expect(horaExtraService.aprovar('he-1', 'user-1', EMPRESA_ID)).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupUpdateChain(null, { message: 'fail' });
    await expect(horaExtraService.aprovar('he-1', 'user-1', EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── rejeitar ─────────────────────────────────────────────────────────────────

describe('horaExtraService.rejeitar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates status to rejeitada', async () => {
    const { updateFn } = setupUpdateChain({ id: 'he-1', status: 'rejeitada' });
    await horaExtraService.rejeitar('he-1', 'user-1', EMPRESA_ID);
    const updateArgs = (updateFn as any).mock.calls[0][0];
    expect(updateArgs.status).toBe('rejeitada');
    expect(updateArgs.aprovado_por).toBe('user-1');
  });

  it('includes motivo as observacoes_aprovador when provided', async () => {
    const { updateFn } = setupUpdateChain({ id: 'he-1', status: 'rejeitada' });
    await horaExtraService.rejeitar('he-1', 'user-1', EMPRESA_ID, 'Limite mensal atingido');
    const updateArgs = (updateFn as any).mock.calls[0][0];
    expect(updateArgs.observacoes_aprovador).toBe('Limite mensal atingido');
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(horaExtraService.rejeitar('he-1', 'user-1', EMPRESA_ID)).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupUpdateChain(null, { message: 'fail' });
    await expect(horaExtraService.rejeitar('he-1', 'user-1', EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── excluir ──────────────────────────────────────────────────────────────────

describe('horaExtraService.excluir', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls delete with the given id', async () => {
    const chain = makeChain({ error: null });
    const deleteFn = chain.delete; const eqFn = chain.eq;
    mockFrom.mockReturnValue(chain);

    await horaExtraService.excluir('he-1', EMPRESA_ID);
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'he-1');
  });

  it('throws on DB error', async () => {
    mockFrom.mockReturnValue(makeChain({ error: { message: 'fail' } }));

    await expect(horaExtraService.excluir('he-1', EMPRESA_ID)).rejects.toBeDefined();
  });
});
