import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import { afastamentoService } from '../afastamentoService';
import type { ConfigAfastamentoRow } from '@/types/afastamentos';
import { makeChain } from '@/test/chain';

const EMPRESA_ID = 'test-empresa-id';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom, mockUpload, mockSignedUrl } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockUpload: vi.fn(),
  mockSignedUrl: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => deepChain(mockFrom(...a)),
    storage: { from: vi.fn(() => ({ upload: mockUpload, createSignedUrl: mockSignedUrl })) },
  },
}));

vi.mock('@/utils/dateLocal', () => ({
  formatDateLocalISO: (d: Date) => d.toISOString().slice(0, 10),
}));

// Helper: select → eq → order chain (order resolves directly, no range)
function setupListarChain(data: unknown, count: number, error: { message: string; code?: string } | null = null) {
  const response = { data, count, error };
  // `.order(...)` é aguardado direto ou seguido de `.returns<T>()` (tipagem do supabase-js).
  const ordered = {
    returns: vi.fn(() => ordered),
    then: (fn: (v?: unknown) => unknown) => Promise.resolve(response).then(fn),
    catch: (fn: (v?: unknown) => unknown) => Promise.resolve(response).catch(fn),
    finally: (fn: (v?: unknown) => unknown) => Promise.resolve(response).finally(fn),
  };
  const orderFn = vi.fn().mockReturnValue(ordered);
  const baseQuery = { order: orderFn };
  const eqFn = vi.fn().mockReturnValue(baseQuery);
  Object.assign(baseQuery, { eq: eqFn });
  const selectFn = vi.fn().mockReturnValue(baseQuery);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, orderFn };
}

// Helper: thenable chain for select → eq → (optional eq) → await
function setupThenabledChain(data: unknown, error: { message: string; code?: string } | null = null) {
  const response = { data, error };
  const chain: Record<string, unknown> = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.returns = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: (data as never[])?.[0] ?? null, error });
  chain.order = vi.fn().mockReturnValue(chain);
  chain.then = (fn: (v?: unknown) => unknown) => Promise.resolve(response).then(fn);
  chain.catch = (fn: (v?: unknown) => unknown) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: (v?: unknown) => unknown) => Promise.resolve(response).finally(fn);
  const selectFn = vi.fn().mockReturnValue(chain);
  mockFrom.mockReturnValue({ select: selectFn });
  return { chain };
}

// ─── listar ───────────────────────────────────────────────────────────────────

describe('afastamentoService.listar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns data and total from supabase', async () => {
    const records = [{ id: 'af-1', status: 'ativo' }];
    setupListarChain(records, 1);
    const result = await afastamentoService.listar({ filters: { empresa_id: EMPRESA_ID } });
    expect(result.data).toEqual(records);
    expect(result.total).toBe(1);
  });

  it('returns empty data when supabase returns null', async () => {
    setupListarChain(null as never, null as never);
    const result = await afastamentoService.listar({ filters: { empresa_id: EMPRESA_ID } });
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('filters by empresa_id from options.empresaId', async () => {
    const { eqFn } = setupListarChain([], 0);
    await afastamentoService.listar({ empresaId: 'emp-1' } as never);
    expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('filters by empresa_id from options.filters.empresa_id', async () => {
    const { eqFn } = setupListarChain([], 0);
    await afastamentoService.listar({ filters: { empresa_id: 'emp-2' } });
    expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-2');
  });

  it('filters by status when provided in filters', async () => {
    const { eqFn } = setupListarChain([], 0);
    await afastamentoService.listar({ filters: { empresa_id: EMPRESA_ID, status: 'encerrado' } });
    expect(eqFn).toHaveBeenCalledWith('status', 'encerrado');
  });

  it('orders by data_inicio descending', async () => {
    const { orderFn } = setupListarChain([], 0);
    await afastamentoService.listar({ filters: { empresa_id: EMPRESA_ID } });
    expect(orderFn).toHaveBeenCalledWith('data_inicio', { ascending: false });
  });

  it('throws on DB error', async () => {
    setupListarChain([], 0, { message: 'fail' });
    await expect(afastamentoService.listar({ filters: { empresa_id: EMPRESA_ID } })).rejects.toBeDefined();
  });
});

// ─── listarHistoricoRecente ───────────────────────────────────────────────────

describe('afastamentoService.listarHistoricoRecente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns records for given colaboradorId', async () => {
    const records = [{ id: 'af-2', colaborador_id: 'c1' }];
    const { chain } = setupThenabledChain(records);
    const result = await afastamentoService.listarHistoricoRecente('c1', EMPRESA_ID);
    expect(result).toEqual(records);
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'c1');
  });

  it('returns empty array when no records', async () => {
    setupThenabledChain(null as never);
    const result = await afastamentoService.listarHistoricoRecente('c1', EMPRESA_ID);
    expect(result).toEqual([]);
  });

  it('adds gte filter for data_inicio', async () => {
    const { chain } = setupThenabledChain([]);
    await afastamentoService.listarHistoricoRecente('c1', EMPRESA_ID, 30);
    expect(chain.gte).toHaveBeenCalledWith('data_inicio', expect.any(String));
  });

  it('throws on DB error', async () => {
    setupThenabledChain([], { message: 'fail' });
    await expect(afastamentoService.listarHistoricoRecente('c1', EMPRESA_ID)).rejects.toBeDefined();
  });
});

