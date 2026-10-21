import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import { avaliacaoService } from '../avaliacaoService';

const EMPRESA_ID = 'test-empresa-id';

const { mockFrom, mockRpc } = vi.hoisted(() => ({ mockFrom: vi.fn(), mockRpc: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => deepChain(mockFrom(...a)),
    rpc: (...a: unknown[]) => mockRpc(...a),
  },
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

function setupDeleteChain(error: any = null) {
  const eqFn = vi.fn();
  const __delChain = {
    then: (r: any) => Promise.resolve({ error }).then(r),
    catch: (r: any) => Promise.resolve({ error }).catch(r),
    finally: (r: any) => Promise.resolve({ error }).finally(r),
    eq: eqFn,
  };
  eqFn.mockReturnValue(__delChain);
  const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ delete: deleteFn });
  return { deleteFn, eqFn };
}

// ─── Ciclos ───────────────────────────────────────────────────────────────────

describe('avaliacaoService.listarCiclos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ciclos without empresa filter', async () => {
    const records = [{ id: 'ci1', nome: 'Q1 2026' }];
    setupListChain(records);
    const result = await avaliacaoService.listarCiclos(EMPRESA_ID);
    expect(result).toEqual(records);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await avaliacaoService.listarCiclos('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    expect(await avaliacaoService.listarCiclos(EMPRESA_ID)).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(avaliacaoService.listarCiclos(EMPRESA_ID)).rejects.toBeDefined();
  });
});

describe('avaliacaoService.criarCiclo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: true, error: null });
  });

  it('inserts and returns new ciclo', async () => {
    const created = { id: 'ci-new', nome: 'Q2 2026' };
    const { insertFn } = setupInsertChain(created);
    const result = await avaliacaoService.criarCiclo({ nome: 'Q2 2026' });
    expect(insertFn).toHaveBeenCalledWith({ nome: 'Q2 2026' });
    expect(result).toEqual(created);
  });

  it('throws when the database does not confirm the inserted row', async () => {
    setupInsertChain(null);
    await expect(avaliacaoService.criarCiclo({ nome: 'Sem confirmação' })).rejects.toThrow(
      /perfil_nao_autorizado|não confirmou/i
    );
  });

  it('blocks creation for a profile without RH/admin permission', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });
    setupInsertChain({ id: 'nao-deveria' });
    await expect(avaliacaoService.criarCiclo({ nome: 'Sem permissão' })).rejects.toThrow(/perfil_nao_autorizado/i);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('throws on DB error', async () => {
    setupInsertChain(null, { message: 'fail' });
    await expect(avaliacaoService.criarCiclo({})).rejects.toBeDefined();
  });
});

describe('avaliacaoService.contarDependenciasCiclo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('soma as dependências reais por tabela (sem apagar nada)', async () => {
    const counts: Record<string, number> = {
      feedbacks_360: 2,
      feedbacks_360_consolidacoes: 1,
      feedbacks_360_aprovacoes_gestor: 1,
      feedbacks_360_validacoes_potencial: 0,
      metas_okrs: 3,
    };
    mockFrom.mockImplementation((tabela: string) => ({
      select: () => {
        const chain: any = {};
        chain.eq = vi.fn().mockReturnValue(chain);
        chain.then = (fn: any) => Promise.resolve({ count: counts[tabela] ?? 0, error: null }).then(fn);
        chain.catch = (fn: any) => Promise.resolve({ count: counts[tabela] ?? 0, error: null }).catch(fn);
        return chain;
      },
    }));
    const deps = await avaliacaoService.contarDependenciasCiclo('ci-1', EMPRESA_ID);
    expect(deps.total).toBe(7);
    expect(deps.porTabela).toMatchObject({ feedbacks_360: 2, metas_okrs: 3 });
  });
});

describe('avaliacaoService.excluirCiclo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: true, error: null });
  });

  it('deletes ciclo by id', async () => {
    const { deleteFn, eqFn } = setupDeleteChain();
    await avaliacaoService.excluirCiclo('ci1', EMPRESA_ID);
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'ci1');
  });

  it('blocks deletion for a profile without RH/admin permission', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });
    const { deleteFn } = setupDeleteChain();
    await expect(avaliacaoService.excluirCiclo('ci1', EMPRESA_ID)).rejects.toThrow(/perfil_nao_autorizado/i);
    expect(deleteFn).not.toHaveBeenCalled();
  });
});

// ─── Metas (OKRs) ─────────────────────────────────────────────────────────────

describe('avaliacaoService.listarMetas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns metas with colaborador join', async () => {
    const records = [{ id: 'm1', titulo: 'Aumentar vendas' }];
    const { selectFn } = setupListChain(records);
    const result = await avaliacaoService.listarMetas(EMPRESA_ID);
    expect(result).toEqual(records);
    expect(selectFn).toHaveBeenCalledWith(expect.stringContaining('colaborador:colaboradores'));
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await avaliacaoService.listarMetas('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('returns empty when null', async () => {
    setupListChain(null as any);
    expect(await avaliacaoService.listarMetas(EMPRESA_ID)).toEqual([]);
  });

  it('also filters by colaborador_id when provided (PARTE G)', async () => {
    const { chain } = setupListChain([]);
    await avaliacaoService.listarMetas(EMPRESA_ID, 'col-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', EMPRESA_ID);
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
  });

  it('does not filter by colaborador_id when omitted', async () => {
    const { chain } = setupListChain([]);
    await avaliacaoService.listarMetas(EMPRESA_ID);
    expect(chain.eq).not.toHaveBeenCalledWith('colaborador_id', expect.anything());
  });
});

