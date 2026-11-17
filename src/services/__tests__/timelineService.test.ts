import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import {
  listarHistoricoCargoTimeline,
  listarPromocoesTimeline,
  listarTransferenciasTimeline,
  listarAfastamentosTimeline,
  listarDesligamentoTimeline,
} from '../timelineService';

const EMPRESA_ID = 'test-empresa-id';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => deepChain(mockFrom(...a)) },
}));

type PostgrestResult = { data: unknown[] | null; error: { message: string } | null };

/** Chain thenable mínimo de PostgREST: `.select().eq().eq().order()` resolve no mesmo objeto. */
interface ListChain extends PromiseLike<PostgrestResult> {
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
}

function setupListChain(data: unknown[], error: { message: string } | null = null) {
  const response: PostgrestResult = { data, error };
  const chain = {
    eq: vi.fn(),
    order: vi.fn(),
    then: (fn: (r: PostgrestResult) => unknown) => Promise.resolve(response).then(fn),
  } as unknown as ListChain;
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  const selectFn = vi.fn().mockReturnValue(chain);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, chain };
}

describe('listarHistoricoCargoTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries historico_cargo by colaborador_id only, ordered by data_alteracao', async () => {
    const { chain } = setupListChain([]);
    await listarHistoricoCargoTimeline('col-1');
    expect(mockFrom).toHaveBeenCalledWith('historico_cargo');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
    expect(chain.order).toHaveBeenCalledWith('data_alteracao', { ascending: false });
    expect(chain.eq).not.toHaveBeenCalledWith('empresa_id', expect.anything());
  });

  it('propaga o erro do PostgREST em vez de devolver lista vazia', async () => {
    setupListChain([], { message: 'permission denied' });
    await expect(listarHistoricoCargoTimeline('col-1')).rejects.toMatchObject({ message: 'permission denied' });
  });

  it('devolve [] quando data vem nulo', async () => {
    const response: PostgrestResult = { data: null, error: null };
    const chain = {
      eq: vi.fn(),
      order: vi.fn(),
      then: (fn: (r: PostgrestResult) => unknown) => Promise.resolve(response).then(fn),
    } as unknown as ListChain;
    chain.eq.mockReturnValue(chain);
    chain.order.mockReturnValue(chain);
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) });
    await expect(listarHistoricoCargoTimeline('col-1')).resolves.toEqual([]);
  });
});

describe('listarPromocoesTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries promocoes by colaborador_id only (no empresa_id column)', async () => {
    const { chain } = setupListChain([]);
    await listarPromocoesTimeline('col-1');
    expect(mockFrom).toHaveBeenCalledWith('promocoes');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
    expect(chain.eq).not.toHaveBeenCalledWith('empresa_id', expect.anything());
    expect(chain.order).toHaveBeenCalledWith('data_vigencia', { ascending: false });
  });
});

describe('listarTransferenciasTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries transferencias by colaborador_id only, ordered by data_vigencia', async () => {
    const { chain } = setupListChain([]);
    await listarTransferenciasTimeline('col-1');
    expect(mockFrom).toHaveBeenCalledWith('transferencias');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
    expect(chain.order).toHaveBeenCalledWith('data_vigencia', { ascending: false });
  });
});

describe('listarAfastamentosTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries afastamentos scoped by colaborador and empresa', async () => {
    const { chain } = setupListChain([]);
    await listarAfastamentosTimeline('col-1', EMPRESA_ID);
    expect(mockFrom).toHaveBeenCalledWith('afastamentos');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', EMPRESA_ID);
  });

  it('throws when empresaId is missing', async () => {
    await expect(listarAfastamentosTimeline('col-1', '')).rejects.toThrow('empresa_id obrigatório');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('listarDesligamentoTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries desligamentos scoped by colaborador and empresa', async () => {
    const { chain } = setupListChain([]);
    await listarDesligamentoTimeline('col-1', EMPRESA_ID);
    expect(mockFrom).toHaveBeenCalledWith('desligamentos');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', EMPRESA_ID);
  });

  it('throws when empresaId is missing', async () => {
    await expect(listarDesligamentoTimeline('col-1', '')).rejects.toThrow('empresa_id obrigatório');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
