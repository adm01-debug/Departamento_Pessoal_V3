import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import {
  listarDependentes,
  criarDependente,
  atualizarDependente,
  excluirDependente,
  listarContatosEmergencia,
  criarContatoEmergencia,
  excluirContatoEmergencia,
  listarHistoricoSalarial,
  criarRegistroSalarial,
  listarASOs,
  criarASO,
  listarFormacoes,
  criarFormacao,
  excluirFormacao,
  obterDadosEstrangeiro,
  salvarDadosEstrangeiro,
  obterDeficiencia,
  salvarDeficiencia,
  obterPeriodoExperiencia,
  salvarPeriodoExperiencia,
  listarAnotacoes,
  criarAnotacao,
  excluirAnotacao,
  listarPeriodosAquisitivos,
  listarTimes,
  criarTime,
  listarEtnias,
  listarWebhooks,
  criarWebhook,
  excluirWebhook,
  listarFeriasColetivas,
  criarFeriasColetivas,
  listarCamposCustomizados,
  obterValoresCamposCustomizados,
  salvarValorCampoCustomizado,
} from '../colaboradorDetalhesService';
import type { Insertable } from '@/integrations/supabase/database.types';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => deepChain(mockFrom(...a)) },
}));

// Tenant isolation: todo serviço exige empresa_id explícito.
const EMPRESA_ID = 'empresa-test-id';

/**
 * Cria um mock de `.eq()` que é ao mesmo tempo ENCADEÁVEL (permite
 * `.eq(colaborador_id).eq(empresa_id)`) e AGUARDÁVEL (resolve a resposta ao
 * final da cadeia), refletindo o builder real do supabase-js.
 */
function chainableEq(response: any, extra: Record<string, unknown> = {}) {
  const eqFn: any = vi.fn();
  eqFn.mockImplementation(() => ({
    eq: eqFn,
    ...extra,
    then: (r: (v: unknown) => unknown) => Promise.resolve(response).then(r),
    catch: (r: (v: unknown) => unknown) => Promise.resolve(response).catch(r),
    finally: (r: () => void) => Promise.resolve(response).finally(r),
  }));
  return eqFn;
}

// select → eq → order → resolvedValue
function setupEqOrderChain(data: any[], error: any = null) {
  const orderFn = vi.fn().mockResolvedValue({ data, error });
  const eqFn = chainableEq({ data, error }, { order: orderFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, orderFn };
}

// select → eq → resolvedValue (no order)
function setupEqResolveChain(data: any[], error: any = null) {
  const eqFn = chainableEq({ data, error });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn };
}

// select → eq → maybeSingle
function setupEqMaybeSingleChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eqFn = chainableEq({ data, error }, { maybeSingle });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, maybeSingle };
}

// Thenable chain with optional eq/order
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

// select → order → resolvedValue (reference tables)
function setupSelectOrderChain(data: any[], error: any = null) {
  const orderFn = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ order: orderFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, orderFn };
}

// insert([...]).select().maybeSingle()
function setupInsertChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, maybeSingle };
}

// upsert(...).select().maybeSingle()
function setupUpsertChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const upsertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ upsert: upsertFn });
  return { upsertFn, maybeSingle };
}

// update(dados).eq('id', id) → resolvedValue
function setupUpdateEqChain(error: any = null) {
  const eqFn = chainableEq(
    { error },
    { select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: {}, error }) }) }
  );
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn };
}

// delete().eq() → resolvedValue
function setupDeleteChain(error: any = null) {
  const eqFn = chainableEq({ error });
  const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ delete: deleteFn });
  return { deleteFn, eqFn };
}

// ─── Dependentes ──────────────────────────────────────────────────────────────

describe('listarDependentes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns dependentes for colaborador', async () => {
    const records = [{ id: 'd1', colaborador_id: 'c1' }];
    const { eqFn } = setupEqOrderChain(records);
    expect(await listarDependentes('c1', EMPRESA_ID)).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });

  it('returns empty array when data is null', async () => {
    setupEqOrderChain(null as any);
    expect(await listarDependentes('c1', EMPRESA_ID)).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupEqOrderChain([], { message: 'fail' });
    await expect(listarDependentes('c1', EMPRESA_ID)).rejects.toBeDefined();
  });
});

