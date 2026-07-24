import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listarNacionalidades,
  listarTiposDesligamento,
  listarCentrosCusto,
  criarCentroCusto,
  atualizarCentroCusto,
  excluirCentroCusto,
  listarContasBancarias,
  criarContaBancaria,
  atualizarContaBancaria,
  excluirContaBancaria,
  obterDadosEstagiario,
  salvarDadosEstagiario,
  listarDocumentosPessoais,
  criarDocumentoPessoal,
  excluirDocumentoPessoal,
  listarFeriasAprovacoes,
  criarFeriasAprovacao,
  atualizarFeriasAprovacao,
  listarFeriasArquivos,
  criarFeriasArquivo,
  listarDependentesBeneficios,
  vincularDependenteBeneficio,
  desvincularDependenteBeneficio,
} from '../tabelasReferenciaService';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// select → order → resolvedValue  (reference tables via listarReferencia)
function setupReferenceChain(data: any[], error: any = null) {
  const orderFn = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ order: orderFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, orderFn };
}

// Thenable chain with optional eq (listarCentrosCusto)
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

// select → eq → order → resolvedValue
function setupEqOrderChain(data: any[], error: any = null) {
  const orderFn = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ order: orderFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, orderFn };
}

// select → eq → resolvedValue  (listarDependentesBeneficios)
function setupEqResolveChain(data: any[], error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn };
}

// select → eq → maybeSingle  (obterDadosEstagiario)
function setupEqMaybeSingleChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ maybeSingle });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, maybeSingle };
}

// insert([...]).select().maybeSingle()
function setupInsertChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, selectFn, maybeSingle };
}

// upsert([...], opts).select().maybeSingle()
function setupUpsertChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const upsertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ upsert: upsertFn });
  return { upsertFn, selectFn, maybeSingle };
}

// update(dados).eq('id', id) → resolvedValue
function setupUpdateEqChain(error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ error });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn };
}

// delete().eq('id', id) → resolvedValue
function setupDeleteEqChain(error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ error });
  const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ delete: deleteFn });
  return { deleteFn, eqFn };
}

// delete().eq(...).eq(...) → resolvedValue
function setupDeleteDoubleEqChain(error: any = null) {
  const eq2Fn = vi.fn().mockResolvedValue({ error });
  const eq1Fn = vi.fn().mockReturnValue({ eq: eq2Fn });
  const deleteFn = vi.fn().mockReturnValue({ eq: eq1Fn });
  mockFrom.mockReturnValue({ delete: deleteFn });
  return { deleteFn, eq1Fn, eq2Fn };
}

// ─── Reference Tables ─────────────────────────────────────────────────────────

describe('listarNacionalidades', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns records', async () => {
    const records = [{ id: 'n1', nome: 'Brasileira' }];
    setupReferenceChain(records);
    expect(await listarNacionalidades()).toEqual(records);
  });

  it('queries nacionalidades table', async () => {
    setupReferenceChain([]);
    await listarNacionalidades();
    expect(mockFrom).toHaveBeenCalledWith('nacionalidades');
  });

  it('returns empty array when data is null', async () => {
    setupReferenceChain(null as any);
    expect(await listarNacionalidades()).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupReferenceChain([], { message: 'fail' });
    await expect(listarNacionalidades()).rejects.toBeDefined();
  });
});

describe('listarTiposDesligamento', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('queries tipos_desligamento table', async () => {
    setupReferenceChain([]);
    await listarTiposDesligamento();
    expect(mockFrom).toHaveBeenCalledWith('tipos_desligamento');
  });

  it('returns records', async () => {
    const records = [{ id: 't1', nome: 'Demissão' }];
    setupReferenceChain(records);
    expect(await listarTiposDesligamento()).toEqual(records);
  });
});

// ─── Centros de Custo ─────────────────────────────────────────────────────────

