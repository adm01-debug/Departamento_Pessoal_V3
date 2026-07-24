import { describe, it, expect, vi, beforeEach } from 'vitest';
import { beneficioService } from '../beneficioService';

// ─── hoisted mocks ────────────────────────────────────────────────────────────

const { mockFrom, mockLog, mockLoggerError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockLog: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/utils/auditLogger', () => ({
  auditLogger: { log: mockLog },
}));

vi.mock('../loggerService', () => ({
  loggerService: { error: mockLoggerError },
}));

// ─── chain helpers ────────────────────────────────────────────────────────────

// listar: select → chain{eq, ilike} → order → resolvedValue with {data, count, error}
function setupListarChain(data: any[], count = 0, error: any = null) {
  const chain: any = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.ilike = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockResolvedValue({ data, count, error });
  const selectFn = vi.fn().mockReturnValue(chain);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, chain };
}

// listComAdesao: select → eq → resolvedValue
function setupListComAdesaoChain(data: any[], error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn };
}

// insert → select → maybeSingle (used by BaseService.criar)
function makeInsertMaybeSingleMock(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  return { insertFn, selectFn, maybeSingle };
}

// select → eq → maybeSingle (used by BaseService.buscarPorId)
function makeBuscarMock(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ maybeSingle });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  return { selectFn, eqFn, maybeSingle };
}

// update → eq → select → maybeSingle (used by BaseService.atualizar)
function makeUpdateMaybeSingleMock(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const eqFn = vi.fn().mockReturnValue({ select: selectFn });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  return { updateFn, eqFn, selectFn, maybeSingle };
}

// delete → eq → resolvedValue (used by BaseService.excluir)
function makeDeleteEqMock(error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ error });
  const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
  return { deleteFn, eqFn };
}

// insert → select → single (used by vincularColaborador)
function makeInsertSingleMock(data: any, error: any = null) {
  const singleFn = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ single: singleFn });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  return { insertFn, singleFn };
}

// select → eq(s) → resolvedValue
function makeSelectEqMock(data: any[], error: any = null, eqCount = 1) {
  const resolved = vi.fn().mockResolvedValue({ data, error });
  let chain: any = resolved;
  for (let i = 0; i < eqCount; i++) {
    const prev = chain;
    chain = { eq: vi.fn().mockReturnValue(i === eqCount - 1 ? prev : { eq: vi.fn() }) };
  }
  // rebuild properly
  if (eqCount === 1) {
    const eqFn = vi.fn().mockResolvedValue({ data, error });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    return { selectFn, eqFns: [eqFn] };
  }
  // eqCount === 2
  const eq2Fn = vi.fn().mockResolvedValue({ data, error });
  const eq1Fn = vi.fn().mockReturnValue({ eq: eq2Fn });
  const selectFn = vi.fn().mockReturnValue({ eq: eq1Fn });
  return { selectFn, eqFns: [eq1Fn, eq2Fn] };
}

// ─── listar ───────────────────────────────────────────────────────────────────

describe('beneficioService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns data and total without filters', async () => {
    const records = [{ id: 'b1', nome: 'VT' }];
    setupListarChain(records, 1);
    const result = await beneficioService.listar();
    expect(result).toEqual({ data: records, total: 1 });
  });

  it('returns empty data when null', async () => {
    setupListarChain(null as any, 0);
    const result = await beneficioService.listar();
    expect(result).toEqual({ data: [], total: 0 });
  });

  it('applies empresa_id filter when provided in filters', async () => {
    const { chain } = setupListarChain([]);
    await beneficioService.listar({ filters: { empresa_id: 'emp-1' } });
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('applies ilike search when search provided', async () => {
    const { chain } = setupListarChain([]);
    await beneficioService.listar({ search: 'vale' });
    expect(chain.ilike).toHaveBeenCalledWith('nome', '%vale%');
  });

  it('orders by nome', async () => {
    const { chain } = setupListarChain([]);
    await beneficioService.listar();
    expect(chain.order).toHaveBeenCalledWith('nome');
  });

  it('throws on DB error', async () => {
    setupListarChain([], 0, { message: 'fail' });
    await expect(beneficioService.listar()).rejects.toBeDefined();
  });
});

