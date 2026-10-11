import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import { medidasDisciplinaresService } from '../medidasDisciplinaresService';

const EMPRESA_ID = 'test-empresa-id';

const { mockFrom, mockRpc, mockInvoke, mockStorageUpload, mockSignedUrl, mockGetUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockInvoke: vi.fn(),
  mockStorageUpload: vi.fn(),
  mockSignedUrl: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => deepChain(mockFrom(...a)),
    rpc: mockRpc,
    functions: { invoke: mockInvoke },
    storage: {
      from: vi.fn(() => ({
        upload: mockStorageUpload,
        createSignedUrl: mockSignedUrl,
      })),
    },
    auth: { getUser: mockGetUser },
  },
}));

function setupListChain(data: unknown, error: { message: string; code?: string } | null = null) {
  const response = { data, error };
  const chain: Record<string, unknown> = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.returns = vi.fn().mockReturnValue(chain);
  chain.then = (fn: (v?: unknown) => unknown) => Promise.resolve(response).then(fn);
  chain.catch = (fn: (v?: unknown) => unknown) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: (v?: unknown) => unknown) => Promise.resolve(response).finally(fn);
  const selectFn = vi.fn().mockReturnValue(chain);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, chain };
}

function setupInsertChain(data: unknown, error: { message: string; code?: string } | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, selectFn, maybeSingle };
}

function setupUpdateChain(data: unknown, error: { message: string; code?: string } | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
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

// ─── listar ───────────────────────────────────────────────────────────────────

describe('medidasDisciplinaresService.listar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all medidas without empresa filter', async () => {
    const records = [{ id: 'm1', tipo: 'advertencia' }];
    setupListChain(records);
    const result = await medidasDisciplinaresService.listar(EMPRESA_ID);
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as never);
    const result = await medidasDisciplinaresService.listar(EMPRESA_ID);
    expect(result).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await medidasDisciplinaresService.listar('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('orders by data_ocorrencia descending', async () => {
    const { chain } = setupListChain([]);
    await medidasDisciplinaresService.listar(EMPRESA_ID);
    expect(chain.order).toHaveBeenCalledWith('data_ocorrencia', { ascending: false });
  });

  it('includes colaborador join', async () => {
    const { selectFn } = setupListChain([]);
    await medidasDisciplinaresService.listar(EMPRESA_ID);
    expect(selectFn).toHaveBeenCalledWith(expect.stringContaining('colaborador:colaboradores'));
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(medidasDisciplinaresService.listar(EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── buscarPorColaborador ─────────────────────────────────────────────────────

describe('medidasDisciplinaresService.buscarPorColaborador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns medidas for given colaboradorId', async () => {
    const records = [{ id: 'm1', colaborador_id: 'c1' }];
    const { chain } = setupListChain(records);
    const result = await medidasDisciplinaresService.buscarPorColaborador('c1', EMPRESA_ID);
    expect(result).toEqual(records);
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'c1');
  });

  it('returns empty array when no medidas', async () => {
    setupListChain(null as never);
    const result = await medidasDisciplinaresService.buscarPorColaborador('c-x', EMPRESA_ID);
    expect(result).toEqual([]);
  });

  it('orders by data_ocorrencia descending', async () => {
    const { chain } = setupListChain([]);
    await medidasDisciplinaresService.buscarPorColaborador('c1', EMPRESA_ID);
    expect(chain.order).toHaveBeenCalledWith('data_ocorrencia', { ascending: false });
  });
});

// ─── criar ────────────────────────────────────────────────────────────────────

describe('medidasDisciplinaresService.criar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns new medida', async () => {
    const created = { id: 'm-new', tipo: 'suspensao' };
    const { insertFn } = setupInsertChain(created);
    const result = await medidasDisciplinaresService.criar({
      tipo: 'suspensao',
      colaborador_id: 'colab-1',
      descricao: 'teste',
      data_ocorrencia: '2026-08-08',
    });
    expect(insertFn).toHaveBeenCalledWith({
      tipo: 'suspensao',
      colaborador_id: 'colab-1',
      descricao: 'teste',
      data_ocorrencia: '2026-08-08',
    });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(
      medidasDisciplinaresService.criar({
        tipo: 'suspensao',
        colaborador_id: 'colab-1',
        descricao: 'teste',
        data_ocorrencia: '2026-08-08',
      })
    ).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupInsertChain(null, { message: 'fail' });
    await expect(
      medidasDisciplinaresService.criar({
        tipo: 'suspensao',
        colaborador_id: 'colab-1',
        descricao: 'teste',
        data_ocorrencia: '2026-08-08',
      })
    ).rejects.toBeDefined();
  });
});