describe('avaliacaoService.criarMeta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns new meta', async () => {
    const created = { id: 'm-new', titulo: 'Meta X' };
    const { insertFn } = setupInsertChain(created);
    const result = await avaliacaoService.criarMeta({ titulo: 'Meta X' });
    expect(insertFn).toHaveBeenCalledWith({ titulo: 'Meta X' });
    expect(result).toEqual(created);
  });
});

describe('avaliacaoService.excluirMeta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes meta by id', async () => {
    const { eqFn } = setupDeleteChain();
    await avaliacaoService.excluirMeta('m1', EMPRESA_ID);
    expect(eqFn).toHaveBeenCalledWith('id', 'm1');
  });
});

// ─── PDIs ─────────────────────────────────────────────────────────────────────

describe('avaliacaoService.listarPDIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns PDIs with colaborador join', async () => {
    const records = [{ id: 'p1' }];
    const { selectFn } = setupListChain(records);
    const result = await avaliacaoService.listarPDIs(EMPRESA_ID);
    expect(result).toEqual(records);
    expect(selectFn).toHaveBeenCalledWith(expect.stringContaining('colaborador:colaboradores'));
  });

  it('returns empty when null', async () => {
    setupListChain(null as any);
    expect(await avaliacaoService.listarPDIs(EMPRESA_ID)).toEqual([]);
  });

  it('also filters by colaborador_id when provided (PARTE G)', async () => {
    const { chain } = setupListChain([]);
    await avaliacaoService.listarPDIs(EMPRESA_ID, 'col-1');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
  });
});

describe('avaliacaoService.criarPDI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns new PDI', async () => {
    const created = { id: 'p-new' };
    const { insertFn } = setupInsertChain(created);
    const result = await avaliacaoService.criarPDI({ objetivo: 'Crescer' });
    expect(result).toEqual(created);
  });
});

describe('avaliacaoService.excluirPDI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes PDI by id', async () => {
    const { eqFn } = setupDeleteChain();
    await avaliacaoService.excluirPDI('p1', EMPRESA_ID);
    expect(eqFn).toHaveBeenCalledWith('id', 'p1');
  });
});

// ─── Feedbacks (360) ──────────────────────────────────────────────────────────

describe('avaliacaoService.listarFeedbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns feedbacks with avaliado/avaliador joins', async () => {
    const records = [{ id: 'fb1' }];
    const { selectFn } = setupListChain(records);
    const result = await avaliacaoService.listarFeedbacks(EMPRESA_ID);
    expect(result).toEqual(records);
    expect(selectFn).toHaveBeenCalledWith(expect.stringContaining('avaliado'));
    expect(selectFn).toHaveBeenCalledWith(expect.stringContaining('avaliador'));
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await avaliacaoService.listarFeedbacks('emp-2');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-2');
  });

  it('filters by avaliado_id (not avaliador_id) when provided (PARTE G)', async () => {
    const { chain } = setupListChain([]);
    await avaliacaoService.listarFeedbacks(EMPRESA_ID, 'col-1');
    expect(chain.eq).toHaveBeenCalledWith('avaliado_id', 'col-1');
  });
});

describe('avaliacaoService.criarFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns new feedback', async () => {
    const created = { id: 'fb-new' };
    const { insertFn } = setupInsertChain(created);
    const result = await avaliacaoService.criarFeedback({ nota: 5 });
    expect(result).toEqual(created);
  });
});

describe('avaliacaoService.excluirFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('RECUSA a exclusão física e NÃO chama o DELETE (correção R2)', async () => {
    const { eqFn } = setupDeleteChain();
    await expect(avaliacaoService.excluirFeedback('fb1', EMPRESA_ID)).rejects.toThrow(/EXCLUSAO_FISICA_DESATIVADA/);
    expect(eqFn).not.toHaveBeenCalled();
  });

  it('explica que o caminho oficial é o cancelamento auditado', async () => {
    setupDeleteChain();
    await expect(avaliacaoService.excluirFeedback('fb1', EMPRESA_ID)).rejects.toThrow(/cancelamento auditado/);
  });
});

// ─── Competências ─────────────────────────────────────────────────────────────

describe('avaliacaoService.listarCompetencias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns competencias ordered by nome', async () => {
    const records = [{ id: 'co1', nome: 'Liderança' }];
    const { chain } = setupListChain(records);
    const result = await avaliacaoService.listarCompetencias(EMPRESA_ID);
    expect(result).toEqual(records);
    expect(chain.order).toHaveBeenCalledWith('nome');
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await avaliacaoService.listarCompetencias('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });
});

describe('avaliacaoService.criarCompetencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns new competencia', async () => {
    const created = { id: 'co-new', nome: 'Comunicação' };
    const { insertFn } = setupInsertChain(created);
    const result = await avaliacaoService.criarCompetencia({ nome: 'Comunicação' });
    expect(result).toEqual(created);
  });
});

describe('avaliacaoService.excluirCompetencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes competencia by id', async () => {
    const { eqFn } = setupDeleteChain();
    await avaliacaoService.excluirCompetencia('co1', EMPRESA_ID);
    expect(eqFn).toHaveBeenCalledWith('id', 'co1');
  });
});