describe('listarCentrosCusto', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns centros without empresa filter', async () => {
    const records = [{ id: 'cc1', nome: 'TI' }];
    setupListChain(records);
    expect(await listarCentrosCusto()).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    expect(await listarCentrosCusto()).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await listarCentrosCusto('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('orders by nome', async () => {
    const { chain } = setupListChain([]);
    await listarCentrosCusto();
    expect(chain.order).toHaveBeenCalledWith('nome');
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(listarCentrosCusto()).rejects.toBeDefined();
  });
});

describe('criarCentroCusto', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts wrapped in array and returns new centro', async () => {
    const created = { id: 'cc-new', nome: 'Financeiro' };
    const { insertFn } = setupInsertChain(created);
    const result = await criarCentroCusto({ nome: 'Financeiro' });
    expect(insertFn).toHaveBeenCalledWith([{ nome: 'Financeiro' }]);
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(criarCentroCusto({})).rejects.toThrow('Nenhum registro de centro de custo foi retornado.');
  });

  it('throws on DB error', async () => {
    setupInsertChain(null, { message: 'fail' });
    await expect(criarCentroCusto({})).rejects.toBeDefined();
  });
});

describe('atualizarCentroCusto', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates centro by id', async () => {
    const { updateFn, eqFn } = setupUpdateEqChain();
    await atualizarCentroCusto('cc1', { nome: 'Novo Nome' });
    expect(updateFn).toHaveBeenCalledWith({ nome: 'Novo Nome' });
    expect(eqFn).toHaveBeenCalledWith('id', 'cc1');
  });

  it('throws on DB error', async () => {
    setupUpdateEqChain({ message: 'fail' });
    await expect(atualizarCentroCusto('cc1', {})).rejects.toBeDefined();
  });
});

describe('excluirCentroCusto', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes centro by id', async () => {
    const { deleteFn, eqFn } = setupDeleteEqChain();
    await excluirCentroCusto('cc1');
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'cc1');
  });

  it('throws on DB error', async () => {
    setupDeleteEqChain({ message: 'fail' });
    await expect(excluirCentroCusto('cc1')).rejects.toBeDefined();
  });
});

// ─── Contas Bancárias ─────────────────────────────────────────────────────────

describe('listarContasBancarias', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns contas for colaborador', async () => {
    const records = [{ id: 'cb1', colaborador_id: 'c1' }];
    const { eqFn } = setupEqOrderChain(records);
    const result = await listarContasBancarias('c1');
    expect(result).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });

  it('orders by principal descending', async () => {
    const { orderFn } = setupEqOrderChain([]);
    await listarContasBancarias('c1');
    expect(orderFn).toHaveBeenCalledWith('principal', { ascending: false });
  });

  it('returns empty array when data is null', async () => {
    setupEqOrderChain(null as any);
    expect(await listarContasBancarias('c1')).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupEqOrderChain([], { message: 'fail' });
    await expect(listarContasBancarias('c1')).rejects.toBeDefined();
  });
});

describe('criarContaBancaria', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts wrapped in array and returns new conta', async () => {
    const created = { id: 'cb-new', banco: 'Bradesco' };
    const { insertFn } = setupInsertChain(created);
    const result = await criarContaBancaria({ banco: 'Bradesco' });
    expect(insertFn).toHaveBeenCalledWith([{ banco: 'Bradesco' }]);
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(criarContaBancaria({})).rejects.toThrow('Nenhum registro de conta bancária foi retornado.');
  });
});

describe('atualizarContaBancaria', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates conta by id', async () => {
    const { updateFn, eqFn } = setupUpdateEqChain();
    await atualizarContaBancaria('cb1', { agencia: '1234' });
    expect(updateFn).toHaveBeenCalledWith({ agencia: '1234' });
    expect(eqFn).toHaveBeenCalledWith('id', 'cb1');
  });

  it('throws on DB error', async () => {
    setupUpdateEqChain({ message: 'fail' });
    await expect(atualizarContaBancaria('cb1', {})).rejects.toBeDefined();
  });
});