// ─── buscarCID ────────────────────────────────────────────────────────────────

describe('afastamentoService.buscarCID', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns CID results', async () => {
    const cids = [{ codigo: 'J00', descricao: 'Resfriado' }];
    const { chain } = setupThenabledChain(cids);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.returns = vi.fn().mockReturnValue(chain);
    chain.then = (fn: (v?: unknown) => unknown) => Promise.resolve({ data: cids, error: null }).then(fn);
    const result = await afastamentoService.buscarCID('J00');
    expect(result).toEqual(cids);
  });

  it('uses or() filter with code and description ilike', async () => {
    const { chain } = setupThenabledChain([]);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.returns = vi.fn().mockReturnValue(chain);
    chain.then = (fn: (v?: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(fn);
    await afastamentoService.buscarCID('tosse');
    expect(chain.or).toHaveBeenCalledWith(expect.stringContaining('ilike.%tosse%'));
  });

  it('limits results to 10', async () => {
    const { chain } = setupThenabledChain([]);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.returns = vi.fn().mockReturnValue(chain);
    chain.then = (fn: (v?: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(fn);
    await afastamentoService.buscarCID('abc');
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it('returns empty array when no results', async () => {
    const { chain } = setupThenabledChain(null as never);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.returns = vi.fn().mockReturnValue(chain);
    chain.then = (fn: (v?: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(fn);
    const result = await afastamentoService.buscarCID('xyz');
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    const { chain } = setupThenabledChain([]);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.returns = vi.fn().mockReturnValue(chain);
    chain.then = (fn: (v?: unknown) => unknown) => Promise.resolve({ data: null, error: { message: 'fail' } }).then(fn);
    await expect(afastamentoService.buscarCID('err')).rejects.toBeDefined();
  });
});

// ─── listarConfiguracoes ──────────────────────────────────────────────────────

describe('afastamentoService.listarConfiguracoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns configuration records', async () => {
    const configs = [{ tipo: 'doenca', dias_empresa_maximo: 15 }];
    const orderFn = vi.fn().mockResolvedValue({ data: configs, error: null });
    const selectFn = vi.fn().mockReturnValue({ order: orderFn });
    mockFrom.mockReturnValue({ select: selectFn });

    const result = await afastamentoService.listarConfiguracoes();
    expect(result).toEqual(configs);
    expect(mockFrom).toHaveBeenCalledWith('config_afastamentos');
  });

  it('returns empty array when no configurations', async () => {
    const orderFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectFn = vi.fn().mockReturnValue({ order: orderFn });
    mockFrom.mockReturnValue({ select: selectFn });

    const result = await afastamentoService.listarConfiguracoes();
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    const orderFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const selectFn = vi.fn().mockReturnValue({ order: orderFn });
    mockFrom.mockReturnValue({ select: selectFn });

    await expect(afastamentoService.listarConfiguracoes()).rejects.toBeDefined();
  });
});

// ─── calcularDias (pure) ──────────────────────────────────────────────────────

describe('afastamentoService.calcularDias', () => {
  it('returns 1 for same start and end date', () => {
    expect(afastamentoService.calcularDias('2026-01-10', '2026-01-10')).toBe(1);
  });

  it('counts inclusive days correctly', () => {
    // Jan 10 to Jan 14 = 5 days (10,11,12,13,14)
    expect(afastamentoService.calcularDias('2026-01-10', '2026-01-14')).toBe(5);
  });

  it('returns 0 when inicio is missing', () => {
    expect(afastamentoService.calcularDias('', '2026-01-14')).toBe(0);
  });

  it('returns 0 when fim is missing', () => {
    expect(afastamentoService.calcularDias('2026-01-10', '')).toBe(0);
  });

  it('returns 0 for invalid dates', () => {
    expect(afastamentoService.calcularDias('not-a-date', '2026-01-10')).toBe(0);
  });

  it('returns 0 when end is before start', () => {
    expect(afastamentoService.calcularDias('2026-01-20', '2026-01-10')).toBe(0);
  });
});

// ─── calcularDistribuicaoDias (pure) ─────────────────────────────────────────

describe('afastamentoService.calcularDistribuicaoDias', () => {
  const configDoenca: ConfigAfastamentoRow[] = [
    {
      tipo: 'doenca',
      dias_empresa_maximo: 15,
      id: 'cfg-1',
      created_at: new Date().toISOString(),
      descricao: null,
      dias_maximos: null,
      dias_minimos: null,
      exige_cid: null,
      pago_empresa: null,
      pago_inss: null,
    },
  ];
  const configSemLimite: ConfigAfastamentoRow[] = [
    {
      tipo: 'licenca_maternidade',
      dias_empresa_maximo: 0,
      id: 'cfg-2',
      created_at: new Date().toISOString(),
      descricao: null,
      dias_maximos: null,
      dias_minimos: null,
      exige_cid: null,
      pago_empresa: null,
      pago_inss: null,
    },
  ];

  it('all days go to empresa when total <= maxEmpresa', () => {
    const result = afastamentoService.calcularDistribuicaoDias(10, 'doenca', configDoenca);
    expect(result.empresa).toBe(10);
    expect(result.inss).toBe(0);
  });

  it('splits days when total > maxEmpresa', () => {
    const result = afastamentoService.calcularDistribuicaoDias(30, 'doenca', configDoenca);
    expect(result.empresa).toBe(15);
    expect(result.inss).toBe(15);
  });

  it('all days go to empresa when maxEmpresa = 0 (no INSS period)', () => {
    const result = afastamentoService.calcularDistribuicaoDias(20, 'licenca_maternidade', configSemLimite);
    expect(result.empresa).toBe(20);
    expect(result.inss).toBe(0);
  });

  it('uses default 15-day limit for illness types when no config found', () => {
    const result = afastamentoService.calcularDistribuicaoDias(20, 'doenca', []);
    expect(result.empresa).toBe(15);
    expect(result.inss).toBe(5);
  });

  it('empresa=total, inss=0 when no config and tipo is not illness-related', () => {
    const result = afastamentoService.calcularDistribuicaoDias(30, 'licenca_maternidade', []);
    expect(result.empresa).toBe(30);
    expect(result.inss).toBe(0);
  });
});

// ─── excluirDocumento ─────────────────────────────────────────────────────────

describe('afastamentoService.excluirDocumento', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('rejeita sem empresaId (isolamento de tenant)', async () => {
    await expect(afastamentoService.excluirDocumento('doc-1', '')).rejects.toThrow('empresa_id obrigatório');
  });

  it('rejeita quando o documento pertence a outra empresa', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'documentos_afastamento') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: { afastamento_id: 'af-1' }, error: null }) }),
          }),
        };
      }
      if (table === 'afastamentos') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: { empresa_id: 'outra-empresa' }, error: null }) }),
          }),
        };
      }
      throw new Error(`tabela inesperada: ${table}`);
    });

    await expect(afastamentoService.excluirDocumento('doc-1', EMPRESA_ID)).rejects.toThrow('Acesso negado');
  });

  it('exclui o documento quando pertence à empresa informada', async () => {
    let documentosCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'documentos_afastamento') {
        documentosCalls += 1;
        if (documentosCalls === 1) {
          return {
            select: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: { afastamento_id: 'af-1' }, error: null }) }),
            }),
          };
        }
        return { delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }) };
      }
      if (table === 'afastamentos') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: { empresa_id: EMPRESA_ID }, error: null }) }),
          }),
        };
      }
      throw new Error(`tabela inesperada: ${table}`);
    });

    await expect(afastamentoService.excluirDocumento('doc-1', EMPRESA_ID)).resolves.toBeUndefined();
  });
});

