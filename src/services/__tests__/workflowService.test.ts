import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workflowService } from '../workflowService';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// Helper: thenable list chain (select → order → optional eq → await)
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

// Helper: insert/update → ... → maybeSingle
function setupWriteChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  return { maybeSingle, selectFn };
}

function setupInsertChain(data: any, error: any = null) {
  const { maybeSingle, selectFn } = setupWriteChain(data, error);
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, selectFn, maybeSingle };
}

function setupUpdateChain(data: any, error: any = null) {
  const { maybeSingle, selectFn } = setupWriteChain(data, error);
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

// ─── listarDefinicoes ─────────────────────────────────────────────────────────

describe('workflowService.listarDefinicoes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns definitions without empresa filter', async () => {
    const records = [{ id: 'wf-1', nome: 'Admissão' }];
    setupListChain(records);
    const result = await workflowService.listarDefinicoes();
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await workflowService.listarDefinicoes();
    expect(result).toEqual([]);
  });

  it('applies empresa_id filter when provided', async () => {
    const { chain } = setupListChain([]);
    await workflowService.listarDefinicoes('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('orders by created_at descending', async () => {
    const { chain } = setupListChain([]);
    await workflowService.listarDefinicoes();
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(workflowService.listarDefinicoes()).rejects.toBeDefined();
  });
});

// ─── criarDefinicao ───────────────────────────────────────────────────────────

describe('workflowService.criarDefinicao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns the new definition', async () => {
    const created = { id: 'wf-new', nome: 'Férias' };
    const { insertFn } = setupInsertChain(created);
    const result = await workflowService.criarDefinicao({ nome: 'Férias' });
    expect(insertFn).toHaveBeenCalledWith({ nome: 'Férias' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(workflowService.criarDefinicao({})).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupInsertChain(null, { message: 'fail' });
    await expect(workflowService.criarDefinicao({})).rejects.toBeDefined();
  });
});

// ─── atualizarDefinicao ───────────────────────────────────────────────────────

describe('workflowService.atualizarDefinicao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates with id eq and returns updated definition', async () => {
    const updated = { id: 'wf-1', nome: 'Atualizado' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await workflowService.atualizarDefinicao('wf-1', { nome: 'Atualizado' });
    expect(updateFn).toHaveBeenCalledWith({ nome: 'Atualizado' });
    expect(eqFn).toHaveBeenCalledWith('id', 'wf-1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(workflowService.atualizarDefinicao('wf-1', {})).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupUpdateChain(null, { message: 'fail' });
    await expect(workflowService.atualizarDefinicao('wf-1', {})).rejects.toBeDefined();
  });
});

// ─── excluirDefinicao ─────────────────────────────────────────────────────────

describe('workflowService.excluirDefinicao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls delete with given id', async () => {
    const { deleteFn, eqFn } = setupDeleteChain();
    await workflowService.excluirDefinicao('wf-1');
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'wf-1');
  });

  it('throws on DB error', async () => {
    setupDeleteChain({ message: 'fail' });
    await expect(workflowService.excluirDefinicao('wf-1')).rejects.toBeDefined();
  });
});

// ─── listarEtapas ─────────────────────────────────────────────────────────────

describe('workflowService.listarEtapas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns etapas filtered by workflowId', async () => {
    const records = [{ id: 'et-1', workflow_id: 'wf-1', ordem: 1 }];
    const { chain } = setupListChain(records);
    const result = await workflowService.listarEtapas('wf-1');
    expect(result).toEqual(records);
    expect(chain.eq).toHaveBeenCalledWith('workflow_id', 'wf-1');
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await workflowService.listarEtapas('wf-1');
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(workflowService.listarEtapas('wf-1')).rejects.toBeDefined();
  });
});

// ─── criarEtapa ───────────────────────────────────────────────────────────────

describe('workflowService.criarEtapa', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns the new step', async () => {
    const created = { id: 'et-new', workflow_id: 'wf-1', nome: 'Revisão' };
    const { insertFn } = setupInsertChain(created);
    const result = await workflowService.criarEtapa({ workflow_id: 'wf-1', nome: 'Revisão' });
    expect(insertFn).toHaveBeenCalledWith({ workflow_id: 'wf-1', nome: 'Revisão' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(workflowService.criarEtapa({})).rejects.toThrow();
  });
});

// ─── excluirEtapa ─────────────────────────────────────────────────────────────

describe('workflowService.excluirEtapa', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls delete with given id', async () => {
    const { eqFn } = setupDeleteChain();
    await workflowService.excluirEtapa('et-1');
    expect(eqFn).toHaveBeenCalledWith('id', 'et-1');
  });

  it('throws on DB error', async () => {
    setupDeleteChain({ message: 'fail' });
    await expect(workflowService.excluirEtapa('et-1')).rejects.toBeDefined();
  });
});

// ─── listarExecucoes ──────────────────────────────────────────────────────────

describe('workflowService.listarExecucoes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns execucoes with workflow join', async () => {
    const records = [{ id: 'ex-1', workflow: { nome: 'Admissão' } }];
    const { selectFn } = setupListChain(records);
    const result = await workflowService.listarExecucoes();
    expect(result).toEqual(records);
    expect(selectFn).toHaveBeenCalledWith(
      expect.stringContaining('workflow:workflows_definicoes')
    );
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await workflowService.listarExecucoes('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(workflowService.listarExecucoes()).rejects.toBeDefined();
  });
});

// ─── criarExecucao ────────────────────────────────────────────────────────────

describe('workflowService.criarExecucao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new execution', async () => {
    const created = { id: 'ex-new', workflow_id: 'wf-1' };
    const { insertFn } = setupInsertChain(created);
    const result = await workflowService.criarExecucao({ workflow_id: 'wf-1' });
    expect(insertFn).toHaveBeenCalledWith({ workflow_id: 'wf-1' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(workflowService.criarExecucao({})).rejects.toThrow();
  });
});

// ─── atualizarExecucao ────────────────────────────────────────────────────────

describe('workflowService.atualizarExecucao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates execution and returns updated record', async () => {
    const updated = { id: 'ex-1', status: 'concluida' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await workflowService.atualizarExecucao('ex-1', { status: 'concluida' });
    expect(updateFn).toHaveBeenCalledWith({ status: 'concluida' });
    expect(eqFn).toHaveBeenCalledWith('id', 'ex-1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(workflowService.atualizarExecucao('ex-1', {})).rejects.toThrow();
  });
});

// ─── registrarHistorico ───────────────────────────────────────────────────────

describe('workflowService.registrarHistorico', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns history record', async () => {
    const created = { id: 'hist-1', execucao_id: 'ex-1', acao: 'aprovado' };
    const { insertFn } = setupInsertChain(created);
    const result = await workflowService.registrarHistorico({ execucao_id: 'ex-1', acao: 'aprovado' });
    expect(insertFn).toHaveBeenCalledWith({ execucao_id: 'ex-1', acao: 'aprovado' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(workflowService.registrarHistorico({})).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupInsertChain(null, { message: 'fail' });
    await expect(workflowService.registrarHistorico({})).rejects.toBeDefined();
  });
});