describe('excluirContaBancaria', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes conta by id', async () => {
    const { deleteFn, eqFn } = setupDeleteEqChain();
    await excluirContaBancaria('cb1');
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'cb1');
  });

  it('throws on DB error', async () => {
    setupDeleteEqChain({ message: 'fail' });
    await expect(excluirContaBancaria('cb1')).rejects.toBeDefined();
  });
});

// ─── Dados de Estagiário ──────────────────────────────────────────────────────

describe('obterDadosEstagiario', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns dados for colaborador', async () => {
    const data = { id: 'de1', colaborador_id: 'c1' };
    const { eqFn } = setupEqMaybeSingleChain(data);
    const result = await obterDadosEstagiario('c1');
    expect(result).toEqual(data);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });

  it('returns null when not found', async () => {
    setupEqMaybeSingleChain(null);
    expect(await obterDadosEstagiario('c1')).toBeNull();
  });

  it('throws on DB error', async () => {
    setupEqMaybeSingleChain(null, { message: 'fail' });
    await expect(obterDadosEstagiario('c1')).rejects.toBeDefined();
  });
});

describe('salvarDadosEstagiario — insert when no existing record', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts with colaborador_id injected when not found', async () => {
    const inserted = { id: 'de-new', colaborador_id: 'c1', nivel: 'superior' };
    // First call: obterDadosEstagiario → null
    const maybeSingle1 = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq1Fn = vi.fn().mockReturnValue({ maybeSingle: maybeSingle1 });
    const select1Fn = vi.fn().mockReturnValue({ eq: eq1Fn });
    mockFrom.mockReturnValueOnce({ select: select1Fn });
    // Second call: insert
    const maybeSingle2 = vi.fn().mockResolvedValue({ data: inserted, error: null });
    const select2Fn = vi.fn().mockReturnValue({ maybeSingle: maybeSingle2 });
    const insertFn = vi.fn().mockReturnValue({ select: select2Fn });
    mockFrom.mockReturnValueOnce({ insert: insertFn });

    const result = await salvarDadosEstagiario('c1', { nivel: 'superior' });
    expect(insertFn).toHaveBeenCalledWith([{ nivel: 'superior', colaborador_id: 'c1' }]);
    expect(result).toEqual(inserted);
  });
});

describe('salvarDadosEstagiario — update when existing record found', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates using existing.id', async () => {
    const existing = { id: 'de1', colaborador_id: 'c1' };
    const updated = { ...existing, nivel: 'superior' };
    // First call: obterDadosEstagiario → existing
    const maybeSingle1 = vi.fn().mockResolvedValue({ data: existing, error: null });
    const eq1Fn = vi.fn().mockReturnValue({ maybeSingle: maybeSingle1 });
    const select1Fn = vi.fn().mockReturnValue({ eq: eq1Fn });
    mockFrom.mockReturnValueOnce({ select: select1Fn });
    // Second call: update → eq → select → maybeSingle
    const maybeSingle2 = vi.fn().mockResolvedValue({ data: updated, error: null });
    const select2Fn = vi.fn().mockReturnValue({ maybeSingle: maybeSingle2 });
    const updateEqFn = vi.fn().mockReturnValue({ select: select2Fn });
    const updateFn = vi.fn().mockReturnValue({ eq: updateEqFn });
    mockFrom.mockReturnValueOnce({ update: updateFn });

    const result = await salvarDadosEstagiario('c1', { nivel: 'superior' });
    expect(updateFn).toHaveBeenCalledWith({ nivel: 'superior' });
    expect(updateEqFn).toHaveBeenCalledWith('id', 'de1');
    expect(result).toEqual(updated);
  });

  it('wraps errors in "Falha ao salvar dados de estagiário" message', async () => {
    const maybeSingle1 = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB fail' } });
    const eq1Fn = vi.fn().mockReturnValue({ maybeSingle: maybeSingle1 });
    const select1Fn = vi.fn().mockReturnValue({ eq: eq1Fn });
    mockFrom.mockReturnValueOnce({ select: select1Fn });

    await expect(salvarDadosEstagiario('c1', {})).rejects.toThrow('Falha ao salvar dados de estagiário');
  });
});

