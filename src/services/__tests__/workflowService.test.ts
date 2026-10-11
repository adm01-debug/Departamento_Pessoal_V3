import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import { workflowService } from '../workflowService';
import { makeChain } from '@/test/chain';

const EMPRESA_ID = '00000000-0000-4000-8000-000000000001';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => deepChain(mockFrom(...a)) },
}));

// Helper: thenable list chain (select → order → optional eq → await)
function setupListChain(data: unknown, error: { message: string; code?: string } | null = null) {
  const response = { data, error };
  const chain: Record<string, unknown> = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.then = (fn: (v?: unknown) => unknown) => Promise.resolve(response).then(fn);
  chain.catch = (fn: (v?: unknown) => unknown) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: (v?: unknown) => unknown) => Promise.resolve(response).finally(fn);
  const selectFn = vi.fn().mockReturnValue(chain);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, chain };
}

// Helper: insert/update → ... → maybeSingle
function setupWriteChain(data: unknown, error: { message: string; code?: string } | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  return { maybeSingle, selectFn };
}

function setupInsertChain(data: unknown, error: { message: string; code?: string } | null = null) {
  const { maybeSingle, selectFn } = setupWriteChain(data, error);
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, selectFn, maybeSingle };
}

function setupUpdateChain(data: unknown, error: { message: string; code?: string } | null = null) {
  const { maybeSingle, selectFn } = setupWriteChain(data, error);
  const eqFn = vi.fn();
  const __eqChain = { select: selectFn, eq: eqFn };
  eqFn.mockReturnValue(__eqChain);
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn, selectFn, maybeSingle };
}

function setupDeleteChain(error: { message: string; code?: string } | null = null) {
  const eqFn = vi.fn();
  const __delChain = {
    then: (r: (v?: unknown) => unknown) => Promise.resolve({ error }).then(r),
    catch: (r: (v?: unknown) => unknown) => Promise.resolve({ error }).catch(r),
    finally: (r: (v?: unknown) => unknown) => Promise.resolve({ error }).finally(r),
    eq: eqFn,
  };
  eqFn.mockReturnValue(__delChain);
  const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ delete: deleteFn });
  return { deleteFn, eqFn };
}

// ─── listarDefinicoes ─────────────────────────────────────────────────────────

describe('workflowService.listarDefinicoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns definitions without empresa filter', async () => {
    const records = [{ id: '00000000-0000-4000-8000-000000000007', nome: 'Admissão' }];
    setupListChain(records);
    const result = await workflowService.listarDefinicoes(EMPRESA_ID);
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as never);
    const result = await workflowService.listarDefinicoes(EMPRESA_ID);
    expect(result).toEqual([]);
  });

  it('applies empresa_id filter when provided', async () => {
    const { chain } = setupListChain([]);
    await workflowService.listarDefinicoes('00000000-0000-4000-8000-000000000001');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', '00000000-0000-4000-8000-000000000001');
  });

  it('orders by created_at descending', async () => {
    const { chain } = setupListChain([]);
    await workflowService.listarDefinicoes(EMPRESA_ID);
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(workflowService.listarDefinicoes(EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── criarDefinicao ───────────────────────────────────────────────────────────

describe('workflowService.criarDefinicao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates with id eq and returns updated definition', async () => {
    const updated = { id: '00000000-0000-4000-8000-000000000007', nome: 'Atualizado' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await workflowService.atualizarDefinicao(
      '00000000-0000-4000-8000-000000000007',
      { nome: 'Atualizado' },
      EMPRESA_ID
    );
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Atualizado', updated_at: expect.any(String) })
    );
    expect(eqFn).toHaveBeenCalledWith('id', '00000000-0000-4000-8000-000000000007');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(
      workflowService.atualizarDefinicao('00000000-0000-4000-8000-000000000007', {}, EMPRESA_ID)
    ).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupUpdateChain(null, { message: 'fail' });
    await expect(
      workflowService.atualizarDefinicao('00000000-0000-4000-8000-000000000007', {}, EMPRESA_ID)
    ).rejects.toBeDefined();
  });
});

// ─── excluirDefinicao ─────────────────────────────────────────────────────────

describe('workflowService.excluirDefinicao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls delete with given id', async () => {
    const { deleteFn, eqFn } = setupDeleteChain();
    await workflowService.excluirDefinicao('00000000-0000-4000-8000-000000000007', EMPRESA_ID);
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', '00000000-0000-4000-8000-000000000007');
  });

  it('throws on DB error', async () => {
    setupDeleteChain({ message: 'fail' });
    await expect(
      workflowService.excluirDefinicao('00000000-0000-4000-8000-000000000007', EMPRESA_ID)
    ).rejects.toBeDefined();
  });
});

