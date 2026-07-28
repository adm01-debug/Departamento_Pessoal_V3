import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { deepChain } from '@/test/deepChain';
import { beneficioService } from '../beneficioService';
import { makeChain } from '@/test/chain';

const EMPRESA_ID = 'test-empresa-id';

// ─── hoisted mocks (P2-049: tipados com vi.fn<T>) ──────────────────────────────────

type DbResponse<T> = Promise<{ data: T | null; error: Error | null }>;
type SelectChain = { eq: ReturnType<typeof vi.fn>; order: ReturnType<typeof vi.fn>; ilike: ReturnType<typeof vi.fn> };
type InsertChain = { select: ReturnType<typeof vi.fn> };
type UpdateChain = { eq: ReturnType<typeof vi.fn> };
type DeleteChain = { eq: ReturnType<typeof vi.fn> };

const { mockFrom, mockLog, mockLoggerError } = vi.hoisted<{
  mockFrom: Mock<(table: string) => any>;
  mockLog: ReturnType<typeof vi.fn>;
  mockLoggerError: ReturnType<typeof vi.fn>;
}>(() => ({
  mockFrom: vi.fn<(table: string) => {
    select: () => SelectChain;
    insert: (data: unknown) => InsertChain;
    update: (data: unknown) => UpdateChain;
    delete: () => DeleteChain;
  }>(),
  mockLog: vi.fn<() => Promise<void>>(),
  mockLoggerError: vi.fn<() => void>(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => deepChain(mockFrom(...a)) },
}));

vi.mock('@/utils/auditLogger', () => ({
  auditLogger: { log: mockLog },
}));

vi.mock('../loggerService', () => ({
  loggerService: { error: mockLoggerError },
}));

// ─── chain helpers (canônicos) ───────────────────────────────────────────────
/**
 * Todos os helpers derivam de `makeChain`, que aceita qualquer profundidade de
 * encadeamento PostgREST — inclusive os `.eq()` extras introduzidos pelo
 * isolamento multi-tenant.
 */
function setupChain(data: any = null, extra: Record<string, unknown> = {}) {
  const chain = makeChain({ data, ...extra } as any);
  mockFrom.mockReturnValue(chain);
  return {
    chain,
    selectFn: chain.select,
    eqFn: chain.eq,
    eqFns: [chain.eq, chain.eq],
    orderFn: chain.order,
    insertFn: chain.insert,
    updateFn: chain.update,
    deleteFn: chain.delete,
    maybeSingle: chain.maybeSingle,
    singleFn: chain.single,
  };
}

/** Chain isolado, para uso com `mockReturnValueOnce`. */
function standaloneChain(data: any = null, error: any = null) {
  const chain = makeChain({ data, error });
  return {
    chain,
    selectFn: chain.select,
    eqFn: chain.eq,
    eqFns: [chain.eq, chain.eq],
    insertFn: chain.insert,
    updateFn: chain.update,
    deleteFn: chain.delete,
    maybeSingle: chain.maybeSingle,
    singleFn: chain.single,
  };
}

const setupListarChain = (data: any[], count = 0, error: any = null) =>
  setupChain(data, { count, error });
const setupListComAdesaoChain = (data: any[], error: any = null) => setupChain(data, { error });
const makeInsertMaybeSingleMock = standaloneChain;
const makeBuscarMock = standaloneChain;
const makeUpdateMaybeSingleMock = standaloneChain;
const makeDeleteEqMock = (error: any = null) => standaloneChain(null, error);
const makeInsertSingleMock = standaloneChain;
const makeSelectEqMock = (data: any[], error: any = null, _eqCount = 1) => standaloneChain(data, error);

// ─── listar ───────────────────────────────────────────────────────────────────

