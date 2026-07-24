import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pesquisaService } from '../pesquisaService';

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

// Eq chain for listarPerguntas/listarRespostas (select → eq → order → await)
function setupEqOrderChain(data: any[], error: any = null) {
  const orderFn = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ order: orderFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, orderFn };
}

// Simple eq chain (select → eq → await)
function setupEqChain(data: any[], error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn };
}

// ─── listar ───────────────────────────────────────────────────────────────────

describe('pesquisaService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns pesquisas without empresa filter', async () => {
    const records = [{ id: 'p1', titulo: 'Clima Org' }];
    setupListChain(records);
    expect(await pesquisaService.listar()).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    expect(await pesquisaService.listar()).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await pesquisaService.listar('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(pesquisaService.listar()).rejects.toBeDefined();
  });
});

// ─── criar ────────────────────────────────────────────────────────────────────

describe('pesquisaService.criar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new pesquisa', async () => {
    const created = { id: 'p-new', titulo: 'NPS' };
    const { insertFn } = setupInsertChain(created);
    const result = await pesquisaService.criar({ titulo: 'NPS' });
    expect(insertFn).toHaveBeenCalledWith({ titulo: 'NPS' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(pesquisaService.criar({})).rejects.toThrow();
  });
});

// ─── atualizar ────────────────────────────────────────────────────────────────

describe('pesquisaService.atualizar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns pesquisa', async () => {
    const updated = { id: 'p1', status: 'publicada' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await pesquisaService.atualizar('p1', { status: 'publicada' });
    expect(updateFn).toHaveBeenCalledWith({ status: 'publicada' });
    expect(eqFn).toHaveBeenCalledWith('id', 'p1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(pesquisaService.atualizar('p1', {})).rejects.toThrow();
  });
});

// ─── excluir ──────────────────────────────────────────────────────────────────

describe('pesquisaService.excluir', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes pesquisa by id', async () => {
    const { deleteFn, eqFn } = setupDeleteChain();
    await pesquisaService.excluir('p1');
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'p1');
  });
});

// ─── listarPerguntas ──────────────────────────────────────────────────────────

describe('pesquisaService.listarPerguntas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns perguntas for given pesquisaId', async () => {
    const records = [{ id: 'q1', texto: 'Como você avalia?' }];
    const { eqFn } = setupEqOrderChain(records);
    const result = await pesquisaService.listarPerguntas('p1');
    expect(result).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('pesquisa_id', 'p1');
  });

  it('returns empty array when data is null', async () => {
    setupEqOrderChain(null as any);
    expect(await pesquisaService.listarPerguntas('p1')).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupEqOrderChain([], { message: 'fail' });
    await expect(pesquisaService.listarPerguntas('p1')).rejects.toBeDefined();
  });
});

// ─── criarPergunta ────────────────────────────────────────────────────────────

describe('pesquisaService.criarPergunta', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new pergunta', async () => {
    const created = { id: 'q-new', texto: 'Nova pergunta' };
    const { insertFn } = setupInsertChain(created);
    const result = await pesquisaService.criarPergunta({ texto: 'Nova pergunta' });
    expect(insertFn).toHaveBeenCalledWith({ texto: 'Nova pergunta' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(pesquisaService.criarPergunta({})).rejects.toThrow();
  });
});

// ─── excluirPergunta ──────────────────────────────────────────────────────────

describe('pesquisaService.excluirPergunta', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes pergunta by id', async () => {
    const { eqFn } = setupDeleteChain();
    await pesquisaService.excluirPergunta('q1');
    expect(eqFn).toHaveBeenCalledWith('id', 'q1');
  });
});

// ─── enviarResposta ───────────────────────────────────────────────────────────

describe('pesquisaService.enviarResposta', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new resposta', async () => {
    const created = { id: 'r-new' };
    const { insertFn } = setupInsertChain(created);
    const result = await pesquisaService.enviarResposta({ pesquisa_id: 'p1', nota: 8 });
    expect(insertFn).toHaveBeenCalledWith({ pesquisa_id: 'p1', nota: 8 });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(pesquisaService.enviarResposta({})).rejects.toThrow();
  });
});

// ─── listarRespostas ──────────────────────────────────────────────────────────

describe('pesquisaService.listarRespostas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns respostas for given pesquisaId', async () => {
    const records = [{ id: 'r1', nota: 9 }];
    const { eqFn } = setupEqChain(records);
    const result = await pesquisaService.listarRespostas('p1');
    expect(result).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('pesquisa_id', 'p1');
  });

  it('returns empty array when data is null', async () => {
    setupEqChain(null as any);
    expect(await pesquisaService.listarRespostas('p1')).toEqual([]);
  });
});
