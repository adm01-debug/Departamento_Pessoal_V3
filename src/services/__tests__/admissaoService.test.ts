import { describe, it, expect, vi, beforeEach } from 'vitest';
import { admissaoService } from '../admissaoService';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom, mockLoggerError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('../loggerService', () => ({
  loggerService: { error: mockLoggerError },
}));

// Helper: select → order → (optional eq) → await
// The chain must be both awaitable and chainable for .eq()
function setupListarAdmissoesChain(data: any[], error: any = null) {
  const response = { data, error };
  const chain: any = {};
  chain.eq = vi.fn().mockResolvedValue(response);
  chain.then = (fn: any) => Promise.resolve(response).then(fn);
  chain.catch = (fn: any) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: any) => Promise.resolve(response).finally(fn);
  const orderFn = vi.fn().mockReturnValue(chain);
  const selectFn = vi.fn().mockReturnValue({ order: orderFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, orderFn, chain };
}

// Helper for criar (insert → select → maybeSingle)
function setupCriarChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, selectFn, maybeSingle };
}

// Helper for atualizar without versioning (update → eq → select → maybeSingle)
function setupAtualizarChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const eqFn = vi.fn().mockReturnValue({ select: selectFn });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn, selectFn, maybeSingle };
}

// ─── listarAdmissoes ──────────────────────────────────────────────────────────

describe('admissaoService.listarAdmissoes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns all admissoes when no empresaId', async () => {
    const records = [{ id: 'adm-1', nome_candidato: 'João' }];
    const { chain } = setupListarAdmissoesChain(records);
    const result = await admissaoService.listarAdmissoes();
    expect(result).toEqual(records);
    expect(chain.eq).not.toHaveBeenCalled();
  });

  it('returns empty array when supabase returns null', async () => {
    setupListarAdmissoesChain(null as any);
    const result = await admissaoService.listarAdmissoes();
    expect(result).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListarAdmissoesChain([]);
    await admissaoService.listarAdmissoes('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('orders by data_prevista descending', async () => {
    const { orderFn } = setupListarAdmissoesChain([]);
    await admissaoService.listarAdmissoes();
    expect(orderFn).toHaveBeenCalledWith('data_prevista', { ascending: false });
  });

  it('throws on DB error', async () => {
    setupListarAdmissoesChain([], { message: 'DB fail' });
    await expect(admissaoService.listarAdmissoes()).rejects.toBeDefined();
  });
});

// ─── listar ───────────────────────────────────────────────────────────────────

describe('admissaoService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns { data, total } delegating to listarAdmissoes', async () => {
    const records = [{ id: 'adm-2' }, { id: 'adm-3' }];
    setupListarAdmissoesChain(records);
    const result = await admissaoService.listar({});
    expect(result.data).toEqual(records);
    expect(result.total).toBe(2);
  });

  it('passes empresa_id from filters', async () => {
    const { chain } = setupListarAdmissoesChain([]);
    await admissaoService.listar({ filters: { empresa_id: 'emp-2' } });
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-2');
  });
});

// ─── getAll (alias) ───────────────────────────────────────────────────────────

describe('admissaoService.getAll', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('delegates to listarAdmissoes', async () => {
    const records = [{ id: 'adm-4' }];
    setupListarAdmissoesChain(records);
    const result = await admissaoService.getAll('emp-3');
    expect(result).toEqual(records);
  });
});

// ─── create ───────────────────────────────────────────────────────────────────

describe('admissaoService.create', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns the created record', async () => {
    const created = { id: 'new-adm', nome_candidato: 'Maria' };
    setupCriarChain(created);
    const result = await admissaoService.create({ nome_candidato: 'Maria' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupCriarChain(null);
    await expect(admissaoService.create({})).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupCriarChain(null, { message: 'fail' });
    await expect(admissaoService.create({})).rejects.toBeDefined();
  });
});

// ─── concluir ─────────────────────────────────────────────────────────────────

describe('admissaoService.concluir', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls update with etapa=concluida', async () => {
    const updated = { id: 'adm-1', etapa: 'concluida' };
    const { updateFn } = setupAtualizarChain(updated);
    await admissaoService.concluir('adm-1');
    expect(updateFn).toHaveBeenCalledWith({ etapa: 'concluida' });
  });

  it('throws on DB error', async () => {
    setupAtualizarChain(null, { message: 'fail' });
    await expect(admissaoService.concluir('adm-1')).rejects.toBeDefined();
  });
});

// ─── cancelar ─────────────────────────────────────────────────────────────────

describe('admissaoService.cancelar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls update with etapa=cancelada', async () => {
    const updated = { id: 'adm-1', etapa: 'cancelada' };
    const { updateFn } = setupAtualizarChain(updated);
    await admissaoService.cancelar('adm-1');
    expect(updateFn).toHaveBeenCalledWith({ etapa: 'cancelada' });
  });

  it('throws on DB error', async () => {
    setupAtualizarChain(null, { message: 'fail' });
    await expect(admissaoService.cancelar('adm-1')).rejects.toBeDefined();
  });
});
