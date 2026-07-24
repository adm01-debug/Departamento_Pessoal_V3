import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pontoAbertoService } from '../pontoAbertoService';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

function setupChain(data: any[], error: any = null) {
  const response = { data, error };
  const chain: any = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve(response).then(fn);
  chain.catch = (fn: any) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: any) => Promise.resolve(response).finally(fn);
  const selectFn = vi.fn().mockReturnValue(chain);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, chain };
}

describe('pontoAbertoService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns pontos without filter', async () => {
    const records = [{ id: 'p1', colaborador_id: 'c1' }];
    setupChain(records);
    expect(await pontoAbertoService.listar()).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupChain(null as any);
    expect(await pontoAbertoService.listar()).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupChain([]);
    await pontoAbertoService.listar('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('throws on DB error', async () => {
    setupChain([], { message: 'fail' });
    await expect(pontoAbertoService.listar()).rejects.toBeDefined();
  });
});
