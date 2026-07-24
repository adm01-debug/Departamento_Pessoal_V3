import { describe, it, expect, vi, beforeEach } from 'vitest';
import { batidasPontoService } from '../batidasPontoService';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('../pontoAuditService', () => ({
  pontoAuditService: {
    logAdjustment: vi.fn().mockResolvedValue(undefined),
    logExclusion: vi.fn().mockResolvedValue(undefined),
    logMassAction: vi.fn().mockResolvedValue(undefined),
  },
}));

// select → eq → order×2 → optional gte/lte → await (thenable)
function setupListChain(data: any[], error: any = null) {
  const response = { data, error };
  const chain: any = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
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

// ─── listar ───────────────────────────────────────────────────────────────────

describe('batidasPontoService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns batidas for colaborador', async () => {
    const records = [{ id: 'b1', colaborador_id: 'c1', data: '2026-07-24' }];
    setupListChain(records);
    const result = await batidasPontoService.listar('c1');
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await batidasPontoService.listar('c1');
    expect(result).toEqual([]);
  });

  it('filters by colaborador_id', async () => {
    const { chain } = setupListChain([]);
    await batidasPontoService.listar('colab-42');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'colab-42');
  });

  it('applies gte filter when dataInicio provided', async () => {
    const { chain } = setupListChain([]);
    await batidasPontoService.listar('c1', '2026-07-01');
    expect(chain.gte).toHaveBeenCalledWith('data', '2026-07-01');
  });

  it('applies lte filter when dataFim provided', async () => {
    const { chain } = setupListChain([]);
    await batidasPontoService.listar('c1', undefined, '2026-07-31');
    expect(chain.lte).toHaveBeenCalledWith('data', '2026-07-31');
  });

  it('orders by data and ordem', async () => {
    const { chain } = setupListChain([]);
    await batidasPontoService.listar('c1');
    expect(chain.order).toHaveBeenCalledWith('data');
    expect(chain.order).toHaveBeenCalledWith('ordem');
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(batidasPontoService.listar('c1')).rejects.toBeDefined();
  });
});

// ─── listarPorData ────────────────────────────────────────────────────────────

describe('batidasPontoService.listarPorData', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns batidas for given date', async () => {
    const records = [{ id: 'b1', data: '2026-07-24' }];
    setupListChain(records);
    const result = await batidasPontoService.listarPorData('2026-07-24');
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await batidasPontoService.listarPorData('2026-07-24');
    expect(result).toEqual([]);
  });

  it('filters by data', async () => {
    const { chain } = setupListChain([]);
    await batidasPontoService.listarPorData('2026-07-24');
    expect(chain.eq).toHaveBeenCalledWith('data', '2026-07-24');
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await batidasPontoService.listarPorData('2026-07-24', 'emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('includes colaborador join in select', async () => {
    const { selectFn } = setupListChain([]);
    await batidasPontoService.listarPorData('2026-07-24');
    expect(selectFn).toHaveBeenCalledWith(
      expect.stringContaining('colaborador:colaboradores')
    );
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(batidasPontoService.listarPorData('2026-07-24')).rejects.toBeDefined();
  });
});

// ─── registrar ────────────────────────────────────────────────────────────────

describe('batidasPontoService.registrar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new batida', async () => {
    const created = { id: 'b-new', hora: '08:00', tipo: 'entrada' };
    const { insertFn } = setupInsertChain(created);
    const result = await batidasPontoService.registrar({ hora: '08:00', tipo: 'entrada' });
    expect(insertFn).toHaveBeenCalledWith({ hora: '08:00', tipo: 'entrada' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(batidasPontoService.registrar({})).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupInsertChain(null, { message: 'fail' });
    await expect(batidasPontoService.registrar({})).rejects.toBeDefined();
  });
});

// ─── ajustar ──────────────────────────────────────────────────────────────────

describe('batidasPontoService.ajustar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates batida with ajustado=true and logs adjustment', async () => {
    const anterior = { id: 'b1', hora: '07:50' };
    const updated = { id: 'b1', hora: '08:00', ajustado: true };

    // Call 1: select anterior (single)
    const singleFn = vi.fn().mockResolvedValue({ data: anterior });
    const eqSelect = vi.fn().mockReturnValue({ single: singleFn });
    const selectFn1 = vi.fn().mockReturnValue({ eq: eqSelect });

    // Call 2: update → eq → select → maybeSingle
    const maybeSingle = vi.fn().mockResolvedValue({ data: updated, error: null });
    const selectFn2 = vi.fn().mockReturnValue({ maybeSingle });
    const eqUpdate = vi.fn().mockReturnValue({ select: selectFn2 });
    const updateFn = vi.fn().mockReturnValue({ eq: eqUpdate });

    mockFrom
      .mockReturnValueOnce({ select: selectFn1 })
      .mockReturnValueOnce({ update: updateFn });

    const result = await batidasPontoService.ajustar('b1', { hora: '08:00' });
    expect(updateFn).toHaveBeenCalledWith({ hora: '08:00', ajustado: true });
    expect(eqUpdate).toHaveBeenCalledWith('id', 'b1');
    expect(result).toEqual(updated);
  });

  it('wraps errors in Falha message', async () => {
    const singleFn = vi.fn().mockResolvedValue({ data: null });
    const eqSelect = vi.fn().mockReturnValue({ single: singleFn });
    const selectFn1 = vi.fn().mockReturnValue({ eq: eqSelect });

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'db fail' } });
    const selectFn2 = vi.fn().mockReturnValue({ maybeSingle });
    const eqUpdate = vi.fn().mockReturnValue({ select: selectFn2 });
    const updateFn = vi.fn().mockReturnValue({ eq: eqUpdate });

    mockFrom
      .mockReturnValueOnce({ select: selectFn1 })
      .mockReturnValueOnce({ update: updateFn });

    await expect(batidasPontoService.ajustar('b1', {})).rejects.toThrow(
      'Falha ao ajustar batida de ponto'
    );
  });
});

// ─── fecharPeriodo ────────────────────────────────────────────────────────────

describe('batidasPontoService.fecharPeriodo', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts a fechado period and returns the record', async () => {
    const periodo = { id: 'p1', status: 'fechado' };
    const singleFn = vi.fn().mockResolvedValue({ data: periodo, error: null });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });

    const result = await batidasPontoService.fecharPeriodo('emp-1', '2026-07-01', '2026-07-31');
    const insertArg = insertFn.mock.calls[0][0];
    expect(insertArg.empresa_id).toBe('emp-1');
    expect(insertArg.data_inicio).toBe('2026-07-01');
    expect(insertArg.data_fim).toBe('2026-07-31');
    expect(insertArg.status).toBe('fechado');
    expect(result).toEqual(periodo);
  });

  it('throws on DB error', async () => {
    const singleFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });

    await expect(
      batidasPontoService.fecharPeriodo('emp-1', '2026-07-01', '2026-07-31')
    ).rejects.toBeDefined();
  });
});
