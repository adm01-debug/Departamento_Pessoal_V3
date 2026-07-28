import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import { cnabService, webhookService } from '../integracaoService';
import { makeChain } from '@/test/chain';

const EMPRESA_ID = 'test-empresa-id';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => deepChain(mockFrom(...a)) },
}));

/**
 * Chain canônico: cobre qualquer combinação de select/eq/order/limit/maybeSingle
 * sem precisar espelhar a forma exata da query do serviço.
 */
function setupChain(data: any = null, error: any = null) {
  const chain = makeChain({ data, error });
  mockFrom.mockReturnValue(chain);
  return {
    chain,
    selectFn: chain.select,
    orderFn: chain.order,
    limitFn: chain.limit,
    eqFn: chain.eq,
    maybeSingle: chain.maybeSingle,
    upsertFn: chain.upsert,
    insertFn: chain.insert,
    deleteFn: chain.delete,
  };
}

const setupMaybeSingleChain = setupChain;
const setupOrderLimitChain = setupChain;
const setupOrderChain = setupChain;
const setupDirectChain = (error: any = null) => setupChain(null, error);

// ─── cnabService.getConfig ────────────────────────────────────────────────────

describe('cnabService.getConfig', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns config when found', async () => {
    const config = { id: 'c1', banco_nome: 'Bradesco' };
    setupMaybeSingleChain(config);
    const result = await cnabService.getConfig(EMPRESA_ID);
    expect(result).toEqual(config);
  });

  it('returns null when no config exists', async () => {
    setupMaybeSingleChain(null);
    const result = await cnabService.getConfig(EMPRESA_ID);
    expect(result).toBeNull();
  });

  it('queries cnab_configuracoes with limit 1', async () => {
    const { selectFn, limitFn } = setupMaybeSingleChain(null);
    await cnabService.getConfig(EMPRESA_ID);
    expect(mockFrom).toHaveBeenCalledWith('cnab_configuracoes');
    expect(selectFn).toHaveBeenCalledWith(expect.stringContaining('created_at'));
    expect(limitFn).toHaveBeenCalledWith(1);
  });

  it('throws on DB error', async () => {
    setupMaybeSingleChain(null, { message: 'fail' });
    await expect(cnabService.getConfig(EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── cnabService.saveConfig ───────────────────────────────────────────────────

describe('cnabService.saveConfig', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('upserts the config', async () => {
    const { upsertFn } = setupDirectChain();
    const config = { banco_nome: 'Itaú', agencia: '1234' };
    await cnabService.saveConfig(EMPRESA_ID, config);
    expect(mockFrom).toHaveBeenCalledWith('cnab_configuracoes');
    expect(upsertFn).toHaveBeenCalledWith({ ...config, empresa_id: EMPRESA_ID });
  });

  it('throws on DB error', async () => {
    const upsertFn = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
    mockFrom.mockReturnValue({ upsert: upsertFn });
    await expect(cnabService.saveConfig(EMPRESA_ID, {})).rejects.toBeDefined();
  });
});

// ─── cnabService.getRemessas ──────────────────────────────────────────────────

describe('cnabService.getRemessas', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns remessas list', async () => {
    const records = [{ id: 'r1' }, { id: 'r2' }];
    setupOrderLimitChain(records);
    const result = await cnabService.getRemessas(EMPRESA_ID);
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupOrderLimitChain(null as any);
    const result = await cnabService.getRemessas(EMPRESA_ID);
    expect(result).toEqual([]);
  });

  it('queries cnab_remessas ordered by created_at desc with limit 50', async () => {
    const { selectFn, orderFn, limitFn } = setupOrderLimitChain([]);
    await cnabService.getRemessas(EMPRESA_ID);
    expect(mockFrom).toHaveBeenCalledWith('cnab_remessas');
    expect(selectFn).toHaveBeenCalledWith(expect.stringContaining('created_at'));
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limitFn).toHaveBeenCalledWith(50);
  });

  it('throws on DB error', async () => {
    setupOrderLimitChain([], { message: 'fail' });
    await expect(cnabService.getRemessas(EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── webhookService.listar ────────────────────────────────────────────────────

describe('webhookService.listar', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns webhooks list', async () => {
    const records = [{ id: 'w1', nome: 'Admissão Hook' }];
    setupOrderChain(records);
    const result = await webhookService.listar(EMPRESA_ID);
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupOrderChain(null as any);
    const result = await webhookService.listar(EMPRESA_ID);
    expect(result).toEqual([]);
  });

  it('queries webhooks_config ordered by created_at desc', async () => {
    const { selectFn, orderFn } = setupOrderChain([]);
    await webhookService.listar(EMPRESA_ID);
    expect(mockFrom).toHaveBeenCalledWith('webhooks_config');
    expect(selectFn).toHaveBeenCalledWith(expect.stringContaining('created_at'));
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('throws on DB error', async () => {
    setupOrderChain([], { message: 'fail' });
    await expect(webhookService.listar(EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── webhookService.criar ─────────────────────────────────────────────────────

describe('webhookService.criar', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('inserts a new webhook config', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertFn });
    const payload = { nome: 'My Hook', url: 'https://example.com/hook', eventos: ['admissao'] };
    await webhookService.criar(EMPRESA_ID, payload);
    expect(mockFrom).toHaveBeenCalledWith('webhooks_config');
    expect(insertFn).toHaveBeenCalledWith({ ...payload, empresa_id: EMPRESA_ID });
  });

  it('throws on DB error', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
    mockFrom.mockReturnValue({ insert: insertFn });
    await expect(webhookService.criar(EMPRESA_ID, {})).rejects.toBeDefined();
  });
});

// ─── webhookService.excluir ───────────────────────────────────────────────────

describe('webhookService.excluir', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('deletes webhook by id', async () => {
    const { deleteFn, eqFn } = setupChain(null, null);
    await webhookService.excluir(EMPRESA_ID, 'w-1');
    expect(mockFrom).toHaveBeenCalledWith('webhooks_config');
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'w-1');
  });

  it('throws on DB error', async () => {
    setupChain(null, { message: 'fail' });
    await expect(webhookService.excluir(EMPRESA_ID, 'w-1')).rejects.toBeDefined();
  });
});

// ─── webhookService.getLogs ───────────────────────────────────────────────────

describe('webhookService.getLogs', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns logs list', async () => {
    const records = [{ id: 'l1', status: 200 }];
    setupOrderLimitChain(records);
    const result = await webhookService.getLogs(EMPRESA_ID);
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupOrderLimitChain(null as any);
    const result = await webhookService.getLogs(EMPRESA_ID);
    expect(result).toEqual([]);
  });

  it('queries webhook_logs ordered by created_at desc with limit 50', async () => {
    const { selectFn, orderFn, limitFn } = setupOrderLimitChain([]);
    await webhookService.getLogs(EMPRESA_ID);
    expect(mockFrom).toHaveBeenCalledWith('webhook_logs');
    expect(selectFn).toHaveBeenCalledWith(expect.stringContaining('created_at'));
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limitFn).toHaveBeenCalledWith(50);
  });

  it('throws on DB error', async () => {
    setupOrderLimitChain([], { message: 'fail' });
    await expect(webhookService.getLogs(EMPRESA_ID)).rejects.toBeDefined();
  });
});
