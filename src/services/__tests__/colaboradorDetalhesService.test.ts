import { describe, it, expect, vi, beforeEach } from 'vitest';
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

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// select → eq → order → resolvedValue
function setupEqOrderChain(data: any[], error: any = null) {
  const orderFn = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ order: orderFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, orderFn };
}

// select → eq → resolvedValue (no order)
function setupEqResolveChain(data: any[], error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn };
}

// select → eq → maybeSingle
function setupEqMaybeSingleChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ maybeSingle });
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
  const eqFn = vi.fn().mockResolvedValue({ error });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn };
}

// delete().eq() → resolvedValue
function setupDeleteChain(error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ error });
  const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ delete: deleteFn });
  return { deleteFn, eqFn };
}

// ─── Dependentes ──────────────────────────────────────────────────────────────

describe('listarDependentes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns dependentes for colaborador', async () => {
    const records = [{ id: 'd1', colaborador_id: 'c1' }];
    const { eqFn } = setupEqOrderChain(records);
    expect(await listarDependentes('c1')).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });

  it('returns empty array when data is null', async () => {
    setupEqOrderChain(null as any);
    expect(await listarDependentes('c1')).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupEqOrderChain([], { message: 'fail' });
    await expect(listarDependentes('c1')).rejects.toBeDefined();
  });
});

describe('criarDependente', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns dependente', async () => {
    const created = { id: 'd-new', nome: 'Ana' };
    const { insertFn } = setupInsertChain(created);
    expect(await criarDependente({ nome: 'Ana' })).toEqual(created);
    expect(insertFn).toHaveBeenCalledWith([{ nome: 'Ana' }]);
  });
});

describe('atualizarDependente', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates dependente by id', async () => {
    const { updateFn, eqFn } = setupUpdateEqChain();
    await atualizarDependente('d1', { nome: 'Ana Paula' });
    expect(updateFn).toHaveBeenCalledWith({ nome: 'Ana Paula' });
    expect(eqFn).toHaveBeenCalledWith('id', 'd1');
  });
});

describe('excluirDependente', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes dependente by id', async () => {
    const { eqFn } = setupDeleteChain();
    await excluirDependente('d1');
    expect(eqFn).toHaveBeenCalledWith('id', 'd1');
  });
});

// ─── Contatos de Emergência ───────────────────────────────────────────────────

describe('listarContatosEmergencia', () => {
  it('always returns empty array (table not available)', async () => {
    expect(await listarContatosEmergencia('c1')).toEqual([]);
  });
});

describe('criarContatoEmergencia', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns contato', async () => {
    const created = { id: 'ce-new', nome: 'Maria' };
    const { insertFn } = setupInsertChain(created);
    expect(await criarContatoEmergencia({ nome: 'Maria' })).toEqual(created);
  });
});

describe('excluirContatoEmergencia', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes contato by id', async () => {
    const { eqFn } = setupDeleteChain();
    await excluirContatoEmergencia('ce1');
    expect(eqFn).toHaveBeenCalledWith('id', 'ce1');
  });
});

// ─── Histórico Salarial ───────────────────────────────────────────────────────

describe('listarHistoricoSalarial', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns historico for colaborador ordered by data_vigencia desc', async () => {
    const records = [{ id: 'hs1' }];
    const { eqFn, orderFn } = setupEqOrderChain(records);
    expect(await listarHistoricoSalarial('c1')).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
    expect(orderFn).toHaveBeenCalledWith('data_vigencia', { ascending: false });
  });
});

describe('criarRegistroSalarial', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns registro', async () => {
    const created = { id: 'hs-new', salario: 5000 };
    const { insertFn } = setupInsertChain(created);
    expect(await criarRegistroSalarial({ salario: 5000 })).toEqual(created);
    expect(insertFn).toHaveBeenCalledWith([{ salario: 5000 }]);
  });
});

// ─── ASOs ─────────────────────────────────────────────────────────────────────

describe('listarASOs', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ASOs for colaborador', async () => {
    const records = [{ id: 'a1' }];
    const { eqFn } = setupEqOrderChain(records);
    expect(await listarASOs('c1')).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });
});