describe('criarDependente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns dependente', async () => {
    const payload = { colaborador_id: 'c1', nome: 'Ana', data_nascimento: '2010-01-01', parentesco: 'filha' };
    const created = { id: 'd-new', ...payload };
    const { insertFn } = setupInsertChain(created);
    expect(await criarDependente(payload)).toEqual(created);
    expect(insertFn).toHaveBeenCalledWith([payload]);
  });
});

// `dependentes` não tem `empresa_id` (só `colaborador_id`) — atualizar e
// excluir agora fazem uma checagem prévia via join com `colaboradores`
// (verificarDependenteDaEmpresa) antes do UPDATE/DELETE por `id` puro.
function setupVerificacaoDependenteChain(found: boolean) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: found ? { id: 'd1' } : null, error: null });
  const eqEmpresa = vi.fn().mockReturnValue({ maybeSingle });
  const eqId = vi.fn().mockReturnValue({ eq: eqEmpresa });
  const selectFn = vi.fn().mockReturnValue({ eq: eqId });
  return { selectFn };
}

describe('atualizarDependente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies tenant ownership via join then updates dependente by id', async () => {
    const { selectFn: verificacaoSelect } = setupVerificacaoDependenteChain(true);
    const { updateFn, eqFn } = setupUpdateEqChain();
    mockFrom.mockReturnValueOnce({ select: verificacaoSelect }).mockReturnValueOnce({ update: updateFn });

    await atualizarDependente('d1', { nome: 'Ana Paula' }, EMPRESA_ID);

    expect(updateFn).toHaveBeenCalledWith({ nome: 'Ana Paula' });
    expect(eqFn).toHaveBeenCalledWith('id', 'd1');
  });

  it('throws when the dependente does not belong to the empresa', async () => {
    const { selectFn: verificacaoSelect } = setupVerificacaoDependenteChain(false);
    mockFrom.mockReturnValueOnce({ select: verificacaoSelect });

    await expect(atualizarDependente('d1', { nome: 'Ana Paula' }, EMPRESA_ID)).rejects.toThrow(
      'Dependente não encontrado ou sem permissão'
    );
  });
});

describe('excluirDependente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies tenant ownership via join then deletes dependente by id', async () => {
    const { selectFn: verificacaoSelect } = setupVerificacaoDependenteChain(true);
    const { eqFn } = setupDeleteChain();
    mockFrom.mockReturnValueOnce({ select: verificacaoSelect }).mockReturnValueOnce({
      delete: vi.fn().mockReturnValue({ eq: eqFn }),
    });

    await excluirDependente('d1', EMPRESA_ID);

    expect(eqFn).toHaveBeenCalledWith('id', 'd1');
  });

  it('throws when the dependente does not belong to the empresa', async () => {
    const { selectFn: verificacaoSelect } = setupVerificacaoDependenteChain(false);
    mockFrom.mockReturnValueOnce({ select: verificacaoSelect });

    await expect(excluirDependente('d1', EMPRESA_ID)).rejects.toThrow('Dependente não encontrado ou sem permissão');
  });
});

// ─── Contatos de Emergência ───────────────────────────────────────────────────

describe('listarContatosEmergencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns contacts for the requested colaborador ordered by creation date', async () => {
    const records = [{ id: 'ce1', colaborador_id: 'c1', nome: 'Maria' }];
    const { eqFn, orderFn } = setupEqOrderChain(records);

    await expect(listarContatosEmergencia('c1')).resolves.toEqual(records);
    expect(mockFrom).toHaveBeenCalledWith('contatos_emergencia');
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('normalizes a null response to an empty list', async () => {
    setupEqOrderChain(null as any);
    await expect(listarContatosEmergencia('c1')).resolves.toEqual([]);
  });

  it('propagates database errors instead of presenting an empty list', async () => {
    setupEqOrderChain([], { message: 'database unavailable' });
    await expect(listarContatosEmergencia('c1')).rejects.toMatchObject({
      message: 'database unavailable',
    });
  });
});

describe('criarContatoEmergencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns contato', async () => {
    const payload = { colaborador_id: 'c1', nome: 'Maria' };
    const created = { id: 'ce-new', ...payload };
    const { insertFn } = setupInsertChain(created);
    expect(await criarContatoEmergencia(payload)).toEqual(created);
    expect(insertFn).toHaveBeenCalledWith([payload]);
  });
});

