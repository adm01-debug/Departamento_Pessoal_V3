import { describe, it, expect, vi, beforeEach } from 'vitest';
import { feriasService } from '../feriasService';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// Helper: build select → eq/ilike → order → range chain for listSolicitacoes
function setupListChain(data: any[], count: number, error: any = null) {
  const rangeFn = vi.fn().mockResolvedValue({ data, count, error });
  const orderFn = vi.fn().mockReturnValue({ range: rangeFn });
  const baseQuery: any = { order: orderFn };
  const eqFn = vi.fn().mockReturnValue(baseQuery);
  const ilikeFn = vi.fn().mockReturnValue(baseQuery);
  Object.assign(baseQuery, { eq: eqFn, ilike: ilikeFn });
  const selectFn = vi.fn().mockReturnValue(baseQuery);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, ilikeFn, orderFn, rangeFn };
}

// Helper: build a simple update → eq chain (resolves to { error })
function setupUpdateChain(error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ error });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn };
}

// ─── listSolicitacoes ─────────────────────────────────────────────────────────

describe('feriasService.listSolicitacoes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns data and count from supabase', async () => {
    const records = [{ id: 'f1', status: 'pendente' }];
    setupListChain(records, 1);
    const result = await feriasService.listSolicitacoes();
    expect(result.data).toEqual(records);
    expect(result.count).toBe(1);
  });

  it('returns empty data when supabase returns null', async () => {
    setupListChain(null as any, null as any);
    const result = await feriasService.listSolicitacoes();
    expect(result.data).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('filters by empresa_id when provided', async () => {
    const { eqFn } = setupListChain([], 0);
    await feriasService.listSolicitacoes('emp-1');
    expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('filters by status when not "all"', async () => {
    const { eqFn } = setupListChain([], 0);
    await feriasService.listSolicitacoes(undefined, { status: 'aprovada' });
    expect(eqFn).toHaveBeenCalledWith('status', 'aprovada');
  });

  it('does NOT filter by status when status is "all"', async () => {
    const { eqFn } = setupListChain([], 0);
    await feriasService.listSolicitacoes(undefined, { status: 'all' });
    expect(eqFn).not.toHaveBeenCalledWith('status', 'all');
  });

  it('adds ilike filter when search has 3+ characters', async () => {
    const { ilikeFn } = setupListChain([], 0);
    await feriasService.listSolicitacoes(undefined, { search: 'Silva' });
    expect(ilikeFn).toHaveBeenCalledWith('colaborador_nome', '%Silva%');
  });

  it('does NOT add ilike filter when search has fewer than 3 characters', async () => {
    const { ilikeFn } = setupListChain([], 0);
    await feriasService.listSolicitacoes(undefined, { search: 'Jo' });
    expect(ilikeFn).not.toHaveBeenCalled();
  });

  it('calls range with correct offset for page 2, limit 5', async () => {
    const { rangeFn } = setupListChain([], 0);
    await feriasService.listSolicitacoes(undefined, { page: 2, limit: 5 });
    expect(rangeFn).toHaveBeenCalledWith(5, 9);
  });

  it('orders by data_inicio descending', async () => {
    const { orderFn } = setupListChain([], 0);
    await feriasService.listSolicitacoes();
    expect(orderFn).toHaveBeenCalledWith('data_inicio', { ascending: false });
  });

  it('throws on DB error', async () => {
    setupListChain([], 0, { message: 'fail' });
    await expect(feriasService.listSolicitacoes()).rejects.toBeDefined();
  });
});

// ─── listar (delegate) ────────────────────────────────────────────────────────

describe('feriasService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns { data, total } delegating to listSolicitacoes', async () => {
    const records = [{ id: 'f2', status: 'pendente' }];
    setupListChain(records, 1);
    const result = await feriasService.listar({});
    expect(result.data).toEqual(records);
    expect(result.total).toBe(1);
  });
});

// ─── aprovar ──────────────────────────────────────────────────────────────────

describe('feriasService.aprovar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls update with status aprovada and eq on id', async () => {
    const { updateFn, eqFn } = setupUpdateChain();
    await feriasService.aprovar('ferias-1');
    expect(updateFn).toHaveBeenCalledWith({ status: 'aprovada' });
    expect(eqFn).toHaveBeenCalledWith('id', 'ferias-1');
  });

  it('throws on DB error', async () => {
    setupUpdateChain({ message: 'fail' });
    await expect(feriasService.aprovar('ferias-1')).rejects.toBeDefined();
  });
});

// ─── rejeitar ─────────────────────────────────────────────────────────────────

describe('feriasService.rejeitar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls update with status rejeitada', async () => {
    const { updateFn } = setupUpdateChain();
    await feriasService.rejeitar('ferias-2');
    expect(updateFn).toHaveBeenCalledWith({ status: 'rejeitada' });
  });

  it('throws on DB error', async () => {
    setupUpdateChain({ message: 'fail' });
    await expect(feriasService.rejeitar('ferias-2')).rejects.toBeDefined();
  });
});

// ─── cancelar ────────────────────────────────────────────────────────────────

