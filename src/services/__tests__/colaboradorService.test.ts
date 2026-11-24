import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';
import { colaboradorService } from '../colaboradorService';

const EMP = 'emp-test';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom, mockLoggerError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockLoggerError: vi.fn(),
}));

// `supabase` e `supabaseBase` são o mesmo cliente em produção (ver
// src/integrations/supabase/client.ts) — o serviço usa `supabaseBase`
// diretamente (P0-CORS), então o mock precisa expor as duas chaves.
vi.mock('@/integrations/supabase/client', () => {
  const client = { from: (...a: unknown[]) => deepChain(mockFrom(...a)) };
  return { supabase: client, supabaseBase: client };
});

vi.mock('../loggerService', () => ({
  loggerService: { error: mockLoggerError },
}));

// Helper: build select → eq/or → order → range chain for listar
function setupListarChain(data: any[], count: number, error: any = null) {
  const rangeFn = vi.fn().mockResolvedValue({ data, count, error });
  const orderFn = vi.fn().mockReturnValue({ range: rangeFn });
  const baseQuery: any = { order: orderFn };
  const eqFn = vi.fn().mockReturnValue(baseQuery);
  const orFn = vi.fn().mockReturnValue(baseQuery);
  Object.assign(baseQuery, { eq: eqFn, or: orFn });
  const selectFn = vi.fn().mockReturnValue(baseQuery);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, orFn, orderFn, rangeFn };
}

// Helper: build a thenable count chain for getSummary
function makeCountChain(count: number, error: any = null) {
  const response = { count, error };
  const chain: any = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve(response).then(fn);
  chain.catch = (fn: any) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: any) => Promise.resolve(response).finally(fn);
  const selectFn = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(chain) });
  return { select: selectFn };
}

// ─── listar ───────────────────────────────────────────────────────────────────