describe('excluirContatoEmergencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes contato by id', async () => {
    const { eqFn } = setupDeleteChain();
    await excluirContatoEmergencia('c1', 'ce1');
    expect(eqFn).toHaveBeenCalledWith('id', 'ce1');
  });
});

// ─── Histórico Salarial ───────────────────────────────────────────────────────

describe('listarHistoricoSalarial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns historico for colaborador ordered by data_vigencia desc', async () => {
    const records = [{ id: 'hs1' }];
    const { eqFn, orderFn } = setupEqOrderChain(records);
    expect(await listarHistoricoSalarial('c1', EMPRESA_ID)).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
    expect(orderFn).toHaveBeenCalledWith('data_vigencia', { ascending: false });
  });
});

describe('criarRegistroSalarial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns registro', async () => {
    const payload = { colaborador_id: 'c1', data_vigencia: '2026-01-01', motivo: 'promocao', salario_novo: 5000 };
    const created = { id: 'hs-new', ...payload };
    const { insertFn } = setupInsertChain(created);
    expect(await criarRegistroSalarial(payload)).toEqual(created);
    expect(insertFn).toHaveBeenCalledWith([payload]);
  });
});

// ─── ASOs ─────────────────────────────────────────────────────────────────────

describe('listarASOs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ASOs for colaborador', async () => {
    const records = [{ id: 'a1' }];
    const { eqFn } = setupEqOrderChain(records);
    expect(await listarASOs('c1', EMPRESA_ID)).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });
});

describe('criarASO', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns ASO', async () => {
    const payload = { colaborador_id: 'c1', data_exame: '2026-01-01', tipo: 'Admissional' };
    const created = { id: 'a-new', ...payload };
    const { insertFn } = setupInsertChain(created);
    expect(await criarASO(payload)).toEqual(created);
    expect(insertFn).toHaveBeenCalledWith([payload]);
  });
});

// ─── Formações ────────────────────────────────────────────────────────────────

describe('listarFormacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns formacoes for colaborador', async () => {
    const { eqFn } = setupEqOrderChain([]);
    await listarFormacoes('c1');
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });
});

describe('criarFormacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns formacao', async () => {
    const payload = { colaborador_id: 'c1', curso: 'Engenharia' };
    const created = { id: 'f-new', ...payload };
    const { insertFn } = setupInsertChain(created);
    expect(await criarFormacao(payload)).toEqual(created);
    expect(insertFn).toHaveBeenCalledWith([payload]);
  });
});

describe('excluirFormacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes formacao by id', async () => {
    const { eqFn } = setupDeleteChain();
    await excluirFormacao('c1', 'f1');
    expect(eqFn).toHaveBeenCalledWith('id', 'f1');
  });
});

// ─── Dados de Estrangeiro ─────────────────────────────────────────────────────

describe('obterDadosEstrangeiro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns data for colaborador', async () => {
    const data = { id: 'de1', colaborador_id: 'c1' };
    const { eqFn } = setupEqMaybeSingleChain(data);
    expect(await obterDadosEstrangeiro('c1')).toEqual(data);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });

  it('returns null when not found', async () => {
    setupEqMaybeSingleChain(null);
    expect(await obterDadosEstrangeiro('c1')).toBeNull();
  });
});

describe('salvarDadosEstrangeiro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts with onConflict and returns data', async () => {
    const upserted = { id: 'de1', colaborador_id: 'c1', tipo_visto: 'B1' };
    const { upsertFn } = setupUpsertChain(upserted);
    const result = await salvarDadosEstrangeiro('c1', { tipo_visto: 'B1' });
    expect(upsertFn).toHaveBeenCalledWith({ tipo_visto: 'B1', colaborador_id: 'c1' }, { onConflict: 'colaborador_id' });
    expect(result).toEqual(upserted);
  });
});

// ─── Deficiência ──────────────────────────────────────────────────────────────

describe('obterDeficiencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns deficiencia for colaborador', async () => {
    const data = { id: 'def1' };
    const { eqFn } = setupEqMaybeSingleChain(data);
    expect(await obterDeficiencia('c1')).toEqual(data);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });
});

