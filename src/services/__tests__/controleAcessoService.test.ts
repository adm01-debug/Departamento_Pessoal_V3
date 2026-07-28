import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import { makeChain } from '@/test/chain';
import { controleAcessoService } from '../controleAcessoService';

const EMPRESA_ID = 'test-empresa-id';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => deepChain(mockFrom(...a)) },
}));

// listar: select → order → [optional eq] → resolvedValue (thenable chain)
function setupListarChain(data: any[], error: any = null) {
  const chain: any = makeChain({ data, error });
  mockFrom.mockReturnValue(chain);
  return { selectFn: chain.select, orderFn: chain.order, chain };
}

describe('controleAcessoService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns all records without filter', async () => {
    const records = [{ id: 'ca1', colaborador: { nome_completo: 'João' } }];
    setupListarChain(records);
    const result = await controleAcessoService.listar(EMPRESA_ID);
    expect(result).toEqual(records);
  });

  it('returns empty array when data is null', async () => {
    setupListarChain(null as any);
    expect(await controleAcessoService.listar(EMPRESA_ID)).toEqual([]);
  });

  it('applies empresa_id filter when provided', async () => {
    const { chain } = setupListarChain([]);
    await controleAcessoService.listar('emp-1');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('throws on DB error', async () => {
    setupListarChain([], { message: 'fail' });
    await expect(controleAcessoService.listar(EMPRESA_ID)).rejects.toBeDefined();
  });
});

describe('controleAcessoService.registrar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts and returns record', async () => {
    const created = { id: 'ca-new', colaborador_id: 'c1', tipo: 'entrada' };
    const maybeSingle = vi.fn().mockResolvedValue({ data: created, error: null });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });

    const result = await controleAcessoService.registrar({ colaborador_id: 'c1', tipo: 'entrada' });
    expect(result).toEqual(created);
  });

  it('throws when data is null', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });
    await expect(controleAcessoService.registrar({})).rejects.toThrow('Nenhum registro de acesso foi retornado.');
  });

  it('throws on DB error', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const selectFn = vi.fn().mockReturnValue({ maybeSingle });
    const insertFn = vi.fn().mockReturnValue({ select: selectFn });
    mockFrom.mockReturnValue({ insert: insertFn });
    await expect(controleAcessoService.registrar({})).rejects.toBeDefined();
  });
});

describe('controleAcessoService.excluir', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes record by id', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ delete: deleteFn });

    await controleAcessoService.excluir('ca1', EMPRESA_ID);
    expect(eqFn).toHaveBeenCalledWith('id', 'ca1');
  });

  it('throws on DB error', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ delete: deleteFn });
    await expect(controleAcessoService.excluir('ca1', EMPRESA_ID)).rejects.toBeDefined();
  });
});