describe('feriasService.cancelar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls update with cancelado=true and status=cancelada', async () => {
    const { updateFn } = setupUpdateChain();
    await feriasService.cancelar('ferias-3', 'user-1');
    const updateArgs = (updateFn as any).mock.calls[0][0];
    expect(updateArgs.cancelado).toBe(true);
    expect(updateArgs.status).toBe('cancelada');
    expect(updateArgs.cancelado_por).toBe('user-1');
  });

  it('sets cancelado_por to null when userId not provided', async () => {
    const { updateFn } = setupUpdateChain();
    await feriasService.cancelar('ferias-3');
    const updateArgs = (updateFn as any).mock.calls[0][0];
    expect(updateArgs.cancelado_por).toBeNull();
  });

  it('throws on DB error', async () => {
    setupUpdateChain({ message: 'fail' });
    await expect(feriasService.cancelar('ferias-3')).rejects.toBeDefined();
  });
});

// ─── aprovarGestor ───────────────────────────────────────────────────────────

describe('feriasService.aprovarGestor', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls update with aprovado_gestor=true and userId', async () => {
    const { updateFn } = setupUpdateChain();
    await feriasService.aprovarGestor('ferias-1', 'gestor-1');
    const updateArgs = (updateFn as any).mock.calls[0][0];
    expect(updateArgs.aprovado_gestor).toBe(true);
    expect(updateArgs.status_aprovacao_gestor).toBe('aprovado');
    expect(updateArgs.aprovado_gestor_por).toBe('gestor-1');
  });

  it('throws on DB error', async () => {
    setupUpdateChain({ message: 'fail' });
    await expect(feriasService.aprovarGestor('ferias-1', 'g1')).rejects.toBeDefined();
  });
});

// ─── aprovarRH ───────────────────────────────────────────────────────────────

describe('feriasService.aprovarRH', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls update with aprovado_rh=true and status aprovada', async () => {
    const { updateFn } = setupUpdateChain();
    await feriasService.aprovarRH('ferias-1', 'rh-1');
    const updateArgs = (updateFn as any).mock.calls[0][0];
    expect(updateArgs.aprovado_rh).toBe(true);
    expect(updateArgs.status).toBe('aprovada');
    expect(updateArgs.aprovado_rh_por).toBe('rh-1');
  });

  it('throws on DB error', async () => {
    setupUpdateChain({ message: 'fail' });
    await expect(feriasService.aprovarRH('ferias-1', 'rh-1')).rejects.toBeDefined();
  });
});

// ─── getAprovacoesLog ─────────────────────────────────────────────────────────

describe('feriasService.getAprovacoesLog', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns log entries for a ferias record', async () => {
    const logs = [{ id: 'log-1', ferias_id: 'f1', acao: 'aprovado' }];
    const orderFn = vi.fn().mockResolvedValue({ data: logs, error: null });
    const eqFn = vi.fn().mockReturnValue({ order: orderFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ select: selectFn });

    const result = await feriasService.getAprovacoesLog('f1');
    expect(result).toEqual(logs);
    expect(eqFn).toHaveBeenCalledWith('ferias_id', 'f1');
  });

  it('returns empty array when no logs', async () => {
    const orderFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqFn = vi.fn().mockReturnValue({ order: orderFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ select: selectFn });

    const result = await feriasService.getAprovacoesLog('f1');
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    const orderFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const eqFn = vi.fn().mockReturnValue({ order: orderFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ select: selectFn });

    await expect(feriasService.getAprovacoesLog('f1')).rejects.toBeDefined();
  });
});

// ─── criarPeriodoAquisitivo ───────────────────────────────────────────────────

describe('feriasService.criarPeriodoAquisitivo', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns the created period', async () => {
    const created = { id: 'pa-1', colaborador_id: 'c1' };
    const maybeSingle = vi.fn().mockResolvedValue({ data: created, error: null });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });

    const result = await feriasService.criarPeriodoAquisitivo({ colaborador_id: 'c1' });
    expect(result).toEqual(created);
    expect(insertFn).toHaveBeenCalledWith({ colaborador_id: 'c1' });
  });

  it('throws on DB error', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });

    await expect(feriasService.criarPeriodoAquisitivo({})).rejects.toBeDefined();
  });
});

// ─── atualizarPeriodoAquisitivo ───────────────────────────────────────────────

describe('feriasService.atualizarPeriodoAquisitivo', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns the period', async () => {
    const updated = { id: 'pa-1', status: 'usado' };
    const maybeSingle = vi.fn().mockResolvedValue({ data: updated, error: null });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle });
    const eqFn = vi.fn().mockReturnValue({ select: selectFn });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ update: updateFn });

    const result = await feriasService.atualizarPeriodoAquisitivo('pa-1', { status: 'usado' });
    expect(result).toEqual(updated);
    expect(eqFn).toHaveBeenCalledWith('id', 'pa-1');
  });

  it('throws on DB error', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle });
    const eqFn = vi.fn().mockReturnValue({ select: selectFn });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ update: updateFn });

    await expect(feriasService.atualizarPeriodoAquisitivo('pa-1', {})).rejects.toBeDefined();
  });
});

// ─── excluirPeriodoAquisitivo ─────────────────────────────────────────────────

describe('feriasService.excluirPeriodoAquisitivo', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls delete with the given id', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ delete: deleteFn });

    await feriasService.excluirPeriodoAquisitivo('pa-2');
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'pa-2');
  });

  it('throws on DB error', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ delete: deleteFn });

    await expect(feriasService.excluirPeriodoAquisitivo('pa-2')).rejects.toBeDefined();
  });
});
