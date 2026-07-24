import { describe, it, expect, vi, beforeEach } from 'vitest';
import { documentoService } from '../documentoService';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// Thenable chain for select → order → limit → (optional eq) → await
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

// ─── listarDocumentos ─────────────────────────────────────────────────────────

describe('documentoService.listarDocumentos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns documents without filters', async () => {
    const records = [{ id: 'd1', nome: 'Holerite Jan' }];
    setupListChain(records);
    const result = await documentoService.listarDocumentos();
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListChain(null as any);
    const result = await documentoService.listarDocumentos();
    expect(result).toEqual([]);
  });

  it('filters by empresa_id when provided', async () => {
    const { chain } = setupListChain([]);
    await documentoService.listarDocumentos(undefined, 'emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('filters by colaborador_id when provided', async () => {
    const { chain } = setupListChain([]);
    await documentoService.listarDocumentos('col-1');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-1');
  });

  it('applies both filters simultaneously', async () => {
    const { chain } = setupListChain([]);
    await documentoService.listarDocumentos('col-2', 'emp-2');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-2');
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-2');
  });

  it('orders by created_at descending', async () => {
    const { chain } = setupListChain([]);
    await documentoService.listarDocumentos();
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('limits to 500 records', async () => {
    const { chain } = setupListChain([]);
    await documentoService.listarDocumentos();
    expect(chain.limit).toHaveBeenCalledWith(500);
  });

  it('selects with colaborador join including id, nome_completo, cpf', async () => {
    const { selectFn } = setupListChain([]);
    await documentoService.listarDocumentos();
    expect(selectFn).toHaveBeenCalledWith(
      expect.stringContaining('colaborador:colaboradores')
    );
  });

  it('throws on DB error', async () => {
    setupListChain([], { message: 'fail' });
    await expect(documentoService.listarDocumentos()).rejects.toBeDefined();
  });
});

// ─── listar ───────────────────────────────────────────────────────────────────

describe('documentoService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns { data, total } delegating to listarDocumentos', async () => {
    const records = [{ id: 'd2' }, { id: 'd3' }];
    setupListChain(records);
    const result = await documentoService.listar({});
    expect(result.data).toEqual(records);
    expect(result.total).toBe(2);
  });

  it('passes colaborador_id from filters', async () => {
    const { chain } = setupListChain([]);
    await documentoService.listar({ filters: { colaborador_id: 'col-5' } });
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'col-5');
  });

  it('passes empresa_id from filters', async () => {
    const { chain } = setupListChain([]);
    await documentoService.listar({ filters: { empresa_id: 'emp-5' } });
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-5');
  });
});