// ─── listarEtapas ─────────────────────────────────────────────────────────────

describe('workflowService.listarEtapas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns etapas filtered by workflowId', async () => {
    const records = [{ id: 'et-1', workflow_id: '00000000-0000-4000-8000-000000000007', ordem: 1 }];
    const { chain } = setupListChain(records);
    const result = await workflowService.listarEtapas('00000000-0000-4000-8000-000000000007');
    expect(result).toEqual(records);
    expect(chain.eq).toHaveBeenCalledWith('workflow_id', '00000000-0000-4000-8000-000000000007');
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as never);
    const result = await workflowService.listarEtapas('00000000-0000-4000-8000-000000000007');
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(workflowService.listarEtapas('00000000-0000-4000-8000-000000000007')).rejects.toBeDefined();
  });
});

// ─── criarEtapa ───────────────────────────────────────────────────────────────

describe('workflowService.criarEtapa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns the new step', async () => {
    const created = { id: 'et-new', workflow_id: '00000000-0000-4000-8000-000000000007', nome: 'Revisão' };
    const { insertFn } = setupInsertChain(created);
    const result = await workflowService.criarEtapa({
      workflow_id: '00000000-0000-4000-8000-000000000007',
      nome: 'Revisão',
    });
    expect(insertFn).toHaveBeenCalledWith({ workflow_id: '00000000-0000-4000-8000-000000000007', nome: 'Revisão' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(workflowService.criarEtapa({})).rejects.toThrow();
  });
});

// ─── excluirEtapa ─────────────────────────────────────────────────────────────

describe('workflowService.excluirEtapa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls delete with given id', async () => {
    const { eqFn } = setupDeleteChain();
    await workflowService.excluirEtapa('00000000-0000-4000-8000-000000000007', 'et-1');
    expect(eqFn).toHaveBeenCalledWith('id', 'et-1');
  });

  it('throws on DB error', async () => {
    setupDeleteChain({ message: 'fail' });
    await expect(workflowService.excluirEtapa('00000000-0000-4000-8000-000000000007', 'et-1')).rejects.toBeDefined();
  });
});

// ─── listarExecucoes ──────────────────────────────────────────────────────────

