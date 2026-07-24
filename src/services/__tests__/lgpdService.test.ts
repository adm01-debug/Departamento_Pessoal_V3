import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lgpdService } from '../lgpdService';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// Thenable list chain (select → order → optional eq → await)
function setupListChain(data: any[], error: any = null) {
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

// Insert chain (insert → select → maybeSingle)
function setupInsertChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, selectFn, maybeSingle };
}

// Update chain (update → eq → select → maybeSingle)
function setupUpdateChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const eqFn = vi.fn().mockReturnValue({ select: selectFn });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn, selectFn, maybeSingle };
}

// ─── listarConsentimentos ─────────────────────────────────────────────────────

describe('lgpdService.listarConsentimentos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns consentimentos without empresa filter', async () => {
    const records = [{ id: 'lgc-1', aceito: true }];
    setupListChain(records);
    const result = await lgpdService.listarConsentimentos();
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await lgpdService.listarConsentimentos();
    expect(result).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await lgpdService.listarConsentimentos('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('orders by created_at descending', async () => {
    const { chain } = setupListChain([]);
    await lgpdService.listarConsentimentos();
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('selects with colaborador join', async () => {
    const { selectFn } = setupListChain([]);
    await lgpdService.listarConsentimentos();
    expect(selectFn).toHaveBeenCalledWith(
      expect.stringContaining('colaborador:colaboradores')
    );
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(lgpdService.listarConsentimentos()).rejects.toBeDefined();
  });
});

// ─── criarConsentimento ───────────────────────────────────────────────────────

describe('lgpdService.criarConsentimento', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns the new consentimento', async () => {
    const created = { id: 'lgc-new', aceito: true };
    const { insertFn } = setupInsertChain(created);
    const result = await lgpdService.criarConsentimento({ aceito: true, colaborador_id: 'c1' });
    expect(insertFn).toHaveBeenCalledWith({ aceito: true, colaborador_id: 'c1' });
    expect(result).toEqual(created);
  });

  it('throws when data is null (no record returned)', async () => {
    setupInsertChain(null);
    await expect(lgpdService.criarConsentimento({})).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupInsertChain(null, { message: 'fail' });
    await expect(lgpdService.criarConsentimento({})).rejects.toBeDefined();
  });
});

// ─── revogarConsentimento ─────────────────────────────────────────────────────

describe('lgpdService.revogarConsentimento', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates aceito=false and sets revogado_em', async () => {
    const updated = { id: 'lgc-1', aceito: false };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    await lgpdService.revogarConsentimento('lgc-1');
    const updateArgs = (updateFn as any).mock.calls[0][0];
    expect(updateArgs.aceito).toBe(false);
    expect(updateArgs.revogado_em).toBeDefined();
    expect(eqFn).toHaveBeenCalledWith('id', 'lgc-1');
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(lgpdService.revogarConsentimento('lgc-1')).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupUpdateChain(null, { message: 'fail' });
    await expect(lgpdService.revogarConsentimento('lgc-1')).rejects.toBeDefined();
  });
});

// ─── listarSolicitacoes ───────────────────────────────────────────────────────

describe('lgpdService.listarSolicitacoes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns solicitacoes without empresa filter', async () => {
    const records = [{ id: 'lgs-1', tipo: 'exclusao' }];
    setupListChain(records);
    const result = await lgpdService.listarSolicitacoes();
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await lgpdService.listarSolicitacoes();
    expect(result).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await lgpdService.listarSolicitacoes('emp-2');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-2');
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(lgpdService.listarSolicitacoes()).rejects.toBeDefined();
  });
});

// ─── criarSolicitacao ─────────────────────────────────────────────────────────

describe('lgpdService.criarSolicitacao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns the new solicitacao', async () => {
    const created = { id: 'lgs-new', tipo: 'portabilidade' };
    const { insertFn } = setupInsertChain(created);
    const result = await lgpdService.criarSolicitacao({ tipo: 'portabilidade' });
    expect(insertFn).toHaveBeenCalledWith({ tipo: 'portabilidade' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(lgpdService.criarSolicitacao({})).rejects.toThrow();
  });
});

// ─── atualizarSolicitacao ─────────────────────────────────────────────────────

describe('lgpdService.atualizarSolicitacao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns the updated solicitacao', async () => {
    const updated = { id: 'lgs-1', status: 'concluida' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await lgpdService.atualizarSolicitacao('lgs-1', { status: 'concluida' });
    expect(updateFn).toHaveBeenCalledWith({ status: 'concluida' });
    expect(eqFn).toHaveBeenCalledWith('id', 'lgs-1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(lgpdService.atualizarSolicitacao('lgs-1', {})).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupUpdateChain(null, { message: 'fail' });
    await expect(lgpdService.atualizarSolicitacao('lgs-1', {})).rejects.toBeDefined();
  });
});
