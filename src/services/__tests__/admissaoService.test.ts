import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import { admissaoService } from '../admissaoService';
import type { Insertable } from '@/integrations/supabase/database.types';

const EMPRESA_ID = 'test-empresa-id';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom, mockLoggerError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => deepChain(mockFrom(...a)) },
}));

vi.mock('../loggerService', () => ({
  loggerService: { error: mockLoggerError },
}));

// Helper: select → order → (optional eq) → await
// The chain must be both awaitable and chainable for .eq()
function setupListarAdmissoesChain(data: unknown, error: { message: string; code?: string } | null = null) {
  const response = { data, error };
  const chain: Record<string, unknown> = {};
  chain.eq = vi.fn().mockResolvedValue(response);
  chain.then = (fn: (v?: unknown) => unknown) => Promise.resolve(response).then(fn);
  chain.catch = (fn: (v?: unknown) => unknown) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: (v?: unknown) => unknown) => Promise.resolve(response).finally(fn);
  const orderFn = vi.fn().mockReturnValue(chain);
  const selectFn = vi.fn().mockReturnValue({ order: orderFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, orderFn, chain };
}

// Helper for criar (insert → select → maybeSingle)
function setupCriarChain(data: unknown, error: { message: string; code?: string } | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, selectFn, maybeSingle };
}

// Helper for atualizar without versioning (update → eq → select → maybeSingle)
function setupAtualizarChain(data: unknown, error: { message: string; code?: string } | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const eqFn = vi.fn();
  const __eqChain = { select: selectFn, eq: eqFn };
  eqFn.mockReturnValue(__eqChain);
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn, selectFn, maybeSingle };
}

// ─── listarAdmissoes ──────────────────────────────────────────────────────────

describe('admissaoService.listarAdmissoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('always scopes query by empresa_id (multi-tenant)', async () => {
    const records = [{ id: 'adm-1', nome_candidato: 'João' }];
    const { chain } = setupListarAdmissoesChain(records);
    const result = await admissaoService.listarAdmissoes(EMPRESA_ID);
    expect(result).toEqual(records);
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', EMPRESA_ID);
  });

  it('returns empty array when supabase returns null', async () => {
    setupListarAdmissoesChain(null as never);
    const result = await admissaoService.listarAdmissoes(EMPRESA_ID);
    expect(result).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListarAdmissoesChain([]);
    await admissaoService.listarAdmissoes('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('orders by data_prevista descending', async () => {
    const { orderFn } = setupListarAdmissoesChain([]);
    await admissaoService.listarAdmissoes(EMPRESA_ID);
    expect(orderFn).toHaveBeenCalledWith('data_prevista', { ascending: false });
  });

  it('throws on DB error', async () => {
    setupListarAdmissoesChain([], { message: 'DB fail' });
    await expect(admissaoService.listarAdmissoes(EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── listar ───────────────────────────────────────────────────────────────────

describe('admissaoService.listar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { data, total } delegating to listarAdmissoes', async () => {
    const records = [{ id: 'adm-2' }, { id: 'adm-3' }];
    setupListarAdmissoesChain(records);
    const result = await admissaoService.listar({ filters: { empresa_id: EMPRESA_ID } } as never);
    expect(result.data).toEqual(records);
    expect(result.total).toBe(2);
  });

  it('passes empresa_id from filters', async () => {
    const { chain } = setupListarAdmissoesChain([]);
    await admissaoService.listar({ filters: { empresa_id: 'emp-2' } });
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-2');
  });
});

// ─── getAll (alias) ───────────────────────────────────────────────────────────

describe('admissaoService.getAll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to listarAdmissoes', async () => {
    const records = [{ id: 'adm-4' }];
    setupListarAdmissoesChain(records);
    const result = await admissaoService.getAll('emp-3');
    expect(result).toEqual(records);
  });
});

// ─── create ───────────────────────────────────────────────────────────────────

describe('admissaoService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const admissaoInsert: Insertable<'admissoes'> = {
    nome: 'Maria',
    cargo: 'Analista',
    departamento: 'RH',
    data_prevista: '2026-01-01',
    salario_proposto: 3000,
  };

  it('inserts and returns the created record', async () => {
    const created = { id: 'new-adm', ...admissaoInsert };
    setupCriarChain(created);
    const result = await admissaoService.create(admissaoInsert);
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupCriarChain(null);
    await expect(admissaoService.create(admissaoInsert)).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupCriarChain(null, { message: 'fail' });
    await expect(admissaoService.create(admissaoInsert)).rejects.toBeDefined();
  });
});

// ─── concluir ─────────────────────────────────────────────────────────────────