// ─── documentos, prorrogações e export (onda 12) ─────────────────────────────

function queueTables(queues: Record<string, unknown[]>) {
  const idx: Record<string, number> = {};
  mockFrom.mockImplementation((t: string) => {
    const q = queues[t] ?? [];
    const i = idx[t] ?? 0;
    idx[t] = i + 1;
    const r = i < q.length ? q[i] : { data: null, error: null };
    return makeChain(r as { data: unknown; error: null });
  });
}

describe('afastamentoService.listarDocumentos', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('retorna documentos do afastamento', async () => {
    queueTables({ documentos_afastamento: [{ data: [{ id: 'd1' }], error: null }] });
    expect(await afastamentoService.listarDocumentos('af-1')).toEqual([{ id: 'd1' }]);
  });

  it('retorna [] quando data é null', async () => {
    queueTables({ documentos_afastamento: [{ data: null, error: null }] });
    expect(await afastamentoService.listarDocumentos('af-1')).toEqual([]);
  });
});

describe('afastamentoService.uploadDocumento', () => {
  const file = new File(['pdf'], 'atestado.pdf', { type: 'application/pdf' });

  beforeEach(() => {
    mockFrom.mockReset();
    mockUpload.mockReset();
    mockSignedUrl.mockReset();
  });

  it('grava no prefixo do tenant e insere o registro com URL assinada', async () => {
    queueTables({
      afastamentos: [{ data: { empresa_id: EMPRESA_ID }, error: null }],
      documentos_afastamento: [{ data: { id: 'doc-1' }, error: null }],
    });
    mockUpload.mockResolvedValue({ error: null });
    mockSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed' } });
    const r = await afastamentoService.uploadDocumento('af-1', file, 'atestado');
    expect(r).toEqual({ id: 'doc-1' });
    expect(mockUpload).toHaveBeenCalledWith(expect.stringMatching(/^test-empresa-id\/af-1\/.+\.pdf$/), file);
  });

  it('falha quando o afastamento não tem empresa', async () => {
    queueTables({ afastamentos: [{ data: null, error: null }] });
    await expect(afastamentoService.uploadDocumento('af-1', file, 'atestado')).rejects.toThrow(
      'Afastamento não encontrado'
    );
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('erro do storage é propagado com mensagem original', async () => {
    queueTables({ afastamentos: [{ data: { empresa_id: EMPRESA_ID }, error: null }] });
    mockUpload.mockResolvedValue({ error: new Error('bucket cheio') });
    await expect(afastamentoService.uploadDocumento('af-1', file, 'atestado')).rejects.toThrow('bucket cheio');
  });
});

describe('afastamentoService.validarDocumento', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('exige empresaId', async () => {
    await expect(afastamentoService.validarDocumento('doc-1', true, '')).rejects.toThrow('empresa_id obrigatório');
  });

  it('documento inexistente', async () => {
    queueTables({ documentos_afastamento: [{ data: null, error: null }] });
    await expect(afastamentoService.validarDocumento('doc-1', true, EMPRESA_ID)).rejects.toThrow(
      'Documento não encontrado'
    );
  });

  it('nega documento de outro tenant', async () => {
    queueTables({
      documentos_afastamento: [{ data: { afastamento_id: 'af-1' }, error: null }],
      afastamentos: [{ data: { empresa_id: 'outra' }, error: null }],
    });
    await expect(afastamentoService.validarDocumento('doc-1', true, EMPRESA_ID)).rejects.toThrow('Acesso negado');
  });

  it('atualiza validado quando pertence ao tenant', async () => {
    queueTables({
      documentos_afastamento: [
        { data: { afastamento_id: 'af-1' }, error: null },
        { data: { id: 'doc-1', validado: true }, error: null },
      ],
      afastamentos: [{ data: { empresa_id: EMPRESA_ID }, error: null }],
    });
    expect(await afastamentoService.validarDocumento('doc-1', true, EMPRESA_ID)).toEqual({
      id: 'doc-1',
      validado: true,
    });
  });
});

describe('afastamentoService.listarProrrogacoes / criarProrrogacao', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    vi.restoreAllMocks();
  });

  it('listarProrrogacoes exige empresaId', async () => {
    await expect(afastamentoService.listarProrrogacoes('af-1')).rejects.toThrow('empresa_id obrigatório');
  });

  it('listarProrrogacoes filtra por afastamento e empresa do pai', async () => {
    const chain = makeChain({ data: [{ id: 'p1' }], error: null });
    mockFrom.mockReturnValue(chain);
    const r = await afastamentoService.listarProrrogacoes('af-1', EMPRESA_ID);
    expect(r).toEqual([{ id: 'p1' }]);
    expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('afastamento:afastamentos!inner('));
    expect(chain.eq).toHaveBeenCalledWith('afastamento_id', 'af-1');
    expect(chain.eq).toHaveBeenCalledWith('afastamento.empresa_id', EMPRESA_ID);
  });

  it('criarProrrogacao exige empresaId', async () => {
    await expect(
      afastamentoService.criarProrrogacao({ afastamento_id: 'af-1', data_fim_nova: '2026-02-01' } as never, '')
    ).rejects.toThrow('empresa_id obrigatório');
  });

  it('criarProrrogacao insere e atualiza o afastamento pai como prorrogado', async () => {
    queueTables({ prorrogacoes_afastamento: [{ data: { id: 'p1' }, error: null }] });
    const atualizar = vi.spyOn(afastamentoService, 'atualizar').mockResolvedValue({} as never);
    const r = await afastamentoService.criarProrrogacao(
      { afastamento_id: 'af-1', data_fim_nova: '2026-02-01' } as never,
      EMPRESA_ID
    );
    expect(r).toEqual({ id: 'p1' });
    expect(atualizar).toHaveBeenCalledWith(
      'af-1',
      { data_fim_prevista: '2026-02-01', status: 'prorrogado' },
      EMPRESA_ID
    );
  });

  it('criarProrrogacao embrulha falhas', async () => {
    queueTables({ prorrogacoes_afastamento: [{ data: null, error: { message: 'x' } }] });
    await expect(
      afastamentoService.criarProrrogacao({ afastamento_id: 'af-1', data_fim_nova: '2026-02-01' } as never, EMPRESA_ID)
    ).rejects.toThrow('Falha ao criar prorrogação');
  });
});

