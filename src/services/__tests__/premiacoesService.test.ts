import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import { premiacoesService } from '../premiacoesService';
import { makeChain } from '@/test/chain';

const EMPRESA_ID = 'test-empresa-id';

type SelectChain = { eq: ReturnType<typeof vi.fn>; order: ReturnType<typeof vi.fn>; filter: ReturnType<typeof vi.fn> };
type InsertChain = { select: ReturnType<typeof vi.fn>; then: (fn: unknown) => unknown; catch: (fn: unknown) => unknown };

const { mockFrom } = vi.hoisted<{ mockFrom: ReturnType<typeof vi.fn> }>(() => ({
  mockFrom: vi.fn<(table: string) => {
    select: () => SelectChain;
    insert: (data?: unknown) => InsertChain;
    update: (data: unknown) => { eq: ReturnType<typeof vi.fn> };
  }>(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => deepChain(mockFrom(...a)) },
}));

/**
 * Todos os helpers abaixo usam o chain canônico (`makeChain`), que aceita
 * qualquer profundidade de encadeamento do PostgREST. Isso evita que a suíte
 * quebre sempre que um serviço ganha um novo `.eq()` (ex.: isolamento de tenant).
 */
function setupChain(data: any, error: any = null) {
  const chain = makeChain({ data, error });
  mockFrom.mockReturnValue(chain);
  return {
    chain,
    selectFn: chain.select,
    orderFn: chain.order,
    eqFn: chain.eq,
    insertFn: chain.insert,
    updateFn: chain.update,
    singleFn: chain.single,
  };
}

const setupOrderChain = setupChain;
const setupPagamentosChain = setupChain;
const setupEqResolveChain = setupChain;
const setupSelectOrderChain = setupChain;
const setupInsertSingleChain = setupChain;
const setupInsertDirectChain = (error: any = null) => setupChain(null, error);

/** Chain isolado (não registrado no mockFrom) para uso com mockReturnValueOnce. */
function makeStandaloneChain(data: any, error: any = null) {
  const chain = makeChain({ data, error });
  return { chain, selectFn: chain.select, eqFn: chain.eq, singleFn: chain.single, updateFn: chain.update };
}

const makeFetchSingleMock = makeStandaloneChain;
const makeUpdateSingleMock = makeStandaloneChain;

// ─── listarCampanhas ──────────────────────────────────────────────────────────

describe('premiacoesService.listarCampanhas', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns campanhas without empresa filter', async () => {
    const records = [{ id: 'c1', nome: 'Campanha Q1' }];
    setupOrderChain(records);
    expect(await premiacoesService.listarCampanhas(EMPRESA_ID)).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupOrderChain(null as any);
    expect(await premiacoesService.listarCampanhas(EMPRESA_ID)).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupOrderChain([]);
    await premiacoesService.listarCampanhas('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('throws on DB error', async () => {
    setupOrderChain([], { message: 'fail' });
    await expect(premiacoesService.listarCampanhas(EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── listarRegras ─────────────────────────────────────────────────────────────

describe('premiacoesService.listarRegras', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns regras for campanha', async () => {
    const records = [{ id: 'r1', campanha_id: 'c1' }];
    const { eqFn } = setupEqResolveChain(records);
    const result = await premiacoesService.listarRegras('c1', EMPRESA_ID);
    expect(result).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('campanha_id', 'c1');
  });

  it('returns empty array when data is null', async () => {
    setupEqResolveChain(null as any);
    expect(await premiacoesService.listarRegras('c1', EMPRESA_ID)).toEqual([]);
  });
});

// ─── listarPagamentos ─────────────────────────────────────────────────────────

describe('premiacoesService.listarPagamentos', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns pagamentos without filters', async () => {
    const records = [{ id: 'pg1' }];
    setupPagamentosChain(records);
    expect(await premiacoesService.listarPagamentos(undefined, EMPRESA_ID)).toEqual(records);
  });

  it('filters by campanha_id when provided', async () => {
    const { chain } = setupPagamentosChain([]);
    await premiacoesService.listarPagamentos('c1', EMPRESA_ID);
    expect(chain.eq).toHaveBeenCalledWith('campanha_id', 'c1');
  });

  it('escopa por empresa_id via join !inner na campanha', async () => {
    const { chain } = setupPagamentosChain([]);
    await premiacoesService.listarPagamentos(undefined, 'emp-1');
    expect(chain.eq).toHaveBeenCalledWith('campanha.empresa_id', 'emp-1');
  });


  it('returns empty array when data is null', async () => {
    setupPagamentosChain(null as any);
    expect(await premiacoesService.listarPagamentos(undefined, EMPRESA_ID)).toEqual([]);
  });
});

// ─── criarCampanha ────────────────────────────────────────────────────────────

describe('premiacoesService.criarCampanha', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('inserts and returns new campanha', async () => {
    const created = { id: 'c-new', nome: 'Nova Campanha' };
    const { insertFn } = setupInsertSingleChain(created);
    const result = await premiacoesService.criarCampanha({ nome: 'Nova Campanha' });
    expect(insertFn).toHaveBeenCalledWith({ nome: 'Nova Campanha' });
    expect(result).toEqual(created);
  });

  it('throws on DB error', async () => {
    setupInsertSingleChain(null, { message: 'fail' });
    await expect(premiacoesService.criarCampanha({})).rejects.toBeDefined();
  });
});

// ─── criarRegra ───────────────────────────────────────────────────────────────

describe('premiacoesService.criarRegra', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('inserts and returns new regra', async () => {
    const created = { id: 'r-new', tipo: 'metas' };
    const { insertFn } = setupInsertSingleChain(created);
    const result = await premiacoesService.criarRegra({ tipo: 'metas' });
    expect(insertFn).toHaveBeenCalledWith({ tipo: 'metas' });
    expect(result).toEqual(created);
  });
});