describe('criarASO', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns ASO', async () => {
    const created = { id: 'a-new', tipo: 'Admissional' };
    const { insertFn } = setupInsertChain(created);
    expect(await criarASO({ tipo: 'Admissional' })).toEqual(created);
  });
});

// ─── Formações ────────────────────────────────────────────────────────────────

describe('listarFormacoes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns formacoes for colaborador', async () => {
    const { eqFn } = setupEqOrderChain([]);
    await listarFormacoes('c1');
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });
});

describe('criarFormacao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns formacao', async () => {
    const created = { id: 'f-new', curso: 'Engenharia' };
    setupInsertChain(created);
    expect(await criarFormacao({ curso: 'Engenharia' })).toEqual(created);
  });
});

describe('excluirFormacao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes formacao by id', async () => {
    const { eqFn } = setupDeleteChain();
    await excluirFormacao('f1');
    expect(eqFn).toHaveBeenCalledWith('id', 'f1');
  });
});

// ─── Dados de Estrangeiro ─────────────────────────────────────────────────────

describe('obterDadosEstrangeiro', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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
  beforeEach(() => { vi.clearAllMocks(); });

  it('upserts with onConflict and returns data', async () => {
    const upserted = { id: 'de1', colaborador_id: 'c1', visto: 'B1' };
    const { upsertFn } = setupUpsertChain(upserted);
    const result = await salvarDadosEstrangeiro('c1', { visto: 'B1' });
    expect(upsertFn).toHaveBeenCalledWith(
      { visto: 'B1', colaborador_id: 'c1' },
      { onConflict: 'colaborador_id' }
    );
    expect(result).toEqual(upserted);
  });
});

// ─── Deficiência ──────────────────────────────────────────────────────────────

describe('obterDeficiencia', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns deficiencia for colaborador', async () => {
    const data = { id: 'def1' };
    const { eqFn } = setupEqMaybeSingleChain(data);
    expect(await obterDeficiencia('c1')).toEqual(data);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });
});

describe('salvarDeficiencia', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('upserts with onConflict colaborador_id', async () => {
    const upserted = { id: 'def-new' };
    const { upsertFn } = setupUpsertChain(upserted);
    await salvarDeficiencia('c1', { tipo: 'visual' });
    expect(upsertFn).toHaveBeenCalledWith(
      { tipo: 'visual', colaborador_id: 'c1' },
      { onConflict: 'colaborador_id' }
    );
  });
});

// ─── Período de Experiência ───────────────────────────────────────────────────

describe('obterPeriodoExperiencia', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns periodo for colaborador', async () => {
    const data = { id: 'pe1' };
    const { eqFn } = setupEqMaybeSingleChain(data);
    expect(await obterPeriodoExperiencia('c1')).toEqual(data);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });
});

describe('salvarPeriodoExperiencia — insert when not found', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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

    const result = await salvarPeriodoExperiencia('c1', { dias: 90 });
    expect(insertFn).toHaveBeenCalledWith([{ dias: 90, colaborador_id: 'c1' }]);
    expect(result).toEqual(inserted);
  });
});

describe('salvarPeriodoExperiencia — update when found', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates when existing record found', async () => {
    const existing = { id: 'pe1', colaborador_id: 'c1' };
    const updated = { ...existing, dias: 120 };
    // First: obterPeriodoExperiencia → existing
    const maybeSingle1 = vi.fn().mockResolvedValue({ data: existing, error: null });
    const eq1 = vi.fn().mockReturnValue({ maybeSingle: maybeSingle1 });
    const select1 = vi.fn().mockReturnValue({ eq: eq1 });
    mockFrom.mockReturnValueOnce({ select: select1 });
    // Second: update → eq → select → maybeSingle
    const maybeSingle2 = vi.fn().mockResolvedValue({ data: updated, error: null });
    const select2 = vi.fn().mockReturnValue({ maybeSingle: maybeSingle2 });
    const eqForUpdate = vi.fn().mockReturnValue({ select: select2 });
    const updateFn = vi.fn().mockReturnValue({ eq: eqForUpdate });
    mockFrom.mockReturnValueOnce({ update: updateFn });

    const result = await salvarPeriodoExperiencia('c1', { dias: 120 });
    expect(updateFn).toHaveBeenCalledWith({ dias: 120 });
    expect(eqForUpdate).toHaveBeenCalledWith('id', 'pe1');
    expect(result).toEqual(updated);
  });
});