describe('salvarDeficiencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts with onConflict colaborador_id', async () => {
    const upserted = { id: 'def-new' };
    const { upsertFn } = setupUpsertChain(upserted);
    await salvarDeficiencia('c1', { tipo: 'visual' });
    expect(upsertFn).toHaveBeenCalledWith({ tipo: 'visual', colaborador_id: 'c1' }, { onConflict: 'colaborador_id' });
  });
});

// ─── Período de Experiência ───────────────────────────────────────────────────

describe('obterPeriodoExperiencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns periodo for colaborador', async () => {
    const data = { id: 'pe1' };
    const { eqFn } = setupEqMaybeSingleChain(data);
    expect(await obterPeriodoExperiencia('c1')).toEqual(data);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });
});

describe('salvarPeriodoExperiencia — insert when not found', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts when no existing record', async () => {
    const inserted = { id: 'pe-new', colaborador_id: 'c1' };
    // First: obterPeriodoExperiencia → null
    const maybeSingle1 = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq1 = vi.fn().mockReturnValue({ maybeSingle: maybeSingle1 });
    const select1 = vi.fn().mockReturnValue({ eq: eq1 });
    mockFrom.mockReturnValueOnce({ select: select1 });
    // Second: insert
    const maybeSingle2 = vi.fn().mockResolvedValue({ data: inserted, error: null });
    const select2 = vi.fn().mockReturnValue({ maybeSingle: maybeSingle2 });
    const insertFn = vi.fn().mockReturnValue({ select: select2 });
    mockFrom.mockReturnValueOnce({ insert: insertFn });

    const result = await salvarPeriodoExperiencia('c1', { data_inicio: '2026-01-01', dias_total: 90 });
    expect(insertFn).toHaveBeenCalledWith([{ data_inicio: '2026-01-01', dias_total: 90, colaborador_id: 'c1' }]);
    expect(result).toEqual(inserted);
  });
});

describe('salvarPeriodoExperiencia — update when found', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates when existing record found', async () => {
    const existing = { id: 'pe1', colaborador_id: 'c1' };
    const updated = { ...existing, dias_total: 120 };
    // First: obterPeriodoExperiencia → existing
    const maybeSingle1 = vi.fn().mockResolvedValue({ data: existing, error: null });
    const eq1 = vi.fn().mockReturnValue({ maybeSingle: maybeSingle1 });
    const select1 = vi.fn().mockReturnValue({ eq: eq1 });
    mockFrom.mockReturnValueOnce({ select: select1 });
    // Second: update → eq → select → maybeSingle
    const maybeSingle2 = vi.fn().mockResolvedValue({ data: updated, error: null });
    const select2 = vi.fn().mockReturnValue({ maybeSingle: maybeSingle2 });
    const eqForUpdate: any = vi.fn();
    eqForUpdate.mockReturnValue({ eq: eqForUpdate, select: select2 });
    const updateFn = vi.fn().mockReturnValue({ eq: eqForUpdate });
    mockFrom.mockReturnValueOnce({ update: updateFn });

    const result = await salvarPeriodoExperiencia('c1', { data_inicio: '2026-01-01', dias_total: 120 });
    expect(updateFn).toHaveBeenCalledWith({ data_inicio: '2026-01-01', dias_total: 120 });
    expect(eqForUpdate).toHaveBeenCalledWith('id', 'pe1');
    expect(result).toEqual(updated);
  });
});

// ─── Anotações ────────────────────────────────────────────────────────────────

describe('listarAnotacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns anotacoes for colaborador', async () => {
    const { eqFn } = setupEqOrderChain([{ id: 'an1' }]);
    await listarAnotacoes('c1');
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });
});

describe('criarAnotacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns anotacao', async () => {
    const created = { id: 'an-new', conteudo: 'Bom desempenho' };
    setupInsertChain(created);
    expect(await criarAnotacao({ colaborador_id: 'c1', titulo: 'Desempenho', conteudo: 'Bom desempenho' })).toEqual(
      created
    );
  });
});

describe('excluirAnotacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes anotacao by id', async () => {
    const { eqFn } = setupDeleteChain();
    await excluirAnotacao('c1', 'an1');
    expect(eqFn).toHaveBeenCalledWith('id', 'an1');
  });
});

// ─── Períodos Aquisitivos ─────────────────────────────────────────────────────

describe('listarPeriodosAquisitivos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns periodos for colaborador', async () => {
    const { eqFn } = setupEqOrderChain([]);
    await listarPeriodosAquisitivos('c1', EMPRESA_ID);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });
});