// ─── atualizar ────────────────────────────────────────────────────────────────

describe('medidasDisciplinaresService.atualizar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates and returns medida', async () => {
    const updated = { id: 'm1', status: 'concluida' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await medidasDisciplinaresService.atualizar('m1', { status: 'concluida' }, EMPRESA_ID);
    expect(updateFn).toHaveBeenCalledWith({ status: 'concluida' });
    expect(eqFn).toHaveBeenCalledWith('id', 'm1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(medidasDisciplinaresService.atualizar('m1', {}, EMPRESA_ID)).rejects.toThrow();
  });

  it('throws on DB error', async () => {
    setupUpdateChain(null, { message: 'fail' });
    await expect(medidasDisciplinaresService.atualizar('m1', {}, EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── excluir ──────────────────────────────────────────────────────────────────

// ─── RPCs / edge / storage (onda 12) ─────────────────────────────────────────

describe('medidasDisciplinaresService — RPCs do workflow CLT', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sugerirProxima: devolve a primeira linha da RPC', async () => {
    mockRpc.mockResolvedValue({ data: [{ tipo: 'advertencia_escrita' }], error: null });
    const r = await medidasDisciplinaresService.sugerirProxima('c1', EMPRESA_ID);
    expect(mockRpc).toHaveBeenCalledWith('sugerir_proxima_medida', {
      p_colaborador_id: 'c1',
      p_empresa_id: EMPRESA_ID,
    });
    expect(r).toEqual({ tipo: 'advertencia_escrita' });
  });

  it('sugerirProxima: null quando ids ausentes ou RPC vazia', async () => {
    expect(await medidasDisciplinaresService.sugerirProxima('', EMPRESA_ID)).toBeNull();
    expect(await medidasDisciplinaresService.sugerirProxima('c1', '')).toBeNull();
    mockRpc.mockResolvedValue({ data: [], error: null });
    expect(await medidasDisciplinaresService.sugerirProxima('c1', EMPRESA_ID)).toBeNull();
  });

  it.each([
    ['enviarAprovacao', 'medida_enviar_aprovacao', { _medida_id: 'm1' }],
    ['rejeitar', 'medida_rejeitar', { _medida_id: 'm1', _motivo: 'motivo' }],
    ['arquivar', 'medida_arquivar', { _medida_id: 'm1', _observacao: null }],
    ['contestar', 'medida_contestar', { _medida_id: 'm1', _texto: 'texto' }],
    ['responderContestacao', 'medida_responder_contestacao', { _medida_id: 'm1', _resposta: 'resp', _aceita: true }],
    ['aplicarIntegracao', 'aplicar_medida_folha_ponto', { p_medida_id: 'm1' }],
  ])('%s: chama RPC %s com os parâmetros certos', async (metodo, rpc, args) => {
    mockRpc.mockResolvedValue({ data: { ok: true }, error: null });
    const fn = medidasDisciplinaresService[metodo as keyof typeof medidasDisciplinaresService] as (
      ...a: unknown[]
    ) => Promise<unknown>;
    const callArgs =
      metodo === 'rejeitar'
        ? ['m1', 'motivo']
        : metodo === 'contestar'
          ? ['m1', 'texto']
          : metodo === 'responderContestacao'
            ? ['m1', 'resp', true]
            : ['m1'];
    const r = await fn(...callArgs);
    expect(mockRpc).toHaveBeenCalledWith(rpc, args);
    expect(r).toEqual({ ok: true });
  });

  it('aprovar: chama medida_aprovar com observação nula quando omitida', async () => {
    mockRpc.mockResolvedValue({ data: { status: 'aprovada' }, error: null });
    const r = await medidasDisciplinaresService.aprovar('m1');
    expect(mockRpc).toHaveBeenCalledWith('medida_aprovar', {
      _medida_id: 'm1',
      _observacao: null,
    });
    expect(r).toEqual({ status: 'aprovada' });
  });

  it('RPC com erro propaga', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(medidasDisciplinaresService.aplicarIntegracao('m1')).rejects.toEqual({
      message: 'boom',
    });
  });
});

describe('medidasDisciplinaresService — PDF e URLs assinadas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gerarPDF: retorna path/hash/signed_url quando a edge confirma', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, path: 'p', hash: 'h', signed_url: 'u' },
      error: null,
    });
    const r = await medidasDisciplinaresService.gerarPDF('m1');
    expect(mockInvoke).toHaveBeenCalledWith('gerar-medida-disciplinar-pdf', {
      body: { medida_id: 'm1' },
    });
    expect(r).toEqual({ path: 'p', hash: 'h', signed_url: 'u' });
  });

  it('gerarPDF: lança quando a edge responde sem sucesso', async () => {
    mockInvoke.mockResolvedValue({ data: { success: false, error: 'falha' }, error: null });
    await expect(medidasDisciplinaresService.gerarPDF('m1')).rejects.toThrow('falha');
  });

  it('gerarPDF: lança em resposta incompleta', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true, path: 'p' }, error: null });
    await expect(medidasDisciplinaresService.gerarPDF('m1')).rejects.toThrow('incompleta');
  });

  it('gerarPDF: propaga erro da invoke', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'down' } });
    await expect(medidasDisciplinaresService.gerarPDF('m1')).rejects.toEqual({ message: 'down' });
  });

  it('obterSignedUrl/signedUrlAnexoContestacao: devolvem a URL assinada', async () => {
    mockSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://s' }, error: null });
    expect(await medidasDisciplinaresService.obterSignedUrl('p')).toBe('https://s');
    expect(await medidasDisciplinaresService.signedUrlAnexoContestacao('p')).toBe('https://s');
  });

  it('obterSignedUrl: propaga erro do storage', async () => {
    mockSignedUrl.mockResolvedValue({ data: null, error: { message: 'exp' } });
    await expect(medidasDisciplinaresService.obterSignedUrl('p')).rejects.toEqual({
      message: 'exp',
    });
  });
});