describe('afastamentoService.exportarRelatorio', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('gera CSV, dispara download e devolve os dados', async () => {
    const rows = [
      {
        id: 'abcd-1234',
        colaborador: { nome_completo: 'Ana' },
        tipo: 'doenca',
        cid: null,
        data_inicio: '2026-01-01',
        data_fim_prevista: '2026-01-10',
        dias_total: 10,
        dias_empresa: 10,
        dias_inss: 0,
        status: 'ativo',
      },
    ];
    const listar = vi.spyOn(afastamentoService, 'listar').mockResolvedValue({ data: rows, total: 1 } as never);
    const create = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const r = await afastamentoService.exportarRelatorio(EMPRESA_ID, { status: 'ativo' } as never);
    expect(r).toBe(rows);
    expect(click).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:x');
    expect(listar).toHaveBeenCalledWith({
      filters: { status: 'ativo', empresa_id: EMPRESA_ID },
    });
    const blob = (create.mock.calls[0] as unknown[])[0] as Blob;
    const csv = await blob.text();
    const linhas = csv.split('\n');
    expect(linhas[0]).toContain('Colaborador');
    expect(linhas[0]).toContain('INSS');
    expect(linhas[1]).toBe('abcd,Ana,doenca,-,2026-01-01,2026-01-10,10,10,0,ativo');
    vi.unstubAllGlobals();
  });

  it('embrulha falhas da listagem', async () => {
    vi.spyOn(afastamentoService, 'listar').mockRejectedValue(new Error('db'));
    await expect(afastamentoService.exportarRelatorio(EMPRESA_ID)).rejects.toThrow('Falha ao exportar relatório');
  });
});
