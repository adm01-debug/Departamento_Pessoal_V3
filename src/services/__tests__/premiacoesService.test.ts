import { describe, it, expect, vi, beforeEach } from 'vitest';
import { premiacoesService } from '../premiacoesService';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// Thenable chain with order + optional eq (listarCampanhas / listarAuditoria)
function setupOrderChain(data: any[], error: any = null) {
  const response = { data, error };
  const chain: any = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve(response).then(fn);
  chain.catch = (fn: any) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: any) => Promise.resolve(response).finally(fn);
  const orderFn = vi.fn().mockReturnValue(chain);
  const selectFn = vi.fn().mockReturnValue({ order: orderFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, orderFn, chain };
}

// Thenable chain with optional eq + filter (listarPagamentos)
function setupPagamentosChain(data: any[], error: any = null) {
  const response = { data, error };
  const chain: any = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.filter = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve(response).then(fn);
  chain.catch = (fn: any) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: any) => Promise.resolve(response).finally(fn);
  const selectFn = vi.fn().mockReturnValue(chain);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, chain };
}

// select → eq → resolvedValue (listarRegras)
function setupEqResolveChain(data: any[], error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn };
}

// select → order → resolvedValue (listarCenariosROI)
function setupSelectOrderChain(data: any[], error: any = null) {
  const orderFn = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ order: orderFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, orderFn };
}

// insert(d).select().single()
function setupInsertSingleChain(data: any, error: any = null) {
  const singleFn = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ single: singleFn });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, selectFn, singleFn };
}

// insert({...}) resolves directly (enviarNotificacaoCritica)
function setupInsertDirectChain(error: any = null) {
  const insertFn = vi.fn().mockResolvedValue({ error });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn };
}

// select('*').eq('id', id).single()
function makeFetchSingleMock(data: any, error: any = null) {
  const singleFn = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ single: singleFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  return { selectFn, eqFn, singleFn };
}

// update({...}).eq('id', id).select().single()
function makeUpdateSingleMock(data: any, error: any = null) {
  const singleFn = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ single: singleFn });
  const eqFn = vi.fn().mockReturnValue({ select: selectFn });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  return { updateFn, eqFn, selectFn, singleFn };
}

// ─── listarCampanhas ──────────────────────────────────────────────────────────

describe('premiacoesService.listarCampanhas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns campanhas without empresa filter', async () => {
    const records = [{ id: 'c1', nome: 'Campanha Q1' }];
    setupOrderChain(records);
    expect(await premiacoesService.listarCampanhas()).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupOrderChain(null as any);
    expect(await premiacoesService.listarCampanhas()).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupOrderChain([]);
    await premiacoesService.listarCampanhas('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('throws on DB error', async () => {
    setupOrderChain([], { message: 'fail' });
    await expect(premiacoesService.listarCampanhas()).rejects.toBeDefined();
  });
});

// ─── listarRegras ─────────────────────────────────────────────────────────────

describe('premiacoesService.listarRegras', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns regras for campanha', async () => {
    const records = [{ id: 'r1', campanha_id: 'c1' }];
    const { eqFn } = setupEqResolveChain(records);
    const result = await premiacoesService.listarRegras('c1');
    expect(result).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('campanha_id', 'c1');
  });

  it('returns empty array when data is null', async () => {
    setupEqResolveChain(null as any);
    expect(await premiacoesService.listarRegras('c1')).toEqual([]);
  });
});

// ─── listarPagamentos ─────────────────────────────────────────────────────────

describe('premiacoesService.listarPagamentos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns pagamentos without filters', async () => {
    const records = [{ id: 'pg1' }];
    setupPagamentosChain(records);
    expect(await premiacoesService.listarPagamentos()).toEqual(records);
  });

  it('filters by campanha_id when provided', async () => {
    const { chain } = setupPagamentosChain([]);
    await premiacoesService.listarPagamentos('c1');
    expect(chain.eq).toHaveBeenCalledWith('campanha_id', 'c1');
  });

  it('filters by empresa_id using filter() when provided', async () => {
    const { chain } = setupPagamentosChain([]);
    await premiacoesService.listarPagamentos(undefined, 'emp-1');
    expect(chain.filter).toHaveBeenCalledWith('campanha.empresa_id', 'eq', 'emp-1');
  });

  it('returns empty array when data is null', async () => {
    setupPagamentosChain(null as any);
    expect(await premiacoesService.listarPagamentos()).toEqual([]);
  });
});

// ─── criarCampanha ────────────────────────────────────────────────────────────

