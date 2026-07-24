import { describe, it, expect, vi, beforeEach } from 'vitest';
import { comunicacaoService } from '../comunicacaoService';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

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

function setupInsertChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, selectFn, maybeSingle };
}

function setupUpdateChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const eqFn = vi.fn().mockReturnValue({ select: selectFn });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn, selectFn, maybeSingle };
}

function setupDeleteChain(error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ error });
  const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ delete: deleteFn });
  return { deleteFn, eqFn };
}

// ─── listarComunicados ────────────────────────────────────────────────────────

describe('comunicacaoService.listarComunicados', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns all comunicados without empresa filter', async () => {
    const records = [{ id: 'c1', titulo: 'Aviso' }];
    setupListChain(records);
    const result = await comunicacaoService.listarComunicados();
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await comunicacaoService.listarComunicados();
    expect(result).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await comunicacaoService.listarComunicados('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('orders by created_at descending', async () => {
    const { chain } = setupListChain([]);
    await comunicacaoService.listarComunicados();
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(comunicacaoService.listarComunicados()).rejects.toBeDefined();
  });
});

// ─── criarComunicado ──────────────────────────────────────────────────────────

describe('comunicacaoService.criarComunicado', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new comunicado', async () => {
    const created = { id: 'c-new', titulo: 'Aviso Geral' };
    const { insertFn } = setupInsertChain(created);
    const result = await comunicacaoService.criarComunicado({ titulo: 'Aviso Geral' });
    expect(insertFn).toHaveBeenCalledWith({ titulo: 'Aviso Geral' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(comunicacaoService.criarComunicado({})).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupInsertChain(null, { message: 'fail' });
    await expect(comunicacaoService.criarComunicado({})).rejects.toBeDefined();
  });
});

// ─── atualizarComunicado ──────────────────────────────────────────────────────

describe('comunicacaoService.atualizarComunicado', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns comunicado', async () => {
    const updated = { id: 'c1', publicado: true };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await comunicacaoService.atualizarComunicado('c1', { publicado: true });
    expect(updateFn).toHaveBeenCalledWith({ publicado: true });
    expect(eqFn).toHaveBeenCalledWith('id', 'c1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(comunicacaoService.atualizarComunicado('c1', {})).rejects.toThrow();
  });
});

// ─── excluirComunicado ────────────────────────────────────────────────────────

describe('comunicacaoService.excluirComunicado', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes comunicado by id', async () => {
    const { deleteFn, eqFn } = setupDeleteChain();
    await comunicacaoService.excluirComunicado('c1');
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'c1');
  });

  it('throws on DB error', async () => {
    setupDeleteChain({ message: 'fail' });
    await expect(comunicacaoService.excluirComunicado('c1')).rejects.toBeDefined();
  });
});

// ─── marcarLido ───────────────────────────────────────────────────────────────

describe('comunicacaoService.marcarLido', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts leitura record', async () => {
    const { insertFn } = setupInsertChain({ id: 'l1' });
    await comunicacaoService.marcarLido('c1', 'u1');
    expect(mockFrom).toHaveBeenCalledWith('comunicados_leituras');
    expect(insertFn).toHaveBeenCalledWith({ comunicado_id: 'c1', usuario_id: 'u1' });
  });

  it('throws on DB error', async () => {
    setupInsertChain(null, { message: 'fail' });
    await expect(comunicacaoService.marcarLido('c1', 'u1')).rejects.toBeDefined();
  });
});

// ─── listarDenuncias ──────────────────────────────────────────────────────────

describe('comunicacaoService.listarDenuncias', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns all denuncias without empresa filter', async () => {
    const records = [{ id: 'd1', tipo: 'assedio' }];
    setupListChain(records);
    const result = await comunicacaoService.listarDenuncias();
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await comunicacaoService.listarDenuncias();
    expect(result).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await comunicacaoService.listarDenuncias('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(comunicacaoService.listarDenuncias()).rejects.toBeDefined();
  });
});

// ─── criarDenuncia ────────────────────────────────────────────────────────────

describe('comunicacaoService.criarDenuncia', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new denuncia', async () => {
    const created = { id: 'd-new', tipo: 'fraude' };
    const { insertFn } = setupInsertChain(created);
    const result = await comunicacaoService.criarDenuncia({ tipo: 'fraude' });
    expect(insertFn).toHaveBeenCalledWith({ tipo: 'fraude' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(comunicacaoService.criarDenuncia({})).rejects.toThrow();
  });
});

// ─── atualizarDenuncia ────────────────────────────────────────────────────────

describe('comunicacaoService.atualizarDenuncia', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns denuncia', async () => {
    const updated = { id: 'd1', status: 'em_analise' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await comunicacaoService.atualizarDenuncia('d1', { status: 'em_analise' });
    expect(updateFn).toHaveBeenCalledWith({ status: 'em_analise' });
    expect(eqFn).toHaveBeenCalledWith('id', 'd1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(comunicacaoService.atualizarDenuncia('d1', {})).rejects.toThrow();
  });
});