describe('admissaoService.concluir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const admCompleto = {
    id: 'adm-1',
    etapa: 'documentacao',
    nome: 'Ana',
    cpf: '12345678901',
    email: 'ana@x.com',
    cargo: 'Dev',
    departamento: 'TI',
    data_prevista: '2026-10-01',
    data_nascimento: '1990-01-01',
    nome_mae: 'Mae Ana',
    sexo: 'feminino',
    salario_proposto: 3000,
    metadata: null,
  };

  // mock por TABELA: buscarPorId (admissoes select) → insert colaboradores →
  // reconciliação por CPF (select colaboradores, só em erro) → update admissoes.
  function setupConcluirChains(
    adm: unknown,
    colabResult: { data: unknown; error: unknown },
    existente: { data: unknown; error: unknown } = { data: null, error: null }
  ) {
    const buscarSelect = vi
      .fn()
      .mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: adm, error: null }) });
    const insertFn = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(colabResult) }),
    });
    const colabSelectResult: Record<string, unknown> = {};
    const colabEq = vi.fn().mockReturnValue(colabSelectResult);
    colabSelectResult.eq = colabEq;
    colabSelectResult.maybeSingle = vi.fn().mockResolvedValue(existente);
    const colabSelect = vi.fn().mockReturnValue(colabSelectResult);
    const maybeSingleUpdate = vi.fn().mockResolvedValue({ data: { id: 'adm-1' }, error: null });
    const eqChain: Record<string, unknown> = {};
    eqChain.eq = vi.fn().mockReturnValue(eqChain);
    eqChain.select = vi.fn().mockReturnValue({ maybeSingle: maybeSingleUpdate });
    const updateFn = vi.fn().mockReturnValue(eqChain);
    mockFrom.mockImplementation((table: string) => {
      if (table === 'colaboradores') return { insert: insertFn, select: colabSelect };
      return { select: buscarSelect, update: updateFn };
    });
    return { insertFn, updateFn, colabSelect, colabEq };
  }

  it('cria colaborador com campos mapeados e conclui', async () => {
    const { insertFn, updateFn } = setupConcluirChains(admCompleto, { data: { id: 'colab-1' }, error: null });
    const r = await admissaoService.concluir('adm-1', EMPRESA_ID);
    expect(r.colaboradorId).toBe('colab-1');
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        cpf: '12345678901',
        salario_base: 3000,
        data_nascimento: '1990-01-01',
        nome_mae: 'Mae Ana',
        sexo: 'feminino',
        empresa_id: EMPRESA_ID,
      })
    );
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ etapa: 'concluida' }));
  });

  it('sem dados obrigatórios BLOQUEIA a conclusão com erro acionável', async () => {
    const admSemCpf = { ...admCompleto, cpf: null };
    const { insertFn, updateFn } = setupConcluirChains(admSemCpf, { data: null, error: null });
    await expect(admissaoService.concluir('adm-1', EMPRESA_ID)).rejects.toThrow('CPF');
    expect(insertFn).not.toHaveBeenCalled();
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('insert falha → reconcilia pelo metadata.admissao_id imutável', async () => {
    const { updateFn, colabSelect, colabEq } = setupConcluirChains(
      admCompleto,
      { data: null, error: { message: 'INSERT_ERROR: duplicate key' } },
      { data: { id: 'colab-previo', metadata: { admissao_id: 'adm-1' } }, error: null }
    );
    const r = await admissaoService.concluir('adm-1', EMPRESA_ID);
    expect(r.colaboradorId).toBe('colab-previo');
    expect(colabSelect).toHaveBeenCalledWith('id, observacoes, metadata');
    expect(colabEq).toHaveBeenCalledWith('empresa_id', EMPRESA_ID);
    expect(colabEq).toHaveBeenCalledWith('cpf', admCompleto.cpf);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        etapa: 'concluida',
        metadata: expect.objectContaining({ colaborador_id: 'colab-previo' }),
      })
    );
  });

  it('insert falha → reconcilia pela marca legada em observacoes', async () => {
    const { updateFn } = setupConcluirChains(
      admCompleto,
      { data: null, error: { message: 'INSERT_ERROR: duplicate key' } },
      { data: { id: 'colab-legacy', observacoes: 'Origem: admissão adm-1' }, error: null }
    );
    const r = await admissaoService.concluir('adm-1', EMPRESA_ID);
    expect(r.colaboradorId).toBe('colab-legacy');
    expect(updateFn).toHaveBeenCalled();
  });

  it('insert falha e colaborador com mesmo CPF é de terceiro → propaga o erro', async () => {
    const { updateFn } = setupConcluirChains(
      admCompleto,
      { data: null, error: { message: 'INSERT_ERROR: duplicate key' } },
      { data: { id: 'colab-outro', observacoes: 'cadastro manual', metadata: null }, error: null }
    );
    await expect(admissaoService.concluir('adm-1', EMPRESA_ID)).rejects.toThrow('INSERT_ERROR');
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('insert falha e não existe colaborador marcado → propaga o erro (não vincula terceiros)', async () => {
    const { updateFn } = setupConcluirChains(
      admCompleto,
      { data: null, error: { message: 'INSERT_ERROR: duplicate key' } },
      { data: null, error: null }
    );
    await expect(admissaoService.concluir('adm-1', EMPRESA_ID)).rejects.toThrow('INSERT_ERROR');
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('adm inexistente lança erro', async () => {
    setupConcluirChains(null, { data: null, error: null });
    await expect(admissaoService.concluir('adm-1', EMPRESA_ID)).rejects.toThrow('Admissão não encontrada');
  });

  it('admissão cancelada não pode ser concluída', async () => {
    setupConcluirChains({ ...admCompleto, etapa: 'cancelada' }, { data: null, error: null });
    await expect(admissaoService.concluir('adm-1', EMPRESA_ID)).rejects.toThrow('cancelada');
  });
});

// ─── cancelar ─────────────────────────────────────────────────────────────────

describe('admissaoService.cancelar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls update with etapa=cancelada', async () => {
    const updated = { id: 'adm-1', etapa: 'cancelada' };
    const { updateFn } = setupAtualizarChain(updated);
    await admissaoService.cancelar('adm-1', EMPRESA_ID);
    expect(updateFn).toHaveBeenCalledWith({ etapa: 'cancelada' });
  });

  it('throws on DB error', async () => {
    setupAtualizarChain(null, { message: 'fail' });
    await expect(admissaoService.cancelar('adm-1', EMPRESA_ID)).rejects.toBeDefined();
  });
});
