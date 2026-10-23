import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import { catalogoCursoService } from '../catalogoCursoService';

const EMPRESA_ID = 'test-empresa-id';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => deepChain(mockFrom(...a)) },
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

function setupUpdateChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const eqFn = vi.fn();
  const __eqChain = { select: selectFn, eq: eqFn };
  eqFn.mockReturnValue(__eqChain);
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn, selectFn, maybeSingle };
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

// ─── Cursos ───────────────────────────────────────────────────────────────────

describe('catalogoCursoService.listarCursos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cursos without empresa filter', async () => {
    const records = [{ id: 'c1', nome: 'Excel Avançado' }];
    setupListChain(records);
    expect(await catalogoCursoService.listarCursos(EMPRESA_ID)).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    expect(await catalogoCursoService.listarCursos(EMPRESA_ID)).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await catalogoCursoService.listarCursos('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('orders by nome', async () => {
    const { chain } = setupListChain([]);
    await catalogoCursoService.listarCursos(EMPRESA_ID);
    expect(chain.order).toHaveBeenCalledWith('nome');
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(catalogoCursoService.listarCursos(EMPRESA_ID)).rejects.toBeDefined();
  });
});

describe('catalogoCursoService.criarCurso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns new curso', async () => {
    const created = { id: 'c-new', nome: 'Python' };
    const { insertFn } = setupInsertChain(created);
    const result = await catalogoCursoService.criarCurso({ nome: 'Python', empresa_id: EMPRESA_ID });
    expect(insertFn).toHaveBeenCalledWith({ nome: 'Python', empresa_id: EMPRESA_ID });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(catalogoCursoService.criarCurso({})).rejects.toThrow();
  });
});

describe('catalogoCursoService.atualizarCurso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates and returns curso', async () => {
    const updated = { id: 'c1', carga_horaria: 20 };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await catalogoCursoService.atualizarCurso('c1', { carga_horaria: 20 }, EMPRESA_ID);
    expect(updateFn).toHaveBeenCalledWith({ carga_horaria: 20 });
    expect(eqFn).toHaveBeenCalledWith('id', 'c1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(catalogoCursoService.atualizarCurso('c1', {}, EMPRESA_ID)).rejects.toThrow();
  });
});

describe('catalogoCursoService.excluirCurso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes curso by id', async () => {
    const { eqFn } = setupDeleteChain();
    await catalogoCursoService.excluirCurso('c1', EMPRESA_ID);
    expect(eqFn).toHaveBeenCalledWith('id', 'c1');
  });
});

// ─── Trilhas ──────────────────────────────────────────────────────────────────

describe('catalogoCursoService.listarTrilhas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns trilhas without empresa filter', async () => {
    const records = [{ id: 't1', titulo: 'Trilha Dev' }];
    setupListChain(records);
    expect(await catalogoCursoService.listarTrilhas(EMPRESA_ID)).toEqual(records);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await catalogoCursoService.listarTrilhas('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('orders by nome (coluna real; `titulo` não existe em trilhas_aprendizado)', async () => {
    const { chain } = setupListChain([]);
    await catalogoCursoService.listarTrilhas(EMPRESA_ID);
    expect(chain.order).toHaveBeenCalledWith('nome');
  });
});

describe('catalogoCursoService.criarTrilha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns new trilha', async () => {
    const created = { id: 't-new', nome: 'Liderança' };
    const { insertFn } = setupInsertChain(created);
    const result = await catalogoCursoService.criarTrilha({ titulo: 'Liderança', empresa_id: EMPRESA_ID });
    expect(result).toEqual(created);
  });

  /**
   * Regressão: o formulário envia `titulo`, mas a coluna é `nome`. O INSERT com
   * `titulo` derrubava a criação (coluna inexistente no schema remoto).
   */
  it('mapeia titulo → nome e nunca envia colunas inexistentes', async () => {
    const { insertFn } = setupInsertChain({ id: 't-new', nome: 'Liderança' });
    await catalogoCursoService.criarTrilha({
      titulo: '  Liderança  ',
      descricao: 'Formar líderes',
      nivel: 'intermediario',
      empresa_id: EMPRESA_ID,
    });
    const payload = insertFn.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toEqual({
      empresa_id: EMPRESA_ID,
      nome: 'Liderança',
      descricao: 'Formar líderes',
      nivel: 'intermediario',
    });
    expect(payload).not.toHaveProperty('titulo');
  });

  it('aceita `nome` quando a origem já usa a coluna real', async () => {
    const { insertFn } = setupInsertChain({ id: 't-2', nome: 'Dados' });
    await catalogoCursoService.criarTrilha({ nome: 'Dados', empresa_id: EMPRESA_ID });
    expect(insertFn.mock.calls[0][0]).toMatchObject({ nome: 'Dados' });
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(catalogoCursoService.criarTrilha({})).rejects.toThrow();
  });

  it('exige nome mesmo com empresa_id presente', async () => {
    await expect(
      catalogoCursoService.criarTrilha({ titulo: '   ', empresa_id: EMPRESA_ID })
    ).rejects.toThrow(/nome da trilha/);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('catalogoCursoService.excluirTrilha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes trilha by id', async () => {
    const { eqFn } = setupDeleteChain();
    await catalogoCursoService.excluirTrilha('t1', EMPRESA_ID);
    expect(eqFn).toHaveBeenCalledWith('id', 't1');
  });
});