describe('workflowService.listarExecucoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns execucoes with workflow join', async () => {
    const records = [{ id: 'ex-1', workflow: { nome: 'Admissão' } }];
    const { selectFn } = setupListChain(records);
    const result = await workflowService.listarExecucoes(EMPRESA_ID);
    expect(result).toEqual(records);
    expect(selectFn).toHaveBeenCalledWith(expect.stringContaining('workflow:workflows_definicoes'));
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await workflowService.listarExecucoes('00000000-0000-4000-8000-000000000001');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', '00000000-0000-4000-8000-000000000001');
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(workflowService.listarExecucoes(EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── criarExecucao ────────────────────────────────────────────────────────────

describe('workflowService.criarExecucao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns new execution', async () => {
    const created = { id: 'ex-new', workflow_id: '00000000-0000-4000-8000-000000000007' };
    const { insertFn } = setupInsertChain(created);
    const result = await workflowService.criarExecucao({ workflow_id: '00000000-0000-4000-8000-000000000007' });
    expect(insertFn).toHaveBeenCalledWith({ workflow_id: '00000000-0000-4000-8000-000000000007' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(workflowService.criarExecucao({})).rejects.toThrow();
  });
});

// ─── atualizarExecucao ────────────────────────────────────────────────────────

describe('workflowService.atualizarExecucao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates execution and returns updated record', async () => {
    const updated = { id: 'ex-1', status: 'concluida' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await workflowService.atualizarExecucao('ex-1', { status: 'concluida' }, EMPRESA_ID);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'concluida', updated_at: expect.any(String) })
    );
    expect(eqFn).toHaveBeenCalledWith('id', 'ex-1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(workflowService.atualizarExecucao('ex-1', {}, EMPRESA_ID)).rejects.toThrow();
  });
});

// ─── registrarHistorico ───────────────────────────────────────────────────────

describe('workflowService.registrarHistorico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

// ─── motor de execução (fila de chains por tabela) ───────────────────────────

type Chain = ReturnType<typeof makeChain>;

/** Cada `from(tabela)` consome o próximo chain da fila daquela tabela. */
function queueTables(queues: Record<string, Chain[]>) {
  mockFrom.mockImplementation((table: string) => {
    const q = queues[table];
    return q && q.length > 0 ? q.shift() : makeChain({ data: null, error: null });
  });
}

const ok = (data: unknown) => makeChain({ data, error: null });
const WF = 'wf-1';
const ETAPA1 = { id: 'et-1', workflow_id: WF, nome: 'Gestor', tipo: 'aprovacao', ordem: 1, config: { sla_horas: 24 } };
const ETAPA2 = { id: 'et-2', workflow_id: WF, nome: 'RH', tipo: 'aprovacao', ordem: 2, config: null };
const EXEC = {
  id: 'ex-1',
  workflow_id: WF,
  etapa_atual_id: 'et-1',
  entidade_tipo: 'ferias',
  entidade_id: 'fer-1',
  status: 'em_andamento',
  empresa_id: EMPRESA_ID,
  sla_iniciado_em: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-01T00:00:00.000Z',
};

describe('workflowService.executarWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('valida parâmetros obrigatórios (tenant, workflow, entidade)', async () => {
    await expect(workflowService.executarWorkflow(WF, 'ferias', 'fer-1', '', 'u-1')).rejects.toThrow('empresa_id');
    await expect(workflowService.executarWorkflow('', 'ferias', 'fer-1', EMPRESA_ID, 'u-1')).rejects.toThrow(
      'workflow_id'
    );
    await expect(workflowService.executarWorkflow(WF, '', 'fer-1', EMPRESA_ID, 'u-1')).rejects.toThrow('entidade_tipo');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('retorna execução ativa existente (idempotência) sem inserir', async () => {
    queueTables({ workflows_execucoes: [ok(EXEC)] });
    const r = await workflowService.executarWorkflow(WF, 'ferias', 'fer-1', EMPRESA_ID, 'u-1');
    expect(r).toEqual(EXEC);
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('lança quando workflow não existe ou está desativado', async () => {
    queueTables({ workflows_execucoes: [ok(null)], workflows_definicoes: [ok(null)] });
    await expect(workflowService.executarWorkflow(WF, 'ferias', 'fer-1', EMPRESA_ID, 'u-1')).rejects.toThrow(
      'não encontrado'
    );
    queueTables({ workflows_execucoes: [ok(null)], workflows_definicoes: [ok({ id: WF, ativo: false })] });
    await expect(workflowService.executarWorkflow(WF, 'ferias', 'fer-1', EMPRESA_ID, 'u-1')).rejects.toThrow(
      'desativado'
    );
  });

  it('lança quando workflow não tem etapa de ordem 1', async () => {
    queueTables({
      workflows_execucoes: [ok(null)],
      workflows_definicoes: [ok({ id: WF, ativo: true })],
      workflows_etapas: [ok(null)],
    });
    await expect(workflowService.executarWorkflow(WF, 'ferias', 'fer-1', EMPRESA_ID, 'u-1')).rejects.toThrow(
      'não tem etapas'
    );
  });

  it('cria execução na primeira etapa com SLA iniciado e registra histórico com idempotencyKey', async () => {
    const insertExec = ok(EXEC);
    const insertHist = ok(null);
    queueTables({
      workflows_execucoes: [ok(null), insertExec],
      workflows_definicoes: [ok({ id: WF, ativo: true })],
      workflows_etapas: [ok(ETAPA1)],
      workflows_historico: [insertHist],
    });
    const r = await workflowService.executarWorkflow(WF, 'ferias', 'fer-1', EMPRESA_ID, 'u-1', { dias: 10 }, 'key-9');
    expect(r).toEqual(EXEC);
    expect(insertExec.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow_id: WF,
        etapa_atual_id: 'et-1',
        status: 'em_andamento',
        empresa_id: EMPRESA_ID,
        dados: { dias: 10 },
        sla_iniciado_em: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      })
    );
    expect(insertHist.insert).toHaveBeenCalledWith(
      expect.objectContaining({ execucao_id: 'ex-1', acao: 'iniciou', observacoes: 'idempotencyKey=key-9' })
    );
  });

  it('propaga erro do insert da execução', async () => {
    queueTables({
      workflows_execucoes: [ok(null), makeChain({ data: null, error: { message: 'rls' } })],
      workflows_definicoes: [ok({ id: WF, ativo: true })],
      workflows_etapas: [ok(ETAPA1)],
    });
    await expect(workflowService.executarWorkflow(WF, 'ferias', 'fer-1', EMPRESA_ID, 'u-1')).rejects.toEqual({
      message: 'rls',
    });
  });

  it('lança quando o insert não devolve linha', async () => {
    queueTables({
      workflows_execucoes: [ok(null), ok(null)],
      workflows_definicoes: [ok({ id: WF, ativo: true })],
      workflows_etapas: [ok(ETAPA1)],
    });
    await expect(workflowService.executarWorkflow(WF, 'ferias', 'fer-1', EMPRESA_ID, 'u-1')).rejects.toThrow(
      'Falha ao criar execução'
    );
  });
});

describe('workflowService.registrarAprovacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exige empresa_id', async () => {
    await expect(workflowService.registrarAprovacao('ex-1', 'et-1', 'u-1', true, null, '')).rejects.toThrow(
      'empresa_id'
    );
  });

  it('lança quando execução não existe no tenant', async () => {
    queueTables({ workflows_execucoes: [ok(null)] });
    await expect(workflowService.registrarAprovacao('ex-1', 'et-1', 'u-1', true, null, EMPRESA_ID)).rejects.toThrow(
      'não encontrada'
    );
  });

  it('rejeita etapa que não é a atual', async () => {
    queueTables({ workflows_execucoes: [ok(EXEC)] });
    await expect(workflowService.registrarAprovacao('ex-1', 'et-2', 'u-1', true, null, EMPRESA_ID)).rejects.toThrow(
      'não é a etapa atual'
    );
  });

  it('rejeita execução já encerrada', async () => {
    queueTables({ workflows_execucoes: [ok({ ...EXEC, status: 'concluida' })] });
    await expect(workflowService.registrarAprovacao('ex-1', 'et-1', 'u-1', true, null, EMPRESA_ID)).rejects.toThrow(
      'já está concluida'
    );
  });

  it('lança CONFLICT quando o usuário já agiu na etapa', async () => {
    queueTables({ workflows_execucoes: [ok(EXEC)], workflows_historico: [ok({ id: 'h-0' })] });
    const err = await workflowService
      .registrarAprovacao('ex-1', 'et-1', 'u-1', true, null, EMPRESA_ID)
      .catch((e: unknown) => e);
    expect((err as NodeJS.ErrnoException).code).toBe('CONFLICT');
  });

  it('lança quando a etapa não existe', async () => {
    queueTables({ workflows_execucoes: [ok(EXEC)], workflows_historico: [ok(null)], workflows_etapas: [ok(null)] });
    await expect(workflowService.registrarAprovacao('ex-1', 'et-1', 'u-1', true, null, EMPRESA_ID)).rejects.toThrow(
      'Etapa et-1 não encontrada'
    );
  });

  it('aprovação com próxima etapa: avança e reinicia SLA', async () => {
    const upd = ok({ ...EXEC, etapa_atual_id: 'et-2' });
    const hist = ok({ id: 'h-1', acao: 'aprovou' });
    queueTables({
      workflows_execucoes: [ok(EXEC), upd],
      workflows_historico: [ok(null), hist],
      workflows_etapas: [ok(ETAPA1), ok(ETAPA2)],
    });
    const r = await workflowService.registrarAprovacao('ex-1', 'et-1', 'u-1', true, 'ok', EMPRESA_ID);
    expect(upd.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'em_andamento',
        etapa_atual_id: 'et-2',
        sla_iniciado_em: expect.stringMatching(/^\d{4}-/),
      })
    );
    expect(hist.insert).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'aprovou', observacoes: 'ok', etapa_id: 'et-1' })
    );
    expect(r.historico).toEqual({ id: 'h-1', acao: 'aprovou' });
  });

  it('aprovação na última etapa: conclui e zera etapa/SLA', async () => {
    const upd = ok({ ...EXEC, status: 'concluida' });
    queueTables({
      workflows_execucoes: [ok({ ...EXEC, etapa_atual_id: 'et-2' }), upd],
      workflows_historico: [ok(null), ok(null)],
      workflows_etapas: [ok(ETAPA2), ok(null)],
    });
    await workflowService.registrarAprovacao('ex-1', 'et-2', 'u-1', true, null, EMPRESA_ID);
    expect(upd.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'concluida', etapa_atual_id: null, sla_iniciado_em: null })
    );
  });

  it('rejeição encerra o workflow mesmo havendo próxima etapa', async () => {
    const upd = ok({ ...EXEC, status: 'rejeitada' });
    const hist = ok(null);
    queueTables({
      workflows_execucoes: [ok(EXEC), upd],
      workflows_historico: [ok(null), hist],
      workflows_etapas: [ok(ETAPA1), ok(ETAPA2)],
    });
    await workflowService.registrarAprovacao('ex-1', 'et-1', 'u-1', false, 'falta doc', EMPRESA_ID);
    expect(upd.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejeitada', etapa_atual_id: null, sla_iniciado_em: null })
    );
    expect(hist.insert).toHaveBeenCalledWith(expect.objectContaining({ acao: 'rejeitou', observacoes: 'falta doc' }));
  });

  it('propaga erro do update e lança quando update não devolve linha', async () => {
    queueTables({
      workflows_execucoes: [ok(EXEC), makeChain({ data: null, error: { message: 'boom' } })],
      workflows_historico: [ok(null)],
      workflows_etapas: [ok(ETAPA1), ok(ETAPA2)],
    });
    await expect(workflowService.registrarAprovacao('ex-1', 'et-1', 'u-1', true, null, EMPRESA_ID)).rejects.toEqual({
      message: 'boom',
    });
    queueTables({
      workflows_execucoes: [ok(EXEC), ok(null)],
      workflows_historico: [ok(null)],
      workflows_etapas: [ok(ETAPA1), ok(ETAPA2)],
    });
    await expect(workflowService.registrarAprovacao('ex-1', 'et-1', 'u-1', true, null, EMPRESA_ID)).rejects.toThrow(
      'Falha ao atualizar'
    );
  });
});

