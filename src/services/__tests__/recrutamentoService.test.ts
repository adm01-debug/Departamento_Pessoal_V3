import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recrutamentoService } from '../recrutamentoService';

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

// ─── Vagas ────────────────────────────────────────────────────────────────────

describe('recrutamentoService.listarVagas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns vagas without empresa filter', async () => {
    const records = [{ id: 'v1', titulo: 'Dev Senior' }];
    setupListChain(records);
    expect(await recrutamentoService.listarVagas()).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    expect(await recrutamentoService.listarVagas()).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await recrutamentoService.listarVagas('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(recrutamentoService.listarVagas()).rejects.toBeDefined();
  });
});

describe('recrutamentoService.criarVaga', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new vaga', async () => {
    const created = { id: 'v-new', titulo: 'Analista' };
    const { insertFn } = setupInsertChain(created);
    const result = await recrutamentoService.criarVaga({ titulo: 'Analista' });
    expect(insertFn).toHaveBeenCalledWith({ titulo: 'Analista' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(recrutamentoService.criarVaga({})).rejects.toThrow();
  });
});

describe('recrutamentoService.atualizarVaga', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns vaga', async () => {
    const updated = { id: 'v1', status: 'fechada' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await recrutamentoService.atualizarVaga('v1', { status: 'fechada' });
    expect(updateFn).toHaveBeenCalledWith({ status: 'fechada' });
    expect(eqFn).toHaveBeenCalledWith('id', 'v1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(recrutamentoService.atualizarVaga('v1', {})).rejects.toThrow();
  });
});

describe('recrutamentoService.excluirVaga', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes vaga by id', async () => {
    const { eqFn } = setupDeleteChain();
    await recrutamentoService.excluirVaga('v1');
    expect(eqFn).toHaveBeenCalledWith('id', 'v1');
  });
});

// ─── Candidatos ───────────────────────────────────────────────────────────────

describe('recrutamentoService.listarCandidatos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns candidatos without empresa filter', async () => {
    const records = [{ id: 'ca1', nome: 'João' }];
    setupListChain(records);
    expect(await recrutamentoService.listarCandidatos()).toEqual(records);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await recrutamentoService.listarCandidatos('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    expect(await recrutamentoService.listarCandidatos()).toEqual([]);
  });
});

describe('recrutamentoService.criarCandidato', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new candidato', async () => {
    const created = { id: 'ca-new', nome: 'Maria' };
    const { insertFn } = setupInsertChain(created);
    const result = await recrutamentoService.criarCandidato({ nome: 'Maria' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(recrutamentoService.criarCandidato({})).rejects.toThrow();
  });
});

describe('recrutamentoService.atualizarCandidato', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns candidato', async () => {
    const updated = { id: 'ca1', status: 'aprovado' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await recrutamentoService.atualizarCandidato('ca1', { status: 'aprovado' });
    expect(updateFn).toHaveBeenCalledWith({ status: 'aprovado' });
    expect(eqFn).toHaveBeenCalledWith('id', 'ca1');
    expect(result).toEqual(updated);
  });
});

describe('recrutamentoService.excluirCandidato', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes candidato by id', async () => {
    const { eqFn } = setupDeleteChain();
    await recrutamentoService.excluirCandidato('ca1');
    expect(eqFn).toHaveBeenCalledWith('id', 'ca1');
  });
});

// ─── Candidaturas ─────────────────────────────────────────────────────────────

describe('recrutamentoService.listarCandidaturas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns candidaturas without vaga filter', async () => {
    const records = [{ id: 'cu1' }];
    setupListChain(records);
    expect(await recrutamentoService.listarCandidaturas()).toEqual(records);
  });

  it('filters by vaga_id when provided', async () => {
    const { chain } = setupListChain([]);
    await recrutamentoService.listarCandidaturas('v1');
    expect(chain.eq).toHaveBeenCalledWith('vaga_id', 'v1');
  });

  it('includes candidato and vaga joins', async () => {
    const { selectFn } = setupListChain([]);
    await recrutamentoService.listarCandidaturas();
    expect(selectFn).toHaveBeenCalledWith(
      expect.stringContaining('candidato:candidatos')
    );
    expect(selectFn).toHaveBeenCalledWith(
      expect.stringContaining('vaga:vagas')
    );
  });
});

describe('recrutamentoService.criarCandidatura', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new candidatura', async () => {
    const created = { id: 'cu-new', vaga_id: 'v1', candidato_id: 'ca1' };
    const { insertFn } = setupInsertChain(created);
    const result = await recrutamentoService.criarCandidatura({ vaga_id: 'v1', candidato_id: 'ca1' });
    expect(result).toEqual(created);
  });
});

describe('recrutamentoService.atualizarCandidatura', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns candidatura', async () => {
    const updated = { id: 'cu1', etapa: 'entrevista' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await recrutamentoService.atualizarCandidatura('cu1', { etapa: 'entrevista' });
    expect(updateFn).toHaveBeenCalledWith({ etapa: 'entrevista' });
    expect(eqFn).toHaveBeenCalledWith('id', 'cu1');
    expect(result).toEqual(updated);
  });
});

describe('recrutamentoService.excluirCandidatura', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes candidatura by id', async () => {
    const { eqFn } = setupDeleteChain();
    await recrutamentoService.excluirCandidatura('cu1');
    expect(eqFn).toHaveBeenCalledWith('id', 'cu1');
  });
});

// ─── Entrevistas / Testes / Anotações ────────────────────────────────────────

describe('recrutamentoService.agendarEntrevista', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new entrevista', async () => {
    const created = { id: 'e-new', data: '2026-07-30' };
    const { insertFn } = setupInsertChain(created);
    const result = await recrutamentoService.agendarEntrevista({ data: '2026-07-30' });
    expect(result).toEqual(created);
  });
});

describe('recrutamentoService.registrarTeste', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new teste', async () => {
    const created = { id: 't-new', tipo: 'tecnico' };
    const { insertFn } = setupInsertChain(created);
    const result = await recrutamentoService.registrarTeste({ tipo: 'tecnico' });
    expect(result).toEqual(created);
  });
});

describe('recrutamentoService.adicionarAnotacao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new anotacao', async () => {
    const created = { id: 'a-new', texto: 'Bom candidato' };
    const { insertFn } = setupInsertChain(created);
    const result = await recrutamentoService.adicionarAnotacao({ texto: 'Bom candidato' });
    expect(result).toEqual(created);
  });
});