// ─── Inscrições ───────────────────────────────────────────────────────────────

describe('catalogoCursoService.listarInscricoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns inscricoes without filters', async () => {
    const records = [{ id: 'i1' }];
    setupListChain(records);
    expect(await catalogoCursoService.listarInscricoes(EMPRESA_ID)).toEqual(records);
  });

  it('filters by curso_id when provided', async () => {
    const { chain } = setupListChain([]);
    await catalogoCursoService.listarInscricoes(EMPRESA_ID, 'c1');
    expect(chain.eq).toHaveBeenCalledWith('curso_id', 'c1');
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await catalogoCursoService.listarInscricoes('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('includes colaborador and curso joins', async () => {
    const { selectFn } = setupListChain([]);
    await catalogoCursoService.listarInscricoes(EMPRESA_ID);
    expect(selectFn).toHaveBeenCalledWith(expect.stringContaining('colaborador:colaboradores'));
    expect(selectFn).toHaveBeenCalledWith(expect.stringContaining('curso:catalogo_cursos'));
  });
});

describe('catalogoCursoService.criarInscricao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns new inscricao', async () => {
    const created = { id: 'i-new', curso_id: 'c1' };
    const { insertFn } = setupInsertChain(created);
    const result = await catalogoCursoService.criarInscricao({ curso_id: 'c1', empresa_id: EMPRESA_ID });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(catalogoCursoService.criarInscricao({})).rejects.toThrow();
  });
});

describe('catalogoCursoService.atualizarInscricao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates and returns inscricao', async () => {
    const updated = { id: 'i1', status: 'concluida' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await catalogoCursoService.atualizarInscricao('i1', { status: 'concluida' }, EMPRESA_ID);
    expect(updateFn).toHaveBeenCalledWith({ status: 'concluida' });
    expect(eqFn).toHaveBeenCalledWith('id', 'i1');
    expect(result).toEqual(updated);
  });
});

// ─── Trilhas-Cursos (vinculação) ──────────────────────────────────────────────

describe('catalogoCursoService.listarTrilhasCursos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns trilha cursos for given trilhaId', async () => {
    const orderFn = vi.fn().mockResolvedValue({ data: [{ id: 'tc1' }], error: null });
    const eqFn = vi.fn().mockReturnValue({ order: orderFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ select: selectFn });

    const result = await catalogoCursoService.listarTrilhasCursos('t1');
    expect(result).toEqual([{ id: 'tc1' }]);
    expect(eqFn).toHaveBeenCalledWith('trilha_id', 't1');
  });
});

describe('catalogoCursoService.vincularCursoTrilha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns vinculo', async () => {
    const created = { id: 'v-new' };
    const { insertFn } = setupInsertChain(created);
    const result = await catalogoCursoService.vincularCursoTrilha({ trilha_id: 't1', curso_id: 'c1' });
    expect(insertFn).toHaveBeenCalledWith({ trilha_id: 't1', curso_id: 'c1' });
    expect(result).toEqual(created);
  });
});

describe('catalogoCursoService.desvincularCursoTrilha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes vinculo by id', async () => {
    const { eqFn } = setupDeleteChain();
    await catalogoCursoService.desvincularCursoTrilha('v1', 't1');
    expect(eqFn).toHaveBeenCalledWith('id', 'v1');
  });
});

// ─── Feedback e Certificados ──────────────────────────────────────────────────

describe('catalogoCursoService.registrarFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts and returns feedback', async () => {
    const created = { id: 'fb-new', nota_satisfacao: 5 };
    const { insertFn } = setupInsertChain(created);
    const result = await catalogoCursoService.registrarFeedback({
      inscricao_id: 'i1',
      nota_satisfacao: 5,
    });
    expect(result).toEqual(created);
  });
});

