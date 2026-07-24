import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cnabService, webhookService } from '../integracaoService';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// select → limit → maybeSingle
function setupMaybeSingleChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const limitFn = vi.fn().mockReturnValue({ maybeSingle });
  const selectFn = vi.fn().mockReturnValue({ limit: limitFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, limitFn, maybeSingle };
}

// upsert / insert / delete → await
function setupDirectChain(error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ error });
  const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
  const upsertFn = vi.fn().mockResolvedValue({ error });
  const insertFn = vi.fn().mockResolvedValue({ error });
  mockFrom.mockReturnValue({ upsert: upsertFn, insert: insertFn, delete: deleteFn });
  return { upsertFn, insertFn, deleteFn, eqFn };
}

// select → order → limit → await
function setupOrderLimitChain(data: any[], error: any = null) {
  const response = { data, error };
  const limitFn = vi.fn().mockResolvedValue(response);
  const orderFn = vi.fn().mockReturnValue({ limit: limitFn });
  const selectFn = vi.fn().mockReturnValue({ order: orderFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, orderFn, limitFn };
}

// select → order → await (no limit)
function setupOrderChain(data: any[], error: any = null) {
  const response = { data, error };
  const orderFn = vi.fn().mockResolvedValue(response);
  const selectFn = vi.fn().mockReturnValue({ order: orderFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, orderFn };
}

// ─── cnabService.getConfig ────────────────────────────────────────────────────

describe('cnabService.getConfig', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns config when found', async () => {
    const config = { id: 'c1', banco_nome: 'Bradesco' };
    setupMaybeSingleChain(config);
    const result = await cnabService.getConfig();
    expect(result).toEqual(config);
  });

  it('returns null when no config exists', async () => {
    setupMaybeSingleChain(null);
    const result = await cnabService.getConfig();
    expect(result).toBeNull();
  });

  it('queries cnab_configuracoes with limit 1', async () => {
    const { selectFn, limitFn } = setupMaybeSingleChain(null);
    await cnabService.getConfig();
    expect(mockFrom).toHaveBeenCalledWith('cnab_configuracoes');
    expect(selectFn).toHaveBeenCalledWith('*');
    expect(limitFn).toHaveBeenCalledWith(1);
  });

  it('throws on DB error', async () => {
    setupMaybeSingleChain(null, { message: 'fail' });
    await expect(cnabService.getConfig()).rejects.toBeDefined();
  });
});

// ─── cnabService.saveConfig ───────────────────────────────────────────────────

describe('cnabService.saveConfig', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('upserts the config', async () => {
    const { upsertFn } = setupDirectChain();
    const config = { banco_nome: 'Itaú', agencia: '1234' };
    await cnabService.saveConfig(config);
    expect(mockFrom).toHaveBeenCalledWith('cnab_configuracoes');
    expect(upsertFn).toHaveBeenCalledWith(config);
  });

  it('throws on DB error', async () => {
    const upsertFn = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
    mockFrom.mockReturnValue({ upsert: upsertFn });
    await expect(cnabService.saveConfig({})).rejects.toBeDefined();
  });
});

// ─── cnabService.getRemessas ──────────────────────────────────────────────────

describe('cnabService.getRemessas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns remessas list', async () => {
    const records = [{ id: 'r1' }, { id: 'r2' }];
    setupOrderLimitChain(records);
    const result = await cnabService.getRemessas();
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupOrderLimitChain(null as any);
    const result = await cnabService.getRemessas();
    expect(result).toEqual([]);
  });

  it('queries cnab_remessas ordered by created_at desc with limit 50', async () => {
    const { selectFn, orderFn, limitFn } = setupOrderLimitChain([]);
    await cnabService.getRemessas();
    expect(mockFrom).toHaveBeenCalledWith('cnab_remessas');
    expect(selectFn).toHaveBeenCalledWith('*');
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limitFn).toHaveBeenCalledWith(50);
  });

  it('throws on DB error', async () => {
    setupOrderLimitChain([], { message: 'fail' });
    await expect(cnabService.getRemessas()).rejects.toBeDefined();
  });
});

// ─── webhookService.listar ────────────────────────────────────────────────────

describe('webhookService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns webhooks list', async () => {
    const records = [{ id: 'w1', nome: 'Admissão Hook' }];
    setupOrderChain(records);
    const result = await webhookService.listar();
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupOrderChain(null as any);
    const result = await webhookService.listar();
    expect(result).toEqual([]);
  });

  it('queries webhooks_config ordered by created_at desc', async () => {
    const { selectFn, orderFn } = setupOrderChain([]);
    await webhookService.listar();
    expect(mockFrom).toHaveBeenCalledWith('webhooks_config');
    expect(selectFn).toHaveBeenCalledWith('*');
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('throws on DB error', async () => {
    setupOrderChain([], { message: 'fail' });
    await expect(webhookService.listar()).rejects.toBeDefined();
  });
});

// ─── webhookService.criar ─────────────────────────────────────────────────────

describe('webhookService.criar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts a new webhook config', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: insertFn });
    const payload = { nome: 'My Hook', url: 'https://example.com/hook', eventos: ['admissao'] };
    await webhookService.criar(payload);
    expect(mockFrom).toHaveBeenCalledWith('webhooks_config');
    expect(insertFn).toHaveBeenCalledWith(payload);
  });

  it('throws on DB error', async () => {
    const insertFn = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
    mockFrom.mockReturnValue({ insert: insertFn });
    await expect(webhookService.criar({})).rejects.toBeDefined();
  });
});

// ─── webhookService.excluir ───────────────────────────────────────────────────

describe('webhookService.excluir', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes webhook by id', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ delete: deleteFn });
    await webhookService.excluir('w-1');
    expect(mockFrom).toHaveBeenCalledWith('webhooks_config');
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'w-1');
  });

  it('throws on DB error', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ delete: deleteFn });
    await expect(webhookService.excluir('w-1')).rejects.toBeDefined();
  });
});

// ─── webhookService.getLogs ───────────────────────────────────────────────────

describe('webhookService.getLogs', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns logs list', async () => {
    const records = [{ id: 'l1', status: 200 }];
    setupOrderLimitChain(records);
    const result = await webhookService.getLogs();
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupOrderLimitChain(null as any);
    const result = await webhookService.getLogs();
    expect(result).toEqual([]);
  });

  it('queries webhook_logs ordered by created_at desc with limit 50', async () => {
    const { selectFn, orderFn, limitFn } = setupOrderLimitChain([]);
    await webhookService.getLogs();
    expect(mockFrom).toHaveBeenCalledWith('webhook_logs');
    expect(selectFn).toHaveBeenCalledWith('*');
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limitFn).toHaveBeenCalledWith(50);
  });

  it('throws on DB error', async () => {
    setupOrderLimitChain([], { message: 'fail' });
    await expect(webhookService.getLogs()).rejects.toBeDefined();
  });
});