// ─── Times ────────────────────────────────────────────────────────────────────

describe('listarTimes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns times without empresa filter', async () => {
    const records = [{ id: 't1', nome: 'Dev' }];
    setupListChain(records);
    expect(await listarTimes(EMPRESA_ID)).toEqual(records);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await listarTimes('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });
});

describe('criarTime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns time', async () => {
    const created = { id: 't-new', nome: 'Design', empresa_id: 'emp-1' };
    setupInsertChain(created);
    expect(await criarTime({ nome: 'Design', empresa_id: 'emp-1' })).toEqual(created);
  });

  // Regressao: time sem tenant ficava invisivel para todos (a politica de RLS
  // exige empresa_id IN get_user_empresas()), entao o registro "sumia" da tela
  // em vez de dar erro. Agora falha alto, antes de chegar ao banco.
  it('rejeita criacao sem empresa_id', async () => {
    await expect(criarTime({ nome: 'Design' } as Insertable<'times'>)).rejects.toThrow(/empresa_id obrigatório/);
  });
});

// ─── Tabelas de referência ────────────────────────────────────────────────────

describe('listarEtnias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries etnias table and returns data', async () => {
    const records = [{ id: 'e1', nome: 'Parda' }];
    setupSelectOrderChain(records);
    expect(await listarEtnias()).toEqual(records);
    expect(mockFrom).toHaveBeenCalledWith('etnias');
  });
});

// ─── Webhooks ────────────────────────────────────────────────────────────────

describe('listarWebhooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns webhooks without empresa filter', async () => {
    setupListChain([{ id: 'wh1' }]);
    expect(await listarWebhooks(EMPRESA_ID)).toHaveLength(1);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await listarWebhooks('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });
});

describe('criarWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns webhook', async () => {
    const created = { id: 'wh-new', url: 'https://example.com/hook' };
    setupInsertChain(created);
    expect(await criarWebhook({ url: 'https://example.com/hook' })).toEqual(created);
  });
});

describe('excluirWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes webhook by id', async () => {
    const { eqFn } = setupDeleteChain();
    await excluirWebhook('wh1', EMPRESA_ID);
    expect(eqFn).toHaveBeenCalledWith('id', 'wh1');
  });
});

// ─── Férias Coletivas ─────────────────────────────────────────────────────────

describe('listarFeriasColetivas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ferias coletivas for empresa', async () => {
    const records = [{ id: 'fc1' }];
    const { eqFn } = setupEqOrderChain(records);
    expect(await listarFeriasColetivas('emp-1')).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });
});

describe('criarFeriasColetivas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns ferias coletivas', async () => {
    const created = { id: 'fc-new' };
    setupInsertChain(created);
    expect(
      await criarFeriasColetivas({
        empresa_id: EMPRESA_ID,
        data_inicio: '2026-01-01',
        data_fim: '2026-01-10',
        dias: 10,
      })
    ).toEqual(created);
  });
});

// ─── Campos Customizados ──────────────────────────────────────────────────────

describe('listarCamposCustomizados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns campos without empresa filter and filters by ativo=true', async () => {
    const records = [{ id: 'cc1', ativo: true }];
    const { chain } = setupListChain(records);
    expect(await listarCamposCustomizados(EMPRESA_ID)).toEqual(records);
    expect(chain.eq).toHaveBeenCalledWith('ativo', true);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await listarCamposCustomizados('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });
});

describe('obterValoresCamposCustomizados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns valores for colaborador', async () => {
    const records = [{ id: 'v1' }];
    const { eqFn } = setupEqResolveChain(records);
    expect(await obterValoresCamposCustomizados('c1')).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });
});

describe('salvarValorCampoCustomizado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts with onConflict and returns data', async () => {
    const upserted = { id: 'v-new' };
    const { upsertFn } = setupUpsertChain(upserted);
    const result = await salvarValorCampoCustomizado('campo-1', 'c1', 'SP');
    expect(upsertFn).toHaveBeenCalledWith(
      { campo_customizado_id: 'campo-1', colaborador_id: 'c1', valor: 'SP' },
      { onConflict: 'campo_customizado_id,colaborador_id' }
    );
    expect(result).toEqual(upserted);
  });
});
