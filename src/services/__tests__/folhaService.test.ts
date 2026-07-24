import { describe, it, expect, vi, beforeEach } from 'vitest';
import { folhaService } from '../folhaService';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// Helper: thenable chain for select → order → limit → (optional eq) → await
function setupListChain(data: any[], error: any = null) {
  const response = { data, error };
  const chain: any = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve(response).then(fn);
  chain.catch = (fn: any) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: any) => Promise.resolve(response).finally(fn);
  const selectFn = vi.fn().mockReturnValue(chain);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, chain };
}

// ─── folhaService.list ────────────────────────────────────────────────────────

describe('folhaService.list', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns folhas from supabase', async () => {
    const records = [{ id: 'f1', competencia: '2026-01' }];
    setupListChain(records);
    const result = await folhaService.list();
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await folhaService.list();
    expect(result).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await folhaService.list(undefined, 'emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('filters by competencia when provided', async () => {
    const { chain } = setupListChain([]);
    await folhaService.list('2026-01');
    expect(chain.eq).toHaveBeenCalledWith('competencia', '2026-01');
  });

  it('applies both filters simultaneously', async () => {
    const { chain } = setupListChain([]);
    await folhaService.list('2026-02', 'emp-2');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-2');
    expect(chain.eq).toHaveBeenCalledWith('competencia', '2026-02');
  });

  it('orders by competencia descending', async () => {
    const { chain } = setupListChain([]);
    await folhaService.list();
    expect(chain.order).toHaveBeenCalledWith('competencia', { ascending: false });
  });

  it('limits to 500 records', async () => {
    const { chain } = setupListChain([]);
    await folhaService.list();
    expect(chain.limit).toHaveBeenCalledWith(500);
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(folhaService.list()).rejects.toBeDefined();
  });
});

// ─── folhaService.listar ──────────────────────────────────────────────────────

describe('folhaService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns { data, total } delegating to list', async () => {
    const records = [{ id: 'f2', competencia: '2026-03' }];
    setupListChain(records);
    const result = await folhaService.listar({});
    expect(result.data).toEqual(records);
    expect(result.total).toBe(1);
  });

  it('passes competencia from options.search', async () => {
    const { chain } = setupListChain([]);
    await folhaService.listar({ search: '2026-04' });
    expect(chain.eq).toHaveBeenCalledWith('competencia', '2026-04');
  });

  it('passes competencia from options.filters.competencia', async () => {
    const { chain } = setupListChain([]);
    await folhaService.listar({ filters: { competencia: '2026-05' } });
    expect(chain.eq).toHaveBeenCalledWith('competencia', '2026-05');
  });

  it('passes empresa_id from options.filters.empresa_id', async () => {
    const { chain } = setupListChain([]);
    await folhaService.listar({ filters: { empresa_id: 'emp-3' } });
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-3');
  });
});

// ─── folhaService.listarFolhas ────────────────────────────────────────────────

describe('folhaService.listarFolhas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('is an alias for list() with same arguments', async () => {
    const records = [{ id: 'f3' }];
    setupListChain(records);
    const result = await folhaService.listarFolhas('2026-06', 'emp-4');
    expect(result).toEqual(records);
  });
});
