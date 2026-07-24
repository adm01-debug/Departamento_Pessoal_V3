import { describe, it, expect, vi, beforeEach } from 'vitest';
import { empresaService } from '../empresaService';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// Helper: build select → or → order → range chain for listar
function setupListarChain(data: any[], count: number, error: any = null) {
  const rangeFn = vi.fn().mockResolvedValue({ data, count, error });
  const orderFn = vi.fn().mockReturnValue({ range: rangeFn });
  const baseQuery: any = { order: orderFn };
  const orFn = vi.fn().mockReturnValue(baseQuery);
  Object.assign(baseQuery, { or: orFn });
  const selectFn = vi.fn().mockReturnValue(baseQuery);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, orFn, orderFn, rangeFn };
}

// ─── empresaService.listar ────────────────────────────────────────────────────

describe('empresaService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns data and total from supabase', async () => {
    const records = [{ id: 'e1', razao_social: 'Empresa A' }];
    setupListarChain(records, 1);
    const result = await empresaService.listar();
    expect(result.data).toEqual(records);
    expect(result.total).toBe(1);
  });

  it('returns empty data with total 0 when supabase returns null', async () => {
    setupListarChain(null as any, null as any);
    const result = await empresaService.listar();
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('adds or() filter when search is provided', async () => {
    const { orFn } = setupListarChain([], 0);
    await empresaService.listar({ search: 'Promo' });
    expect(orFn).toHaveBeenCalledWith(
      expect.stringContaining('ilike.%Promo%')
    );
  });

  it('search filter includes razao_social, nome_fantasia, and cnpj', async () => {
    const { orFn } = setupListarChain([], 0);
    await empresaService.listar({ search: 'test' });
    const orArg: string = (orFn as any).mock.calls[0][0];
    expect(orArg).toContain('razao_social.ilike');
    expect(orArg).toContain('nome_fantasia.ilike');
    expect(orArg).toContain('cnpj.ilike');
  });

  it('does NOT add or() filter when search is omitted', async () => {
    const { orFn } = setupListarChain([], 0);
    await empresaService.listar();
    expect(orFn).not.toHaveBeenCalled();
  });

  it('orders by razao_social ascending', async () => {
    const { orderFn } = setupListarChain([], 0);
    await empresaService.listar();
    expect(orderFn).toHaveBeenCalledWith('razao_social', { ascending: true });
  });

  it('calls range(0, 11) for first page with pageSize 12 (default)', async () => {
    const { rangeFn } = setupListarChain([], 0);
    await empresaService.listar({ page: 1 });
    expect(rangeFn).toHaveBeenCalledWith(0, 11);
  });

  it('calls range(12, 23) for page 2 with default pageSize 12', async () => {
    const { rangeFn } = setupListarChain([], 0);
    await empresaService.listar({ page: 2 });
    expect(rangeFn).toHaveBeenCalledWith(12, 23);
  });

  it('throws on DB error', async () => {
    setupListarChain([], 0, { message: 'DB fail' });
    await expect(empresaService.listar()).rejects.toBeDefined();
  });

  it('selects with count:exact', async () => {
    const { selectFn } = setupListarChain([], 0);
    await empresaService.listar();
    expect(selectFn).toHaveBeenCalledWith('*', { count: 'exact' });
  });
});

// ─── empresaService.list (alias) ──────────────────────────────────────────────

describe('empresaService.list', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('delegates to listar and returns the same result', async () => {
    const records = [{ id: 'e2', razao_social: 'Empresa B' }];
    setupListarChain(records, 1);
    const result = await empresaService.list();
    expect(result.data).toEqual(records);
    expect(result.total).toBe(1);
  });
});