/**
 * Regressão da Fase 3A.2: `treinamento_certificados` NÃO tem `empresa_id`.
 * O filtro passa a usar o relacionamento real
 * `colaborador_id → colaboradores.empresa_id` (`!inner`), como a RLS já faz.
 */
describe('catalogoCursoService.listarCertificados (tenant via colaborador)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setup(data: any, error: any = null) {
    const orderFn = vi.fn().mockResolvedValue({ data, error });
    const eqFn = vi.fn();
    const chain = { eq: eqFn, order: orderFn };
    eqFn.mockReturnValue(chain);
    const selectFn = vi.fn().mockReturnValue(chain);
    mockFrom.mockReturnValue({ select: selectFn });
    return { selectFn, eqFn, orderFn };
  }

  it('filtra pelo colaborador embutido e nunca por empresa_id direto', async () => {
    const registros = [{ id: 'cert-1', colaborador: { nome_completo: 'Ana', empresa_id: EMPRESA_ID } }];
    const { selectFn, eqFn } = setup(registros);

    const resultado = await catalogoCursoService.listarCertificados(EMPRESA_ID);

    expect(mockFrom).toHaveBeenCalledWith('treinamento_certificados');
    const select = selectFn.mock.calls[0][0] as string;
    expect(select).toContain('colaborador:colaboradores');
    expect(select).toContain('treinamento_certificados_colaborador_id_fkey');
    expect(select).toContain('!inner');
    expect(eqFn).toHaveBeenCalledWith('colaborador.empresa_id', EMPRESA_ID);
    expect(eqFn).not.toHaveBeenCalledWith('empresa_id', EMPRESA_ID);
    expect(resultado).toEqual(registros);
  });

  it('empresa diferente usa o próprio tenant no filtro', async () => {
    const { eqFn } = setup([]);

    await catalogoCursoService.listarCertificados('outra-empresa');

    expect(eqFn).toHaveBeenCalledWith('colaborador.empresa_id', 'outra-empresa');
    expect(eqFn).not.toHaveBeenCalledWith('empresa_id', 'outra-empresa');
  });

  it('preserva colaboradorId opcional', async () => {
    const { eqFn } = setup([{ id: 'cert-1' }]);

    await catalogoCursoService.listarCertificados(EMPRESA_ID, 'colab-9');

    expect(eqFn).toHaveBeenCalledWith('colaborador.empresa_id', EMPRESA_ID);
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'colab-9');
  });

  it('lista vazia (null) vira array vazio', async () => {
    setup(null);
    expect(await catalogoCursoService.listarCertificados(EMPRESA_ID)).toEqual([]);
  });

  it('relacionamento inválido (sem colaborador/outro tenant) não retorna registro', async () => {
    // O `!inner` descarta a linha; o PostgREST devolve lista vazia.
    setup([]);
    expect(await catalogoCursoService.listarCertificados(EMPRESA_ID)).toEqual([]);
  });

  it('certificado inexistente devolve lista vazia', async () => {
    setup([]);
    expect(await catalogoCursoService.listarCertificados(EMPRESA_ID, 'inexistente')).toEqual([]);
  });

  it('ordena por data de emissão desc', async () => {
    const { orderFn } = setup([]);
    await catalogoCursoService.listarCertificados(EMPRESA_ID);
    expect(orderFn).toHaveBeenCalledWith('data_emissao', { ascending: false });
  });

  it('preserva os campos exibidos (validade, código, curso e colaborador)', async () => {
    const registro = {
      id: 'cert-1',
      data_emissao: '2026-01-10',
      data_validade: '2027-01-10',
      codigo_autenticacao: 'ABC-123',
      arquivo_url: 'https://exemplo/cert.pdf',
      curso: { nome: 'Curso A', carga_horaria: 4 },
      colaborador: { nome_completo: 'Ana', empresa_id: EMPRESA_ID },
    };
    setup([registro]);

    expect(await catalogoCursoService.listarCertificados(EMPRESA_ID)).toEqual([registro]);
  });

  it('propaga erro do banco', async () => {
    setup(null, { message: 'rls' });
    await expect(catalogoCursoService.listarCertificados(EMPRESA_ID)).rejects.toBeDefined();
  });

  it('exige empresa antes de consultar', async () => {
    await expect(catalogoCursoService.listarCertificados('')).rejects.toThrow(/empresa_id obrigatório/);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

/**
 * Regressão do achado da Fase 2: `listarInstancias` filtrava por `empresa_id`,
 * coluna que NÃO existe em `treinamento_instancias`. O isolamento real é via
 * `curso_id → catalogo_cursos.empresa_id`.
 */
describe('catalogoCursoService.listarInstancias (isolamento via curso)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filtra pelo recurso embutido do curso e nunca por empresa_id direto', async () => {
    const { selectFn, chain } = setupListChain([{ id: 'inst-1' }]);

    const resultado = await catalogoCursoService.listarInstancias(EMPRESA_ID);

    expect(mockFrom).toHaveBeenCalledWith('treinamento_instancias');
    const select = selectFn.mock.calls[0][0] as string;
    expect(select).toContain('curso:catalogo_cursos');
    expect(select).toContain('!inner');
    expect(chain.eq).toHaveBeenCalledWith('curso.empresa_id', EMPRESA_ID);
    expect(chain.eq).not.toHaveBeenCalledWith('empresa_id', EMPRESA_ID);
    expect(chain.order).toHaveBeenCalledWith('data_inicio', { ascending: true });
    expect(resultado).toEqual([{ id: 'inst-1' }]);
  });

  it('preserva o filtro opcional por curso', async () => {
    const { chain } = setupListChain([{ id: 'inst-2' }]);

    await catalogoCursoService.listarInstancias(EMPRESA_ID, 'curso-9');

    expect(chain.eq).toHaveBeenCalledWith('curso.empresa_id', EMPRESA_ID);
    expect(chain.eq).toHaveBeenCalledWith('curso_id', 'curso-9');
  });

  it('exige empresa antes de consultar', async () => {
    await expect(catalogoCursoService.listarInstancias('')).rejects.toThrow(/empresa_id obrigatório/);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

/**
 * Regressão da Fase 3A.1: `treinamento_instancias` NÃO tem `empresa_id`.
 * `criarInstancia` exigia a coluna e a enviava no INSERT — a criação de turma
 * falhava no PostgREST. O vínculo real é `curso_id → catalogo_cursos.
 * empresa_id`.
 */
describe('catalogoCursoService.criarInstancia (sem empresa_id na tabela)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupCriacao(curso: any, criada: any, errorInsert: any = null) {
    const maybeSingleCurso = vi.fn().mockResolvedValue({ data: curso, error: null });
    const eqCurso = vi.fn().mockReturnValue({ maybeSingle: maybeSingleCurso });
    const selectCurso = vi.fn().mockReturnValue({ eq: eqCurso });

    const maybeSingleInsert = vi.fn().mockResolvedValue({ data: criada, error: errorInsert });
    const selectInsert = vi.fn().mockReturnValue({ maybeSingle: maybeSingleInsert });
    const insertFn = vi.fn().mockReturnValue({ select: selectInsert });

    mockFrom.mockImplementation((tabela: string) =>
      tabela === 'catalogo_cursos' ? { select: selectCurso } : { insert: insertFn }
    );
    return { insertFn, selectCurso, eqCurso, maybeSingleCurso };
  }

  it('remove empresa_id do payload e valida a dona do curso', async () => {
    const { insertFn, eqCurso } = setupCriacao(
      { id: 'curso-1', empresa_id: EMPRESA_ID },
      { id: 'inst-new', curso_id: 'curso-1' }
    );

    const resultado = await catalogoCursoService.criarInstancia({
      empresa_id: EMPRESA_ID,
      curso_id: 'curso-1',
      instrutor_id: null,
      data_inicio: '2026-01-10T09:00:00.000Z',
      local_link: null,
      capacidade_maxima: 12,
    });

    expect(resultado).toEqual({ id: 'inst-new', curso_id: 'curso-1' });
    expect(mockFrom).toHaveBeenCalledWith('catalogo_cursos');
    expect(eqCurso).toHaveBeenCalledWith('id', 'curso-1');
    expect(mockFrom).toHaveBeenCalledWith('treinamento_instancias');

    const payload = insertFn.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('empresa_id');
    expect(payload).toMatchObject({ curso_id: 'curso-1', capacidade_maxima: 12 });
  });

  it('funciona sem empresa_id (payload real do NovaTurmaDialog)', async () => {
    const { insertFn } = setupCriacao(
      { id: 'curso-1', empresa_id: EMPRESA_ID },
      { id: 'inst-2', curso_id: 'curso-1' }
    );

    await catalogoCursoService.criarInstancia({
      curso_id: 'curso-1',
      instrutor_id: null,
      data_inicio: '2026-02-01T09:00:00.000Z',
      local_link: 'Sala 3',
      capacidade_maxima: null,
    });

    expect(insertFn).toHaveBeenCalledWith({
      curso_id: 'curso-1',
      instrutor_id: null,
      data_inicio: '2026-02-01T09:00:00.000Z',
      local_link: 'Sala 3',
      capacidade_maxima: null,
    });
  });

  it('recusa curso de outra empresa sem tentar inserir', async () => {
    const { insertFn } = setupCriacao({ id: 'curso-1', empresa_id: 'outra-empresa' }, null);

    await expect(
      catalogoCursoService.criarInstancia({ empresa_id: EMPRESA_ID, curso_id: 'curso-1' })
    ).rejects.toThrow(/não pertence à empresa/);
    expect(insertFn).not.toHaveBeenCalled();
  });

  it('recusa curso invisível (não existe ou é de outro tenant)', async () => {
    const { insertFn } = setupCriacao(null, null);

    await expect(catalogoCursoService.criarInstancia({ curso_id: 'curso-x' })).rejects.toThrow(
      /não encontrado/
    );
    expect(insertFn).not.toHaveBeenCalled();
  });

  it('exige curso_id antes de consultar', async () => {
    await expect(catalogoCursoService.criarInstancia({})).rejects.toThrow(/curso_id obrigatório/);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('propaga erro do INSERT', async () => {
    setupCriacao({ id: 'curso-1', empresa_id: EMPRESA_ID }, null, { message: 'fk_pai' });
    await expect(catalogoCursoService.criarInstancia({ curso_id: 'curso-1' })).rejects.toBeDefined();
  });
});

describe('catalogoCursoService.atualizarInstancia (escopo via curso)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupAtualizacao(atual: any, atualizada: any = { id: 'inst-1' }) {
    const maybeSingleLeitura = vi.fn().mockResolvedValue({ data: atual, error: null });
    const eqLeitura = vi.fn();
    const chainLeitura = { eq: eqLeitura, maybeSingle: maybeSingleLeitura };
    eqLeitura.mockReturnValue(chainLeitura);
    const selectFn = vi.fn().mockReturnValue(chainLeitura);

    const maybeSingleUpdate = vi.fn().mockResolvedValue({ data: atualizada, error: null });
    const eqUpdate = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ maybeSingle: maybeSingleUpdate }),
    });
    const updateFn = vi.fn().mockReturnValue({ eq: eqUpdate });

    let chamada = 0;
    mockFrom.mockImplementation(() => {
      chamada += 1;
      return chamada === 1 ? { select: selectFn } : { update: updateFn };
    });
    return { selectFn, eqLeitura, updateFn, eqUpdate };
  }

  it('valida o tenant pelo curso embutido e nunca por empresa_id direto', async () => {
    const { selectFn, eqLeitura, updateFn } = setupAtualizacao({
      id: 'inst-1',
      curso: { empresa_id: EMPRESA_ID },
    });

    await catalogoCursoService.atualizarInstancia('inst-1', { status: 'concluido' }, EMPRESA_ID);

    const select = selectFn.mock.calls[0][0] as string;
    expect(select).toContain('curso:catalogo_cursos');
    expect(select).toContain('!inner');
    expect(eqLeitura).toHaveBeenCalledWith('id', 'inst-1');
    expect(eqLeitura).toHaveBeenCalledWith('curso.empresa_id', EMPRESA_ID);
    expect(eqLeitura).not.toHaveBeenCalledWith('empresa_id', EMPRESA_ID);
    expect(updateFn).toHaveBeenCalledWith({ status: 'concluido' });
  });

  it('não grava quando a turma não é da empresa', async () => {
    const { updateFn } = setupAtualizacao(null);

    await expect(
      catalogoCursoService.atualizarInstancia('inst-9', { status: 'cancelado' }, EMPRESA_ID)
    ).rejects.toThrow(/não encontrada/);
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('remove empresa_id de um payload indevido', async () => {
    const { updateFn } = setupAtualizacao({ id: 'inst-1', curso: { empresa_id: EMPRESA_ID } });

    await catalogoCursoService.atualizarInstancia(
      'inst-1',
      { status: 'em_curso', empresa_id: 'outra-empresa' },
      EMPRESA_ID
    );

    expect(updateFn).toHaveBeenCalledWith({ status: 'em_curso' });
  });

  it('exige empresa antes de consultar', async () => {
    await expect(catalogoCursoService.atualizarInstancia('inst-1', {}, '')).rejects.toThrow(
      /empresa_id obrigatório/
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