// ─── listComAdesao ────────────────────────────────────────────────────────────

describe('beneficioService.listComAdesao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('queries with empresa_id and returns data', async () => {
    const records = [{ id: 'b1', beneficios_colaborador: [{ count: 3 }] }];
    const { eqFn } = setupListComAdesaoChain(records);
    const result = await beneficioService.listComAdesao('emp-1');
    expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-1');
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListComAdesaoChain(null as any);
    const result = await beneficioService.listComAdesao('emp-1');
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupListComAdesaoChain([], { message: 'fail' });
    await expect(beneficioService.listComAdesao('emp-1')).rejects.toBeDefined();
  });
});

// ─── criar ────────────────────────────────────────────────────────────────────

describe('beneficioService.criar', () => {
  beforeEach(() => { vi.clearAllMocks(); mockLog.mockResolvedValue(undefined); });

  it('inserts beneficio and logs audit INSERT', async () => {
    const created = { id: 'b-new', nome: 'VR', tipo: 'alimentacao' };
    const { insertFn } = makeInsertMaybeSingleMock(created);
    mockFrom.mockReturnValue({ insert: insertFn });

    const result = await beneficioService.criar({ nome: 'VR' });
    expect(result).toEqual(created);
    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({
      tabela: 'beneficios',
      acao: 'INSERT',
      dados_novos: created,
    }));
  });

  it('throws wrapped error on DB failure', async () => {
    const { insertFn } = makeInsertMaybeSingleMock(null, { message: 'DB fail' });
    mockFrom.mockReturnValue({ insert: insertFn });
    await expect(beneficioService.criar({})).rejects.toThrow();
  });
});

// ─── atualizar ────────────────────────────────────────────────────────────────

describe('beneficioService.atualizar', () => {
  beforeEach(() => { vi.clearAllMocks(); mockLog.mockResolvedValue(undefined); });

  it('fetches anterior, updates and logs audit UPDATE', async () => {
    const anterior = { id: 'b1', nome: 'VT' };
    const updated = { id: 'b1', nome: 'VT Plus' };

    const buscarMock = makeBuscarMock(anterior);
    const updateMock = makeUpdateMaybeSingleMock(updated);

    mockFrom
      .mockReturnValueOnce({ select: buscarMock.selectFn })
      .mockReturnValueOnce({ update: updateMock.updateFn });

    const result = await beneficioService.atualizar('b1', { nome: 'VT Plus' });
    expect(result).toEqual(updated);
    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({
      tabela: 'beneficios',
      acao: 'UPDATE',
      dados_anteriores: anterior,
      dados_novos: updated,
    }));
  });

  it('throws wrapped error when buscarPorId fails', async () => {
    const buscarMock = makeBuscarMock(null, { message: 'not found' });
    mockFrom.mockReturnValue({ select: buscarMock.selectFn });
    await expect(beneficioService.atualizar('b1', {})).rejects.toThrow();
  });
});

// ─── excluir ──────────────────────────────────────────────────────────────────

describe('beneficioService.excluir', () => {
  beforeEach(() => { vi.clearAllMocks(); mockLog.mockResolvedValue(undefined); });

  it('fetches anterior, deletes and logs audit DELETE', async () => {
    const anterior = { id: 'b1', nome: 'VT' };
    const buscarMock = makeBuscarMock(anterior);
    const deleteMock = makeDeleteEqMock();

    mockFrom
      .mockReturnValueOnce({ select: buscarMock.selectFn })
      .mockReturnValueOnce({ delete: deleteMock.deleteFn });

    await beneficioService.excluir('b1');
    expect(deleteMock.eqFn).toHaveBeenCalledWith('id', 'b1');
    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({
      tabela: 'beneficios',
      acao: 'DELETE',
      dados_anteriores: anterior,
    }));
  });

  it('throws wrapped error on DB failure', async () => {
    const buscarMock = makeBuscarMock(null, { message: 'fail' });
    mockFrom.mockReturnValue({ select: buscarMock.selectFn });
    await expect(beneficioService.excluir('b1')).rejects.toThrow();
  });
});

// ─── vincularColaborador ──────────────────────────────────────────────────────