describe('premiacoesService.criarCampanha', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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
  beforeEach(() => { vi.clearAllMocks(); });

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
  beforeEach(() => { vi.clearAllMocks(); });

  it('fetches, updates and returns pagamento', async () => {
    const original = { id: 'pg1', historico_mudancas: [] };
    const updated = { id: 'pg1', status: 'aprovado' };
    const fetchMock = makeFetchSingleMock(original);
    const updateMock = makeUpdateSingleMock(updated);
    mockFrom.mockReturnValueOnce({ select: fetchMock.selectFn });
    mockFrom.mockReturnValueOnce({ update: updateMock.updateFn });

    const result = await premiacoesService.atualizarStatusPagamento('pg1', 'aprovado', 1000);
    expect(fetchMock.eqFn).toHaveBeenCalledWith('id', 'pg1');
    expect(updateMock.eqFn).toHaveBeenCalledWith('id', 'pg1');
    expect(result).toEqual(updated);
  });

  it('throws when fetch fails', async () => {
    const fetchMock = makeFetchSingleMock(null, { message: 'fail' });
    mockFrom.mockReturnValueOnce({ select: fetchMock.selectFn });
    await expect(premiacoesService.atualizarStatusPagamento('pg1', 'aprovado')).rejects.toBeDefined();
  });

  it('sends notification for rejeitado status', async () => {
    const original = { id: 'pg1', historico_mudancas: [] };
    const updated = { id: 'pg1', status: 'rejeitado' };
    const fetchMock = makeFetchSingleMock(original);
    const updateMock = makeUpdateSingleMock(updated);
    const notifInsertFn = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValueOnce({ select: fetchMock.selectFn });
    mockFrom.mockReturnValueOnce({ update: updateMock.updateFn });
    mockFrom.mockReturnValueOnce({ insert: notifInsertFn });

    await premiacoesService.atualizarStatusPagamento('pg1', 'rejeitado');
    expect(notifInsertFn).toHaveBeenCalled();
  });
});

// ─── reconciliarFolha ─────────────────────────────────────────────────────────

describe('premiacoesService.reconciliarFolha', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('sets status conciliado when valores match', async () => {
    const original = { id: 'pg1', valor_aprovado: 1000, historico_mudancas: [] };
    const updated = { id: 'pg1', status: 'pago', status_conciliacao: 'conciliado' };
    const fetchMock = makeFetchSingleMock(original);
    const updateMock = makeUpdateSingleMock(updated);
    const auditInsertFn = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValueOnce({ select: fetchMock.selectFn });
    mockFrom.mockReturnValueOnce({ update: updateMock.updateFn });
    mockFrom.mockReturnValueOnce({ insert: auditInsertFn });

    const result = await premiacoesService.reconciliarFolha('pg1', 1000);
    expect(result).toEqual(updated);
    expect(auditInsertFn).toHaveBeenCalled();
  });

  it('throws when fetch fails', async () => {
    const fetchMock = makeFetchSingleMock(null, { message: 'fail' });
    mockFrom.mockReturnValueOnce({ select: fetchMock.selectFn });
    await expect(premiacoesService.reconciliarFolha('pg1', 1000)).rejects.toBeDefined();
  });
});

// ─── listarAuditoria ──────────────────────────────────────────────────────────

describe('premiacoesService.listarAuditoria', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns auditoria records', async () => {
    const records = [{ id: 'a1', acao: 'INSERT' }];
    setupOrderChain(records);
    expect(await premiacoesService.listarAuditoria()).toEqual(records);
  });

  it('filters by entidade_id when provided', async () => {
    const { chain } = setupOrderChain([]);
    await premiacoesService.listarAuditoria('pg1');
    expect(chain.eq).toHaveBeenCalledWith('entidade_id', 'pg1');
  });
});

// ─── salvarCenarioROI ─────────────────────────────────────────────────────────

describe('premiacoesService.salvarCenarioROI', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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
    const result = await premiacoesService.salvarCenarioROI(cenario);
    expect(insertFn).toHaveBeenCalled();
    expect(result).toEqual(created);
  });

  it('throws on DB error', async () => {
    setupInsertSingleChain(null, { message: 'fail' });
    await expect(premiacoesService.salvarCenarioROI({})).rejects.toBeDefined();
  });
});

// ─── listarCenariosROI ────────────────────────────────────────────────────────

describe('premiacoesService.listarCenariosROI', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns cenarios ordered by created_at desc', async () => {
    const records = [{ id: 'roi1' }];
    const { orderFn } = setupSelectOrderChain(records);
    const result = await premiacoesService.listarCenariosROI();
    expect(result).toEqual(records);
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
  });
});

// ─── enviarNotificacaoCritica ─────────────────────────────────────────────────

describe('premiacoesService.enviarNotificacaoCritica', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts into notificacoes and returns true', async () => {
    const { insertFn } = setupInsertDirectChain();
    const result = await premiacoesService.enviarNotificacaoCritica('pagamento_aprovado', { id: 'pg1' });
    expect(insertFn).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});