describe('colaboradorService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns data and total from supabase', async () => {
    const records = [{ id: '1', nome_completo: 'Alice' }];
    setupListarChain(records, 1);
    const result = await colaboradorService.listar({ filters: { empresaId: EMP } });
    expect(result.data).toEqual(records);
    expect(result.total).toBe(1);
  });

  it('returns empty data with total 0 when supabase returns null', async () => {
    setupListarChain(null as any, null as any);
    const result = await colaboradorService.listar({ filters: { empresaId: EMP } });
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('adds or() filter when search is provided', async () => {
    const { orFn } = setupListarChain([], 0);
    await colaboradorService.listar({ search: 'Silva', filters: { empresaId: EMP } });
    expect(orFn).toHaveBeenCalledWith(
      expect.stringContaining('ilike.%Silva%')
    );
  });

  it('selects cargo and departamento columns explicitly', async () => {
    const { selectFn } = setupListarChain([], 0);
    await colaboradorService.listar({ filters: { empresaId: EMP } });
    const columns = selectFn.mock.calls[0][0] as string;
    expect(columns).toContain('cargo');
    expect(columns).toContain('departamento');
  });

  it('searches by matricula, cargo and departamento in addition to nome/email', async () => {
    const { orFn } = setupListarChain([], 0);
    await colaboradorService.listar({ search: 'Vendas', filters: { empresaId: EMP } });
    const orArg = orFn.mock.calls[0][0] as string;
    expect(orArg).toContain('matricula.ilike.%Vendas%');
    expect(orArg).toContain('cargo.ilike.%Vendas%');
    expect(orArg).toContain('departamento.ilike.%Vendas%');
    expect(orArg).toContain('nome_completo.ilike.%Vendas%');
    expect(orArg).toContain('email.ilike.%Vendas%');
  });

  it('normalizes a formatted CPF search (dots and dash) to digits only', async () => {
    const { orFn } = setupListarChain([], 0);
    await colaboradorService.listar({ search: '123.456.789-00', filters: { empresaId: EMP } });
    const orArg = orFn.mock.calls[0][0] as string;
    // A cláusula de cpf precisa usar só dígitos (coluna armazena CPF sem
    // pontuação); o traço pode aparecer nas cláusulas de outros campos
    // (nome/email/etc.), que usam a sanitização genérica — isso é esperado.
    expect(orArg).toContain('cpf.ilike.%12345678900%');
    expect(orArg).not.toContain('cpf.ilike.%123456789-00%');
  });

  it('does not add a cpf clause when the search has no digits', async () => {
    const { orFn } = setupListarChain([], 0);
    await colaboradorService.listar({ search: 'Maria', filters: { empresaId: EMP } });
    const orArg = orFn.mock.calls[0][0] as string;
    expect(orArg).not.toContain('cpf.ilike');
  });

  it('filters by empresa_id when provided', async () => {
    const { eqFn } = setupListarChain([], 0);
    await colaboradorService.listar({ filters: { empresaId: 'emp-1' } });
    expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('filters by status when not "all"', async () => {
    const { eqFn } = setupListarChain([], 0);
    await colaboradorService.listar({ filters: { empresaId: EMP, status: 'ativo' } });
    expect(eqFn).toHaveBeenCalledWith('status', 'ativo');
  });

  it('filters by status "pendente"', async () => {
    const { eqFn } = setupListarChain([], 0);
    await colaboradorService.listar({ filters: { empresaId: EMP, status: 'pendente' } });
    expect(eqFn).toHaveBeenCalledWith('status', 'pendente');
  });

  it('filters by status "desligado"', async () => {
    const { eqFn } = setupListarChain([], 0);
    await colaboradorService.listar({ filters: { empresaId: EMP, status: 'desligado' } });
    expect(eqFn).toHaveBeenCalledWith('status', 'desligado');
  });

  it('does NOT filter by status when status is "all"', async () => {
    const { eqFn } = setupListarChain([], 0);
    await colaboradorService.listar({ filters: { empresaId: EMP, status: 'all' } });
    expect(eqFn).not.toHaveBeenCalledWith('status', 'all');
  });

  it('calls range with correct offset for page 2 (default pageSize 25)', async () => {
    const { rangeFn } = setupListarChain([], 0);
    await colaboradorService.listar({ page: 2, pageSize: 25, filters: { empresaId: EMP } });
    expect(rangeFn).toHaveBeenCalledWith(25, 49);
  });

  it('calls range(0, 24) for first page with pageSize 25', async () => {
    const { rangeFn } = setupListarChain([], 0);
    await colaboradorService.listar({ page: 1, pageSize: 25, filters: { empresaId: EMP } });
    expect(rangeFn).toHaveBeenCalledWith(0, 24);
  });

  it('throws on DB error', async () => {
    setupListarChain([], 0, { message: 'DB fail' });
    await expect(colaboradorService.listar({ filters: { empresaId: EMP } })).rejects.toBeDefined();
  });

  it('orders by nome_completo ascending', async () => {
    const { orderFn } = setupListarChain([], 0);
    await colaboradorService.listar({ filters: { empresaId: EMP } });
    expect(orderFn).toHaveBeenCalledWith('nome_completo', { ascending: true });
  });
});

// ─── getSummary ───────────────────────────────────────────────────────────────

describe('colaboradorService.getSummary', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns total and per-status counts for the five real statuses', async () => {
    const counts = [5, 4, 2, 3, 1]; // ativo, pendente, desligado, ferias, afastado
    let callIdx = 0;
    mockFrom.mockImplementation(() => makeCountChain(counts[callIdx++]));

    const summary = await colaboradorService.getSummary(EMP);
    expect(summary.ativo).toBe(5);
    expect(summary.pendente).toBe(4);
    expect(summary.desligado).toBe(2);
    expect(summary.ferias).toBe(3);
    expect(summary.afastado).toBe(1);
    expect(summary.total).toBe(15);
  });

  it('does not create an artificial "inativo" key', async () => {
    const counts = [0, 0, 3, 0, 0]; // desligado=3
    let callIdx = 0;
    mockFrom.mockImplementation(() => makeCountChain(counts[callIdx++]));

    const summary = await colaboradorService.getSummary(EMP);
    expect(summary.desligado).toBe(3);
    expect(summary.inativo).toBeUndefined();
    expect('inativo' in summary).toBe(false);
  });

  it('returns 0 total when all counts are 0', async () => {
    mockFrom.mockImplementation(() => makeCountChain(0));
    const summary = await colaboradorService.getSummary(EMP);
    expect(summary.total).toBe(0);
  });

  it('applies empresa_id filter to all five status queries when provided', async () => {
    mockFrom.mockImplementation(() => makeCountChain(0));
    await colaboradorService.getSummary('emp-1');
    // Uma chain por status real (ativo, pendente, desligado, ferias, afastado)
    expect(mockFrom).toHaveBeenCalledTimes(5);
  });

  it('returns count 0 per status on DB error (graceful fallback)', async () => {
    mockFrom.mockImplementation(() => makeCountChain(0, { message: 'fail' }));
    const summary = await colaboradorService.getSummary(EMP);
    expect(summary.total).toBe(0);
    expect(summary.ativo).toBe(0);
  });
});

// ─── list (alias) ─────────────────────────────────────────────────────────────

describe('colaboradorService.list', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns array of colaboradores (delegates to listar)', async () => {
    const records = [{ id: 'c1', nome_completo: 'Bob' }];
    setupListarChain(records, 1);
    const result = await colaboradorService.list('emp-1');
    expect(result).toEqual(records);
  });

  it('uses pageSize 1000 to load all records', async () => {
    const { rangeFn } = setupListarChain([], 0);
    await colaboradorService.list('emp-1');
    // pageSize 1000 → range(0, 999)
    expect(rangeFn).toHaveBeenCalledWith(0, 999);
  });
});