describe('medidasDisciplinaresService — anexos e histórico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploadAnexoContestacao: envia arquivo, calcula hash SHA-256 e grava a linha', async () => {
    mockStorageUpload.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    setupInsertChain({ id: 'anx-1', hash_sha256: 'h' });
    const file = new File(['pdf'], 'anexo.pdf', { type: 'application/pdf' });
    const r = await medidasDisciplinaresService.uploadAnexoContestacao('m1', EMPRESA_ID, file);
    expect(r).toEqual({ id: 'anx-1', hash_sha256: 'h' });
    expect(mockStorageUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^test-empresa-id\/m1\/.+-anexo\.pdf$/),
      file,
      { upsert: false, contentType: 'application/pdf' }
    );
  });

  it('uploadAnexoContestacao: exige empresaId', async () => {
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    await expect(medidasDisciplinaresService.uploadAnexoContestacao('m1', '', file)).rejects.toThrow('obrigatório');
  });

  it('uploadAnexoContestacao: erro de upload aborta antes do insert', async () => {
    mockStorageUpload.mockResolvedValue({ error: { message: 'quota' } });
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    await expect(medidasDisciplinaresService.uploadAnexoContestacao('m1', EMPRESA_ID, file)).rejects.toEqual({
      message: 'quota',
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it.each([
    ['listarHistorico', 'medidas_disciplinares_workflow_log'],
    ['listarAnexosContestacao', 'medidas_disciplinares_contestacao_anexos'],
    ['listarIntegracao', 'medidas_disciplinares_integracao'],
  ])('%s: lê %s filtrado por medida_id', async (metodo, tabela) => {
    setupListChain([{ id: 'x1' }]);
    const fn = medidasDisciplinaresService[metodo as keyof typeof medidasDisciplinaresService] as (
      id: string
    ) => Promise<unknown[]>;
    const r = await fn('m1');
    expect(mockFrom).toHaveBeenCalledWith(tabela);
    expect(r).toEqual([{ id: 'x1' }]);
  });
});

describe('medidasDisciplinaresService.excluir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes medida by id', async () => {
    const { deleteFn, eqFn } = setupDeleteChain();
    await medidasDisciplinaresService.excluir('m1', EMPRESA_ID);
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('id', 'm1');
  });

  it('throws on DB error', async () => {
    setupDeleteChain({ message: 'fail' });
    await expect(medidasDisciplinaresService.excluir('m1', EMPRESA_ID)).rejects.toBeDefined();
  });
});
