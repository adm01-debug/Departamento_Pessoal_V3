import { describe, it, expect, vi, beforeEach } from 'vitest';
import { catalogoCursoService } from '../catalogoCursoService';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
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
  const eqFn = vi.fn().mockReturnValue({ select: selectFn });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn, selectFn, maybeSingle };
}

function setupDeleteChain(error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ error });
  const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ delete: deleteFn });
  return { deleteFn, eqFn };
}

// ─── Cursos ───────────────────────────────────────────────────────────────────

describe('catalogoCursoService.listarCursos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns cursos without empresa filter', async () => {
    const records = [{ id: 'c1', nome: 'Excel Avançado' }];
    setupListChain(records);
    expect(await catalogoCursoService.listarCursos()).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    expect(await catalogoCursoService.listarCursos()).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await catalogoCursoService.listarCursos('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('orders by nome', async () => {
    const { chain } = setupListChain([]);
    await catalogoCursoService.listarCursos();
    expect(chain.order).toHaveBeenCalledWith('nome');
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(catalogoCursoService.listarCursos()).rejects.toBeDefined();
  });
});

describe('catalogoCursoService.criarCurso', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new curso', async () => {
    const created = { id: 'c-new', nome: 'Python' };
    const { insertFn } = setupInsertChain(created);
    const result = await catalogoCursoService.criarCurso({ nome: 'Python' });
    expect(insertFn).toHaveBeenCalledWith({ nome: 'Python' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(catalogoCursoService.criarCurso({})).rejects.toThrow();
  });
});

describe('catalogoCursoService.atualizarCurso', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns curso', async () => {
    const updated = { id: 'c1', carga_horaria: 20 };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await catalogoCursoService.atualizarCurso('c1', { carga_horaria: 20 });
    expect(updateFn).toHaveBeenCalledWith({ carga_horaria: 20 });
    expect(eqFn).toHaveBeenCalledWith('id', 'c1');
    expect(result).toEqual(updated);
  });

  it('throws when data is null', async () => {
    setupUpdateChain(null);
    await expect(catalogoCursoService.atualizarCurso('c1', {})).rejects.toThrow();
  });
});

describe('catalogoCursoService.excluirCurso', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes curso by id', async () => {
    const { eqFn } = setupDeleteChain();
    await catalogoCursoService.excluirCurso('c1');
    expect(eqFn).toHaveBeenCalledWith('id', 'c1');
  });
});

// ─── Trilhas ──────────────────────────────────────────────────────────────────

describe('catalogoCursoService.listarTrilhas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns trilhas without empresa filter', async () => {
    const records = [{ id: 't1', titulo: 'Trilha Dev' }];
    setupListChain(records);
    expect(await catalogoCursoService.listarTrilhas()).toEqual(records);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await catalogoCursoService.listarTrilhas('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('orders by titulo', async () => {
    const { chain } = setupListChain([]);
    await catalogoCursoService.listarTrilhas();
    expect(chain.order).toHaveBeenCalledWith('titulo');
  });
});

describe('catalogoCursoService.criarTrilha', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new trilha', async () => {
    const created = { id: 't-new', titulo: 'Liderança' };
    const { insertFn } = setupInsertChain(created);
    const result = await catalogoCursoService.criarTrilha({ titulo: 'Liderança' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(catalogoCursoService.criarTrilha({})).rejects.toThrow();
  });
});

describe('catalogoCursoService.excluirTrilha', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes trilha by id', async () => {
    const { eqFn } = setupDeleteChain();
    await catalogoCursoService.excluirTrilha('t1');
    expect(eqFn).toHaveBeenCalledWith('id', 't1');
  });
});

// ─── Inscrições ───────────────────────────────────────────────────────────────

describe('catalogoCursoService.listarInscricoes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns inscricoes without filters', async () => {
    const records = [{ id: 'i1' }];
    setupListChain(records);
    expect(await catalogoCursoService.listarInscricoes()).toEqual(records);
  });

  it('filters by curso_id when provided', async () => {
    const { chain } = setupListChain([]);
    await catalogoCursoService.listarInscricoes('c1');
    expect(chain.eq).toHaveBeenCalledWith('curso_id', 'c1');
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await catalogoCursoService.listarInscricoes(undefined, 'emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('includes colaborador and curso joins', async () => {
    const { selectFn } = setupListChain([]);
    await catalogoCursoService.listarInscricoes();
    expect(selectFn).toHaveBeenCalledWith(
      expect.stringContaining('colaborador:colaboradores')
    );
    expect(selectFn).toHaveBeenCalledWith(
      expect.stringContaining('curso:catalogo_cursos')
    );
  });
});

describe('catalogoCursoService.criarInscricao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns new inscricao', async () => {
    const created = { id: 'i-new', curso_id: 'c1' };
    const { insertFn } = setupInsertChain(created);
    const result = await catalogoCursoService.criarInscricao({ curso_id: 'c1' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    setupInsertChain(null);
    await expect(catalogoCursoService.criarInscricao({})).rejects.toThrow();
  });
});

describe('catalogoCursoService.atualizarInscricao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates and returns inscricao', async () => {
    const updated = { id: 'i1', status: 'concluida' };
    const { updateFn, eqFn } = setupUpdateChain(updated);
    const result = await catalogoCursoService.atualizarInscricao('i1', { status: 'concluida' });
    expect(updateFn).toHaveBeenCalledWith({ status: 'concluida' });
    expect(eqFn).toHaveBeenCalledWith('id', 'i1');
    expect(result).toEqual(updated);
  });
});

// ─── Trilhas-Cursos (vinculação) ──────────────────────────────────────────────

describe('catalogoCursoService.listarTrilhasCursos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns vinculo', async () => {
    const created = { id: 'v-new' };
    const { insertFn } = setupInsertChain(created);
    const result = await catalogoCursoService.vincularCursoTrilha({ trilha_id: 't1', curso_id: 'c1' });
    expect(insertFn).toHaveBeenCalledWith({ trilha_id: 't1', curso_id: 'c1' });
    expect(result).toEqual(created);
  });
});

describe('catalogoCursoService.desvincularCursoTrilha', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes vinculo by id', async () => {
    const { eqFn } = setupDeleteChain();
    await catalogoCursoService.desvincularCursoTrilha('v1');
    expect(eqFn).toHaveBeenCalledWith('id', 'v1');
  });
});

// ─── Feedback e Certificados ──────────────────────────────────────────────────

describe('catalogoCursoService.registrarFeedback', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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

describe('catalogoCursoService.listarCertificados', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns certificados without filters', async () => {
    // listarCertificados: select → optional eq×2 → order → await
    const orderFn = vi.fn().mockResolvedValue({ data: [{ id: 'cert1' }], error: null });
    const eqFn = vi.fn().mockReturnValue({ order: orderFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn, order: orderFn });
    mockFrom.mockReturnValue({ select: selectFn });

    const result = await catalogoCursoService.listarCertificados();
    expect(result).toEqual([{ id: 'cert1' }]);
  });
});
