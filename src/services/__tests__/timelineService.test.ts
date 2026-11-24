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

describe('listarHistoricoCargoTimeline', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('queries historico_cargo by colaborador_id only, ordered by data_alteracao', async () => {
    const { chain } = setupListChain([]);
    await listarHistoricoCargoTimeline('col-1');
    expect(mockFrom).toHaveBeenCalledWith('historico_cargo');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
    expect(chain.order).toHaveBeenCalledWith('data_alteracao', { ascending: false });
    expect(chain.eq).not.toHaveBeenCalledWith('empresa_id', expect.anything());
  });
});

describe('listarPromocoesTimeline', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('queries promocoes by colaborador_id only (no empresa_id column)', async () => {
    const { chain } = setupListChain([]);
    await listarPromocoesTimeline('col-1');
    expect(mockFrom).toHaveBeenCalledWith('promocoes');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
  });
});

describe('listarTransferenciasTimeline', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('queries transferencias by colaborador_id only, ordered by data_vigencia', async () => {
    const { chain } = setupListChain([]);
    await listarTransferenciasTimeline('col-1');
    expect(mockFrom).toHaveBeenCalledWith('transferencias');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
    expect(chain.order).toHaveBeenCalledWith('data_vigencia', { ascending: false });
  });
});

describe('listarAfastamentosTimeline', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('queries afastamentos scoped by colaborador and empresa', async () => {
    const { chain } = setupListChain([]);
    await listarAfastamentosTimeline('col-1', EMPRESA_ID);
    expect(mockFrom).toHaveBeenCalledWith('afastamentos');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', EMPRESA_ID);
  });

  it('throws when empresaId is missing', async () => {
    await expect(listarAfastamentosTimeline('col-1', '')).rejects.toThrow('empresa_id obrigatório');
  });
});

describe('listarDesligamentoTimeline', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('queries desligamentos scoped by colaborador and empresa', async () => {
    const { chain } = setupListChain([]);
    await listarDesligamentoTimeline('col-1', EMPRESA_ID);
    expect(mockFrom).toHaveBeenCalledWith('desligamentos');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', EMPRESA_ID);
  });
});