describe('workflowService.statusSLA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T10:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna null sem execução ou sem etapa atual', async () => {
    queueTables({ workflows_execucoes: [ok(null)] });
    expect(await workflowService.statusSLA('ex-1', EMPRESA_ID)).toBeNull();
    queueTables({ workflows_execucoes: [ok({ ...EXEC, etapa_atual_id: null })] });
    expect(await workflowService.statusSLA('ex-1', EMPRESA_ID)).toBeNull();
  });

  it('calcula prazo a partir de sla_iniciado_em + sla_horas da etapa', async () => {
    queueTables({ workflows_execucoes: [ok({ ...EXEC, etapa_atual: ETAPA1 })] });
    const r = await workflowService.statusSLA('ex-1', EMPRESA_ID);
    expect(r).toEqual({ expired: false, hoursRemaining: 14, deadlineUtc: '2026-10-02T00:00:00.000Z' });
  });

  it('usa 48h default e updated_at quando SLA não iniciado — e marca expirado', async () => {
    vi.setSystemTime(new Date('2026-10-04T00:00:00.000Z'));
    queueTables({
      workflows_execucoes: [ok({ ...EXEC, sla_iniciado_em: null, etapa_atual: ETAPA2 })],
    });
    const r = await workflowService.statusSLA('ex-1', EMPRESA_ID);
    expect(r).toEqual({ expired: true, hoursRemaining: -24, deadlineUtc: '2026-10-03T00:00:00.000Z' });
  });
});

describe('workflowService.execucoesComSLAVencido', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-02T12:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna [] quando a query não devolve dados', async () => {
    queueTables({ workflows_execucoes: [ok(null)] });
    expect(await workflowService.execucoesComSLAVencido(EMPRESA_ID)).toEqual([]);
  });

  it('filtra só as execuções cujo prazo (sla_horas ou 48h) já passou', async () => {
    const vencida24h = { id: 'a', sla_iniciado_em: '2026-10-01T00:00:00.000Z', workflows_etapas: ETAPA1 };
    const noPrazo48h = { id: 'b', sla_iniciado_em: '2026-10-01T00:00:00.000Z', workflows_etapas: ETAPA2 };
    const vencida48h = { id: 'c', sla_iniciado_em: '2026-09-29T00:00:00.000Z', workflows_etapas: null };
    const chain = ok([vencida24h, noPrazo48h, vencida48h]);
    queueTables({ workflows_execucoes: [chain] });
    const r = await workflowService.execucoesComSLAVencido(EMPRESA_ID);
    expect(r.map((e) => e.id)).toEqual(['a', 'c']);
    expect(chain.not).toHaveBeenCalledWith('sla_iniciado_em', 'is', null);
  });
});
