import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import { makeChain } from '@/test/chain';
import { feriasService } from '../feriasService';

const EMPRESA_ID = 'test-empresa-id';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom, mockGetUser } = vi.hoisted(() => ({ mockFrom: vi.fn(), mockGetUser: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => deepChain(mockFrom(...a)),
    auth: { getUser: mockGetUser },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// Helper: build select → eq/ilike → order → range chain for listSolicitacoes
function setupListChain(data: unknown, count: number, error: { message: string; code?: string } | null = null) {
  const rangeFn = vi.fn().mockResolvedValue({ data, count, error });
  const orderFn = vi.fn().mockReturnValue({ range: rangeFn });
  const baseQuery = { order: orderFn };
  const eqFn = vi.fn().mockReturnValue(baseQuery);
  const ilikeFn = vi.fn().mockReturnValue(baseQuery);
  Object.assign(baseQuery, { eq: eqFn, ilike: ilikeFn });
  const selectFn = vi.fn().mockReturnValue(baseQuery);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, ilikeFn, orderFn, rangeFn };
}

// Helper: build a simple update → eq chain (resolves to { error })
function setupUpdateChain(error: { message: string; code?: string } | null = null) {
  const eqFn = vi.fn();
  const __delChain = {
    then: (r: (v?: unknown) => unknown) => Promise.resolve({ error }).then(r),
    catch: (r: (v?: unknown) => unknown) => Promise.resolve({ error }).catch(r),
    finally: (r: (v?: unknown) => unknown) => Promise.resolve({ error }).finally(r),
    eq: eqFn,
  };
  eqFn.mockReturnValue(__delChain);
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn };
}

// ─── listSolicitacoes ─────────────────────────────────────────────────────────

describe('feriasService.listSolicitacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns data and count from supabase', async () => {
    const records = [{ id: 'f1', status: 'pendente' }];
    setupListChain(records, 1);
    const result = await feriasService.listSolicitacoes(EMPRESA_ID);
    expect(result.data).toEqual(records);
    expect(result.count).toBe(1);
  });

  it('returns empty data when supabase returns null', async () => {
    setupListChain(null as never, null as never);
    const result = await feriasService.listSolicitacoes(EMPRESA_ID);
    expect(result.data).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('filters by empresa_id when provided', async () => {
    const { eqFn } = setupListChain([], 0);
    await feriasService.listSolicitacoes('emp-1');
    expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('filters by status when not "all"', async () => {
    const { eqFn } = setupListChain([], 0);
    await feriasService.listSolicitacoes(EMPRESA_ID, { status: 'aprovada' });
    expect(eqFn).toHaveBeenCalledWith('status', 'aprovada');
  });

  it('does NOT filter by status when status is "all"', async () => {
    const { eqFn } = setupListChain([], 0);
    await feriasService.listSolicitacoes(EMPRESA_ID, { status: 'all' });
    expect(eqFn).not.toHaveBeenCalledWith('status', 'all');
  });

  it('adds ilike filter when search has 3+ characters', async () => {
    const { ilikeFn } = setupListChain([], 0);
    await feriasService.listSolicitacoes(EMPRESA_ID, { search: 'Silva' });
    expect(ilikeFn).toHaveBeenCalledWith('colaborador.nome_completo', '%Silva%');
  });

  it('does NOT add ilike filter when search has fewer than 3 characters', async () => {
    const { ilikeFn } = setupListChain([], 0);
    await feriasService.listSolicitacoes(EMPRESA_ID, { search: 'Jo' });
    expect(ilikeFn).not.toHaveBeenCalled();
  });

  it('calls range with correct offset for page 2, limit 5', async () => {
    const { rangeFn } = setupListChain([], 0);
    await feriasService.listSolicitacoes(EMPRESA_ID, { page: 2, limit: 5 });
    expect(rangeFn).toHaveBeenCalledWith(5, 9);
  });

  it('orders by id descending (keyset pagination)', async () => {
    const { orderFn } = setupListChain([], 0);
    await feriasService.listSolicitacoes(EMPRESA_ID);
    expect(orderFn).toHaveBeenCalledWith('id', { ascending: false });
  });

  it('throws on DB error', async () => {
    setupListChain([], 0, { message: 'fail' });
    await expect(feriasService.listSolicitacoes(EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── listar (delegate) ────────────────────────────────────────────────────────

describe('feriasService.listar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { data, total } delegating to listSolicitacoes', async () => {
    const records = [{ id: 'f2', status: 'pendente' }];
    setupListChain(records, 1);
    const result = await feriasService.listar({ filters: { empresa_id: EMPRESA_ID } });
    expect(result.data).toEqual(records);
    expect(result.total).toBe(1);
  });
});

// ─── aprovar ──────────────────────────────────────────────────────────────────

describe('feriasService.aprovar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls update with status aprovada and eq on id', async () => {
    const { updateFn, eqFn } = setupUpdateChain();
    await feriasService.aprovar('ferias-1', EMPRESA_ID);
    expect(updateFn).toHaveBeenCalledWith({ status: 'aprovada' });
    expect(eqFn).toHaveBeenCalledWith('id', 'ferias-1');
  });

  it('throws on DB error', async () => {
    setupUpdateChain({ message: 'fail' });
    await expect(feriasService.aprovar('ferias-1', EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── rejeitar ─────────────────────────────────────────────────────────────────

describe('feriasService.rejeitar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls update with status rejeitada', async () => {
    const { updateFn } = setupUpdateChain();
    await feriasService.rejeitar('ferias-2', EMPRESA_ID);
    expect(updateFn).toHaveBeenCalledWith({ status: 'rejeitada' });
  });

  it('throws on DB error', async () => {
    setupUpdateChain({ message: 'fail' });
    await expect(feriasService.rejeitar('ferias-2', EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── cancelar ────────────────────────────────────────────────────────────────

describe('feriasService.cancelar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls update with cancelado=true and status=cancelada', async () => {
    const { updateFn } = setupUpdateChain();
    await feriasService.cancelar('ferias-3', EMPRESA_ID, 'user-1');
    const updateArgs = vi.mocked(updateFn).mock.calls[0][0];
    expect(updateArgs.cancelado).toBe(true);
    expect(updateArgs.status).toBe('cancelada');
    expect(updateArgs.cancelado_por).toBe('user-1');
  });

  it('sets cancelado_por to null when userId not provided', async () => {
    const { updateFn } = setupUpdateChain();
    await feriasService.cancelar('ferias-3', EMPRESA_ID);
    const updateArgs = vi.mocked(updateFn).mock.calls[0][0];
    expect(updateArgs.cancelado_por).toBeNull();
  });

  it('throws on DB error', async () => {
    setupUpdateChain({ message: 'fail' });
    await expect(feriasService.cancelar('ferias-3', EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── aprovarGestor ───────────────────────────────────────────────────────────

describe('feriasService.aprovarGestor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls update with aprovado_gestor=true and userId', async () => {
    const { updateFn } = setupUpdateChain();
    await feriasService.aprovarGestor('ferias-1', EMPRESA_ID, 'gestor-1');
    const updateArgs = vi.mocked(updateFn).mock.calls[0][0];
    expect(updateArgs.aprovado_gestor).toBe(true);
    expect(updateArgs.status_aprovacao_gestor).toBe('aprovado');
    expect(updateArgs.aprovado_gestor_por).toBe('gestor-1');
  });

  it('throws on DB error', async () => {
    setupUpdateChain({ message: 'fail' });
    await expect(feriasService.aprovarGestor('ferias-1', EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── aprovarRH ───────────────────────────────────────────────────────────────

describe('feriasService.aprovarRH', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls update with aprovado_rh=true and status aprovada', async () => {
    const { updateFn } = setupUpdateChain();
    await feriasService.aprovarRH('ferias-1', EMPRESA_ID, 'rh-1');
    const updateArgs = vi.mocked(updateFn).mock.calls[0][0];
    expect(updateArgs.aprovado_rh).toBe(true);
    expect(updateArgs.status).toBe('aprovada');
    expect(updateArgs.aprovado_rh_por).toBe('rh-1');
  });

  it('throws on DB error', async () => {
    setupUpdateChain({ message: 'fail' });
    await expect(feriasService.aprovarRH('ferias-1', EMPRESA_ID, 'rh-1')).rejects.toBeDefined();
  });
});

// ─── getAprovacoesLog ─────────────────────────────────────────────────────────

describe('feriasService.getAprovacoesLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns log entries for a ferias record', async () => {
    const logs = [{ id: 'log-1', ferias_id: 'f1', acao: 'aprovado' }];
    const orderFn = vi.fn().mockResolvedValue({ data: logs, error: null });
    const eqFn = vi.fn().mockReturnValue({ order: orderFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ select: selectFn });

    const result = await feriasService.getAprovacoesLog('f1');
    expect(result).toEqual(logs);
    expect(eqFn).toHaveBeenCalledWith('ferias_id', 'f1');
  });

  it('returns empty array when no logs', async () => {
    const orderFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqFn = vi.fn().mockReturnValue({ order: orderFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ select: selectFn });

    const result = await feriasService.getAprovacoesLog('f1');
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    const orderFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const eqFn = vi.fn().mockReturnValue({ order: orderFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ select: selectFn });

    await expect(feriasService.getAprovacoesLog('f1')).rejects.toBeDefined();
  });
});

// ─── criarPeriodoAquisitivo ───────────────────────────────────────────────────

describe('feriasService.criarPeriodoAquisitivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns the created period', async () => {
    const created = { id: 'pa-1', colaborador_id: 'c1' };
    const maybeSingle = vi.fn().mockResolvedValue({ data: created, error: null });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });

    const result = await feriasService.criarPeriodoAquisitivo({
      colaborador_id: 'c1',
      data_inicio: '2026-01-01',
      data_fim: '2026-12-31',
    });
    expect(result).toEqual(created);
    expect(insertFn).toHaveBeenCalledWith({
      colaborador_id: 'c1',
      data_inicio: '2026-01-01',
      data_fim: '2026-12-31',
    });
  });

  it('throws on DB error', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });

    await expect(
      feriasService.criarPeriodoAquisitivo({
        colaborador_id: 'c1',
        data_inicio: '2026-01-01',
        data_fim: '2026-12-31',
      })
    ).rejects.toBeDefined();
  });
});

// ─── atualizarPeriodoAquisitivo ───────────────────────────────────────────────

describe('feriasService.atualizarPeriodoAquisitivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates and returns the period', async () => {
    const updated = { id: 'pa-1', status: 'usado' };
    const maybeSingle = vi.fn().mockResolvedValue({ data: updated, error: null });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle });
    const eqFn = vi.fn();
    const __eqChain = { select: selectFn, eq: eqFn };
    eqFn.mockReturnValue(__eqChain);
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ update: updateFn });

    const result = await feriasService.atualizarPeriodoAquisitivo('pa-1', { status: 'usado' }, EMPRESA_ID);
    expect(result).toEqual(updated);
    expect(eqFn).toHaveBeenCalledWith('id', 'pa-1');
  });

  it('throws on DB error', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle });
    const eqFn = vi.fn();
    const __eqChain = { select: selectFn, eq: eqFn };
    eqFn.mockReturnValue(__eqChain);
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ update: updateFn });

    await expect(feriasService.atualizarPeriodoAquisitivo('pa-1', {}, EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── excluirPeriodoAquisitivo ─────────────────────────────────────────────────

describe('feriasService.excluirPeriodoAquisitivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls delete with the given id', async () => {
    const eqFn = vi.fn();
    const delChain = { eq: eqFn, then: (r: (v?: unknown) => unknown) => Promise.resolve({ error: null }).then(r) };
    eqFn.mockReturnValue(delChain);
    const deleteFn = vi.fn().mockReturnValue(delChain);
    mockFrom.mockReturnValue({ delete: deleteFn });

    await feriasService.excluirPeriodoAquisitivo('pa-2', EMPRESA_ID);
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'pa-2');
  });

  it('throws on DB error', async () => {
    const eqFn = vi.fn();
    const delChain = {
      eq: eqFn,
      then: (r: (v?: unknown) => unknown) => Promise.resolve({ error: { message: 'fail' } }).then(r),
    };
    eqFn.mockReturnValue(delChain);
    const deleteFn = vi.fn().mockReturnValue(delChain);
    mockFrom.mockReturnValue({ delete: deleteFn });

    await expect(feriasService.excluirPeriodoAquisitivo('pa-2', EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── criar — gatilho do motor de workflow (§4.29) ─────────────────────────────

type Chain = ReturnType<typeof makeChain>;

/** Cada `from(tabela)` consome o próximo chain da fila daquela tabela. */
function queueTables(queues: Record<string, Chain[]>) {
  mockFrom.mockImplementation((table: string) => {
    const q = queues[table];
    return q && q.length > 0 ? q.shift() : makeChain({ data: null, error: null });
  });
}

const ok = (data: unknown) => makeChain({ data, error: null });

const EMPRESA_UUID = '00000000-0000-4000-8000-000000000001';
const COLAB_ID = '00000000-0000-4000-8000-000000000010';
const WF_ID = '00000000-0000-4000-8000-000000000020';
const USER_ID = '00000000-0000-4000-8000-000000000030';

const PAYLOAD_CRIAR = {
  colaborador_id: COLAB_ID,
  data_inicio: '2026-11-02',
  data_fim: '2026-11-16',
  dias_gozo: 15,
  empresa_id: EMPRESA_UUID,
};

const FERIAS_ROW = {
  id: 'fer-1',
  colaborador_id: COLAB_ID,
  empresa_id: EMPRESA_UUID,
  data_inicio: '2026-11-02',
  data_fim: '2026-11-16',
  dias_gozo: 15,
  status: 'pendente',
};

describe('feriasService.criar — gatilho de workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  });

  it('com definição ativa do tipo ferias → cria execução na primeira etapa', async () => {
    const insertExec = ok({ id: 'ex-1', status: 'em_andamento' });
    queueTables({
      ferias: [ok(FERIAS_ROW)],
      workflows_definicoes: [ok({ id: WF_ID }), ok({ id: WF_ID, ativo: true })],
      workflows_execucoes: [ok(null), insertExec],
      workflows_etapas: [ok({ id: 'et-1', workflow_id: WF_ID, ordem: 1 })],
      workflows_historico: [ok(null)],
    });

    const r = await feriasService.criar(PAYLOAD_CRIAR);

    expect(r).toEqual(FERIAS_ROW);
    expect(insertExec.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow_id: WF_ID,
        entidade_tipo: 'ferias',
        entidade_id: 'fer-1',
        empresa_id: EMPRESA_UUID,
        solicitante_id: USER_ID,
        status: 'em_andamento',
      })
    );
  });

  it('sem definição ativa → cria a solicitação normalmente e nenhuma execução', async () => {
    queueTables({
      ferias: [ok(FERIAS_ROW)],
      workflows_definicoes: [ok(null)],
    });

    const r = await feriasService.criar(PAYLOAD_CRIAR);

    expect(r).toEqual(FERIAS_ROW);
    const tablesChamadas = mockFrom.mock.calls.map((c: unknown[]) => c[0]);
    expect(tablesChamadas).not.toContain('workflows_execucoes');
  });

  it('falha na engine de workflow não derruba a criação da solicitação', async () => {
    queueTables({
      ferias: [ok(FERIAS_ROW)],
      workflows_definicoes: [makeChain({ data: null, error: { message: 'boom' } })],
    });

    const r = await feriasService.criar(PAYLOAD_CRIAR);

    expect(r).toEqual(FERIAS_ROW);
  });
});