// ─── atualizarStatusPagamento ────────────────────────────────────────────────

describe('premiacoesService.atualizarStatusPagamento', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('fetches, updates and returns pagamento', async () => {
    const original = { id: 'pg1', historico_mudancas: [] };
    const updated = { id: 'pg1', status: 'aprovado' };
    const fetchMock = makeFetchSingleMock(original);
    const updateMock = makeUpdateSingleMock(updated);
    mockFrom.mockReturnValueOnce(fetchMock.chain);
    mockFrom.mockReturnValueOnce(updateMock.chain);

    const result = await premiacoesService.atualizarStatusPagamento('pg1', 'aprovado', EMPRESA_ID, 1000);
    expect(fetchMock.eqFn).toHaveBeenCalledWith('id', 'pg1');
    expect(updateMock.eqFn).toHaveBeenCalledWith('id', 'pg1');
    expect(result).toEqual(updated);
  });

  it('throws when fetch fails', async () => {
    const fetchMock = makeFetchSingleMock(null, { message: 'fail' });
    mockFrom.mockReturnValueOnce(fetchMock.chain);
    await expect(premiacoesService.atualizarStatusPagamento('pg1', 'aprovado', EMPRESA_ID)).rejects.toBeDefined();
  });

  it('sends notification for rejeitado status', async () => {
    const original = { id: 'pg1', historico_mudancas: [] };
    const updated = { id: 'pg1', status: 'rejeitado' };
    const fetchMock = makeFetchSingleMock(original);
    const updateMock = makeUpdateSingleMock(updated);
    const notifChain = makeChain({ error: null });
    const notifInsertFn = notifChain.insert;
    mockFrom.mockReturnValueOnce(fetchMock.chain);
    mockFrom.mockReturnValueOnce(updateMock.chain);
    mockFrom.mockReturnValueOnce(notifChain);

    await premiacoesService.atualizarStatusPagamento('pg1', 'rejeitado', EMPRESA_ID);
    expect(notifInsertFn).toHaveBeenCalled();
  });
});

// ─── reconciliarFolha ─────────────────────────────────────────────────────────

describe('premiacoesService.reconciliarFolha', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('sets status conciliado when valores match', async () => {
    const original = { id: 'pg1', valor_aprovado: 1000, historico_mudancas: [] };
    const updated = { id: 'pg1', status: 'pago', status_conciliacao: 'conciliado' };
    const fetchMock = makeFetchSingleMock(original);
    const updateMock = makeUpdateSingleMock(updated);
    const auditChain = makeChain({ error: null });
    const auditInsertFn = auditChain.insert;
    mockFrom.mockReturnValueOnce(fetchMock.chain);
    mockFrom.mockReturnValueOnce(updateMock.chain);
    mockFrom.mockReturnValueOnce(auditChain);

    const result = await premiacoesService.reconciliarFolha('pg1', 1000, EMPRESA_ID);
    expect(result).toEqual(updated);
    expect(auditInsertFn).toHaveBeenCalled();
  });

  it('throws when fetch fails', async () => {
    const fetchMock = makeFetchSingleMock(null, { message: 'fail' });
    mockFrom.mockReturnValueOnce(fetchMock.chain);
    await expect(premiacoesService.reconciliarFolha('pg1', 1000, EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── listarAuditoria ──────────────────────────────────────────────────────────

describe('premiacoesService.listarAuditoria', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns auditoria records', async () => {
    const records = [{ id: 'a1', acao: 'INSERT' }];
    setupOrderChain(records);
    expect(await premiacoesService.listarAuditoria(undefined, EMPRESA_ID)).toEqual(records);
  });

  it('filters by entidade_id when provided', async () => {
    const { chain } = setupOrderChain([]);
    await premiacoesService.listarAuditoria('pg1', EMPRESA_ID);
    expect(chain.eq).toHaveBeenCalledWith('entidade_id', 'pg1');
  });
});

// ─── salvarCenarioROI ─────────────────────────────────────────────────────────

describe('premiacoesService.salvarCenarioROI', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('inserts cenario and returns result', async () => {
    const created = { id: 'roi-new' };
    const { insertFn } = setupInsertSingleChain(created);
    const cenario = {
      name: 'Teste ROI',
      employees: 100,
      avgSalary: 5000,
      bonusPercent: 10,
      performanceLevel: 80,
      retentionImpact: 5,
      totalBudget: 50000,
      savings: 10000,
      roi: 20,
    };
    const result = await premiacoesService.salvarCenarioROI(cenario, EMPRESA_ID);
    expect(insertFn).toHaveBeenCalled();
    expect(result).toEqual(created);
  });

  it('throws on DB error', async () => {
    setupInsertSingleChain(null, { message: 'fail' });
    await expect(premiacoesService.salvarCenarioROI({}, EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── listarCenariosROI ────────────────────────────────────────────────────────

describe('premiacoesService.listarCenariosROI', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns cenarios ordered by created_at desc', async () => {
    const records = [{ id: 'roi1' }];
    const { orderFn } = setupSelectOrderChain(records);
    const result = await premiacoesService.listarCenariosROI(EMPRESA_ID);
    expect(result).toEqual(records);
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
  });
});

// ─── enviarNotificacaoCritica ─────────────────────────────────────────────────

describe('premiacoesService.enviarNotificacaoCritica', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('inserts into notificacoes and returns true', async () => {
    const { insertFn } = setupInsertDirectChain();
    const result = await premiacoesService.enviarNotificacaoCritica('pagamento_aprovado', { id: 'pg1' });
    expect(insertFn).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});