// ─── Documentos Pessoais ──────────────────────────────────────────────────────

describe('listarDocumentosPessoais', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns documentos for colaborador', async () => {
    const records = [{ id: 'dp1', colaborador_id: 'c1' }];
    const { eqFn } = setupEqOrderChain(records);
    const result = await listarDocumentosPessoais('c1');
    expect(result).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'c1');
  });

  it('orders by created_at descending', async () => {
    const { orderFn } = setupEqOrderChain([]);
    await listarDocumentosPessoais('c1');
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns empty array when data is null', async () => {
    setupEqOrderChain(null as any);
    expect(await listarDocumentosPessoais('c1')).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupEqOrderChain([], { message: 'fail' });
    await expect(listarDocumentosPessoais('c1')).rejects.toBeDefined();
  });
});

describe('criarDocumentoPessoal', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts wrapped in array and returns new documento', async () => {
    const created = { id: 'dp-new', tipo: 'CPF' };
    const { insertFn } = setupInsertChain(created);
    const result = await criarDocumentoPessoal({ tipo: 'CPF' });
    expect(insertFn).toHaveBeenCalledWith([{ tipo: 'CPF' }]);
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(criarDocumentoPessoal({})).rejects.toThrow('Nenhum registro de documento pessoal foi retornado.');
  });
});

describe('excluirDocumentoPessoal', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes documento by id', async () => {
    const { deleteFn, eqFn } = setupDeleteEqChain();
    await excluirDocumentoPessoal('dp1');
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'dp1');
  });

  it('throws on DB error', async () => {
    setupDeleteEqChain({ message: 'fail' });
    await expect(excluirDocumentoPessoal('dp1')).rejects.toBeDefined();
  });
});

// ─── Férias Aprovações ────────────────────────────────────────────────────────

describe('listarFeriasAprovacoes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns aprovacoes for ferias_id', async () => {
    const records = [{ id: 'fa1', ferias_id: 'f1' }];
    const { eqFn } = setupEqOrderChain(records);
    const result = await listarFeriasAprovacoes('f1');
    expect(result).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('ferias_id', 'f1');
  });

  it('orders by created_at ascending', async () => {
    const { orderFn } = setupEqOrderChain([]);
    await listarFeriasAprovacoes('f1');
    expect(orderFn).toHaveBeenCalledWith('created_at');
  });

  it('returns empty array when data is null', async () => {
    setupEqOrderChain(null as any);
    expect(await listarFeriasAprovacoes('f1')).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupEqOrderChain([], { message: 'fail' });
    await expect(listarFeriasAprovacoes('f1')).rejects.toBeDefined();
  });
});

describe('criarFeriasAprovacao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts wrapped in array and returns new aprovacao', async () => {
    const created = { id: 'fa-new', status: 'aprovado' };
    const { insertFn } = setupInsertChain(created);
    const result = await criarFeriasAprovacao({ status: 'aprovado' });
    expect(insertFn).toHaveBeenCalledWith([{ status: 'aprovado' }]);
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(criarFeriasAprovacao({})).rejects.toThrow('Nenhum registro de aprovação de férias foi retornado.');
  });
});

describe('atualizarFeriasAprovacao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates aprovacao by id', async () => {
    const { updateFn, eqFn } = setupUpdateEqChain();
    await atualizarFeriasAprovacao('fa1', { status: 'rejeitado' });
    expect(updateFn).toHaveBeenCalledWith({ status: 'rejeitado' });
    expect(eqFn).toHaveBeenCalledWith('id', 'fa1');
  });

  it('throws on DB error', async () => {
    setupUpdateEqChain({ message: 'fail' });
    await expect(atualizarFeriasAprovacao('fa1', {})).rejects.toBeDefined();
  });
});