describe('beneficioService.listar', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns data and total without filters', async () => {
    const records = [{ id: 'b1', nome: 'VT' }];
    setupListarChain(records, 1);
    const result = await beneficioService.listar({ filters: { empresa_id: EMPRESA_ID } });
    expect(result).toEqual({ data: records, total: 1 });
  });

  it('returns empty data when null', async () => {
    setupListarChain(null as any, 0);
    const result = await beneficioService.listar({ filters: { empresa_id: EMPRESA_ID } });
    expect(result).toEqual({ data: [], total: 0 });
  });

  it('applies empresa_id filter when provided in filters', async () => {
    const { chain } = setupListarChain([]);
    await beneficioService.listar({ filters: { empresa_id: 'emp-1' } });
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('applies ilike search when search provided', async () => {
    const { chain } = setupListarChain([]);
    await beneficioService.listar({ search: 'vale', filters: { empresa_id: EMPRESA_ID } });
    expect(chain.ilike).toHaveBeenCalledWith('nome', '%vale%');
  });

  it('orders by nome', async () => {
    const { chain } = setupListarChain([]);
    await beneficioService.listar({ filters: { empresa_id: EMPRESA_ID } });
    expect(chain.order).toHaveBeenCalledWith('nome');
  });

  it('throws on DB error', async () => {
    setupListarChain([], 0, { message: 'fail' });
    await expect(beneficioService.listar({ filters: { empresa_id: EMPRESA_ID } })).rejects.toBeDefined();
  });
});

// ─── listComAdesao ────────────────────────────────────────────────────────────

describe('beneficioService.listComAdesao', () => {
  beforeEach(() => { vi.resetAllMocks(); });

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

    const result = await beneficioService.atualizar('b1', { nome: 'VT Plus' }, EMPRESA_ID);
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
    mockFrom.mockReturnValue(buscarMock.chain);
    await expect(beneficioService.atualizar('b1', {}, EMPRESA_ID)).rejects.toThrow();
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

    await beneficioService.excluir('b1', EMPRESA_ID);
    expect(deleteMock.eqFn).toHaveBeenCalledWith('id', 'b1');
    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({
      tabela: 'beneficios',
      acao: 'DELETE',
      dados_anteriores: anterior,
    }));
  });

  it('throws wrapped error on DB failure', async () => {
    const buscarMock = makeBuscarMock(null, { message: 'fail' });
    mockFrom.mockReturnValue(buscarMock.chain);
    await expect(beneficioService.excluir('b1', EMPRESA_ID)).rejects.toThrow();
  });
});

// ─── vincularColaborador ──────────────────────────────────────────────────────

describe('beneficioService.vincularColaborador', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('inserts into beneficios_colaborador and returns data', async () => {
    const vinculo = { id: 'v1', beneficio_id: 'b1', colaborador_id: 'c1' };
    const { insertFn, singleFn } = makeInsertSingleMock(vinculo);
    mockFrom.mockReturnValue({ insert: insertFn });

    const result = await beneficioService.vincularColaborador('b1', 'c1', { valor: 100 }, EMPRESA_ID);
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
    await expect(beneficioService.vincularColaborador('b1', 'c1', {}, EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── listarPorColaborador ─────────────────────────────────────────────────────

describe('beneficioService.listarPorColaborador', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('queries by colaborador_id and returns data', async () => {
    const records = [{ id: 'v1', beneficio: { nome: 'VT' } }];
    const { eqFn } = setupChain(records, { error: null });

    const result = await beneficioService.listarPorColaborador('c1', EMPRESA_ID);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupChain(null, { error: null });
    expect(await beneficioService.listarPorColaborador('c1', EMPRESA_ID)).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupChain(null, { error: { message: 'fail' } });
    await expect(beneficioService.listarPorColaborador('c1', EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── obterResumoCustos ────────────────────────────────────────────────────────

describe('beneficioService.obterResumoCustos', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  function setupResumoCustos(data: any[], error: any = null) {
    const { chain, selectFn } = setupChain(data, { error });
    return { selectFn, eq1Fn: chain.eq, eq2Fn: chain.eq };
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