// ─── Anotações ────────────────────────────────────────────────────────────────

describe('listarAnotacoes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns anotacoes for colaborador', async () => {
    const { eqFn } = setupEqOrderChain([{ id: 'an1' }]);
    await listarAnotacoes('c1');
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });
});

describe('criarAnotacao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns anotacao', async () => {
    const created = { id: 'an-new', texto: 'Bom desempenho' };
    setupInsertChain(created);
    expect(await criarAnotacao({ texto: 'Bom desempenho' })).toEqual(created);
  });
});

describe('excluirAnotacao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes anotacao by id', async () => {
    const { eqFn } = setupDeleteChain();
    await excluirAnotacao('an1');
    expect(eqFn).toHaveBeenCalledWith('id', 'an1');
  });
});

// ─── Períodos Aquisitivos ─────────────────────────────────────────────────────

describe('listarPeriodosAquisitivos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns periodos for colaborador', async () => {
    const { eqFn } = setupEqOrderChain([]);
    await listarPeriodosAquisitivos('c1');
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });
});

// ─── Times ────────────────────────────────────────────────────────────────────

describe('listarTimes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns times without empresa filter', async () => {
    const records = [{ id: 't1', nome: 'Dev' }];
    setupListChain(records);
    expect(await listarTimes()).toEqual(records);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await listarTimes('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });
});

describe('criarTime', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns time', async () => {
    const created = { id: 't-new', nome: 'Design' };
    setupInsertChain(created);
    expect(await criarTime({ nome: 'Design' })).toEqual(created);
  });
});

// ─── Tabelas de referência ────────────────────────────────────────────────────

describe('listarEtnias', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('queries etnias table and returns data', async () => {
    const records = [{ id: 'e1', nome: 'Parda' }];
    setupSelectOrderChain(records);
    expect(await listarEtnias()).toEqual(records);
    expect(mockFrom).toHaveBeenCalledWith('etnias');
  });
});

// ─── Webhooks ────────────────────────────────────────────────────────────────

describe('listarWebhooks', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns webhooks without empresa filter', async () => {
    setupListChain([{ id: 'wh1' }]);
    expect(await listarWebhooks()).toHaveLength(1);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await listarWebhooks('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });
});

describe('criarWebhook', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns webhook', async () => {
    const created = { id: 'wh-new', url: 'https://example.com/hook' };
    setupInsertChain(created);
    expect(await criarWebhook({ url: 'https://example.com/hook' })).toEqual(created);
  });
});

describe('excluirWebhook', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes webhook by id', async () => {
    const { eqFn } = setupDeleteChain();
    await excluirWebhook('wh1');
    expect(eqFn).toHaveBeenCalledWith('id', 'wh1');
  });
});

// ─── Férias Coletivas ─────────────────────────────────────────────────────────

describe('listarFeriasColetivas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ferias coletivas for empresa', async () => {
    const records = [{ id: 'fc1' }];
    const { eqFn } = setupEqOrderChain(records);
    expect(await listarFeriasColetivas('emp-1')).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });
});

describe('criarFeriasColetivas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns ferias coletivas', async () => {
    const created = { id: 'fc-new' };
    setupInsertChain(created);
    expect(await criarFeriasColetivas({})).toEqual(created);
  });
});

// ─── Campos Customizados ──────────────────────────────────────────────────────

describe('listarCamposCustomizados', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns campos without empresa filter and filters by ativo=true', async () => {
    const records = [{ id: 'cc1', ativo: true }];
    const { chain } = setupListChain(records);
    expect(await listarCamposCustomizados()).toEqual(records);
    expect(chain.eq).toHaveBeenCalledWith('ativo', true);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await listarCamposCustomizados('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });
});

describe('obterValoresCamposCustomizados', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns valores for colaborador', async () => {
    const records = [{ id: 'v1' }];
    const { eqFn } = setupEqResolveChain(records);
    expect(await obterValoresCamposCustomizados('c1')).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });
});

describe('salvarValorCampoCustomizado', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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