// ─── Férias Arquivos ──────────────────────────────────────────────────────────

describe('listarFeriasArquivos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns arquivos for ferias_id', async () => {
    const records = [{ id: 'ar1', ferias_id: 'f1' }];
    const { eqFn } = setupEqOrderChain(records);
    const result = await listarFeriasArquivos('f1');
    expect(result).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('ferias_id', 'f1');
  });

  it('orders by created_at', async () => {
    const { orderFn } = setupEqOrderChain([]);
    await listarFeriasArquivos('f1');
    expect(orderFn).toHaveBeenCalledWith('created_at');
  });

  it('returns empty array when data is null', async () => {
    setupEqOrderChain(null as any);
    expect(await listarFeriasArquivos('f1')).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupEqOrderChain([], { message: 'fail' });
    await expect(listarFeriasArquivos('f1')).rejects.toBeDefined();
  });
});

describe('criarFeriasArquivo', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts wrapped in array and returns new arquivo', async () => {
    const created = { id: 'ar-new', nome: 'recibo.pdf' };
    const { insertFn } = setupInsertChain(created);
    const result = await criarFeriasArquivo({ nome: 'recibo.pdf' });
    expect(insertFn).toHaveBeenCalledWith([{ nome: 'recibo.pdf' }]);
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(criarFeriasArquivo({})).rejects.toThrow('Nenhum registro de arquivo de férias foi retornado.');
  });
});

// ─── Dependentes Benefícios ───────────────────────────────────────────────────

describe('listarDependentesBeneficios', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns beneficios for dependente', async () => {
    const records = [{ id: 'db1', dependente_id: 'd1' }];
    const { eqFn } = setupEqResolveChain(records);
    const result = await listarDependentesBeneficios('d1');
    expect(result).toEqual(records);
    expect(eqFn).toHaveBeenCalledWith('dependente_id', 'd1');
  });

  it('returns empty array when data is null', async () => {
    setupEqResolveChain(null as any);
    expect(await listarDependentesBeneficios('d1')).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupEqResolveChain([], { message: 'fail' });
    await expect(listarDependentesBeneficios('d1')).rejects.toBeDefined();
  });
});

describe('vincularDependenteBeneficio', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('upserts with onConflict and returns vinculo', async () => {
    const created = { id: 'v-new', dependente_id: 'd1', beneficio_id: 'b1' };
    const { upsertFn } = setupUpsertChain(created);
    const result = await vincularDependenteBeneficio({ dependente_id: 'd1', beneficio_id: 'b1' });
    expect(upsertFn).toHaveBeenCalledWith(
      [{ dependente_id: 'd1', beneficio_id: 'b1' }],
      { onConflict: 'dependente_id,beneficio_id' }
    );
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupUpsertChain(null);
    await expect(vincularDependenteBeneficio({})).rejects.toThrow('Falha ao vincular dependente ao benefício.');
  });

  it('throws on DB error', async () => {
    setupUpsertChain(null, { message: 'fail' });
    await expect(vincularDependenteBeneficio({})).rejects.toBeDefined();
  });
});

describe('desvincularDependenteBeneficio', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes vinculo by dependente_id and beneficio_id', async () => {
    const { deleteFn, eq1Fn, eq2Fn } = setupDeleteDoubleEqChain();
    await desvincularDependenteBeneficio('d1', 'b1');
    expect(deleteFn).toHaveBeenCalled();
    expect(eq1Fn).toHaveBeenCalledWith('dependente_id', 'd1');
    expect(eq2Fn).toHaveBeenCalledWith('beneficio_id', 'b1');
  });

  it('throws on DB error', async () => {
    setupDeleteDoubleEqChain({ message: 'fail' });
    await expect(desvincularDependenteBeneficio('d1', 'b1')).rejects.toBeDefined();
  });
});