describe('beneficioService.vincularColaborador', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts into beneficios_colaborador and returns data', async () => {
    const vinculo = { id: 'v1', beneficio_id: 'b1', colaborador_id: 'c1' };
    const { insertFn, singleFn } = makeInsertSingleMock(vinculo);
    mockFrom.mockReturnValue({ insert: insertFn });

    const result = await beneficioService.vincularColaborador('b1', 'c1', { valor: 100 });
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
      beneficio_id: 'b1',
      colaborador_id: 'c1',
      valor: 100,
    }));
    expect(result).toEqual(vinculo);
  });

  it('throws on DB error', async () => {
    const { insertFn } = makeInsertSingleMock(null, { message: 'fail' });
    mockFrom.mockReturnValue({ insert: insertFn });
    await expect(beneficioService.vincularColaborador('b1', 'c1', {})).rejects.toBeDefined();
  });
});

// ─── listarPorColaborador ─────────────────────────────────────────────────────

describe('beneficioService.listarPorColaborador', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('queries by colaborador_id and returns data', async () => {
    const records = [{ id: 'v1', beneficio: { nome: 'VT' } }];
    const eqFn = vi.fn().mockResolvedValue({ data: records, error: null });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ select: selectFn });

    const result = await beneficioService.listarPorColaborador('c1');
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    const eqFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ select: selectFn });
    expect(await beneficioService.listarPorColaborador('c1')).toEqual([]);
  });

  it('throws on DB error', async () => {
    const eqFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ select: selectFn });
    await expect(beneficioService.listarPorColaborador('c1')).rejects.toBeDefined();
  });
});

// ─── obterResumoCustos ────────────────────────────────────────────────────────

describe('beneficioService.obterResumoCustos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  function setupResumoCustos(data: any[], error: any = null) {
    const eq2Fn = vi.fn().mockResolvedValue({ data, error });
    const eq1Fn = vi.fn().mockReturnValue({ eq: eq2Fn });
    const selectFn = vi.fn().mockReturnValue({ eq: eq1Fn });
    mockFrom.mockReturnValue({ select: selectFn });
    return { selectFn, eq1Fn, eq2Fn };
  }

  it('returns empty object when no data', async () => {
    setupResumoCustos([]);
    const result = await beneficioService.obterResumoCustos('emp-1');
    expect(result).toEqual({});
  });

  it('groups costs by tipo', async () => {
    const data = [
      { valor_empresa: 100, valor_colaborador: 50, beneficio: { tipo: 'alimentacao' } },
      { valor_empresa: 200, valor_colaborador: 100, beneficio: { tipo: 'alimentacao' } },
      { valor_empresa: 300, valor_colaborador: 0, beneficio: { tipo: 'transporte' } },
    ];
    setupResumoCustos(data);
    const result = await beneficioService.obterResumoCustos('emp-1');
    expect(result.alimentacao).toEqual({ empresa: 300, colaborador: 150, total: 450 });
    expect(result.transporte).toEqual({ empresa: 300, colaborador: 0, total: 300 });
  });

  it('groups null tipo as Outros', async () => {
    const data = [
      { valor_empresa: 50, valor_colaborador: 25, beneficio: { tipo: null } },
    ];
    setupResumoCustos(data);
    const result = await beneficioService.obterResumoCustos('emp-1');
    expect(result['Outros']).toEqual({ empresa: 50, colaborador: 25, total: 75 });
  });

  it('filters by empresa_id and status_vinculo', async () => {
    const { eq1Fn, eq2Fn } = setupResumoCustos([]);
    await beneficioService.obterResumoCustos('emp-1');
    expect(eq1Fn).toHaveBeenCalledWith('beneficio.empresa_id', 'emp-1');
    expect(eq2Fn).toHaveBeenCalledWith('status_vinculo', 'ativo');
  });

  it('returns empty object when data is null', async () => {
    setupResumoCustos(null as any);
    const result = await beneficioService.obterResumoCustos('emp-1');
    expect(result).toEqual({});
  });

  it('throws on DB error', async () => {
    setupResumoCustos([], { message: 'fail' });
    await expect(beneficioService.obterResumoCustos('emp-1')).rejects.toBeDefined();
  });
});
