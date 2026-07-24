import { describe, it, expect, vi, beforeEach } from 'vitest';
import { afastamentoService } from '../afastamentoService';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/utils/dateLocal', () => ({
  formatDateLocalISO: (d: Date) => d.toISOString().slice(0, 10),
}));

// Helper: select → eq → order chain (order resolves directly, no range)
function setupListarChain(data: any[], count: number, error: any = null) {
  const orderFn = vi.fn().mockResolvedValue({ data, count, error });
  const baseQuery: any = { order: orderFn };
  const eqFn = vi.fn().mockReturnValue(baseQuery);
  Object.assign(baseQuery, { eq: eqFn });
  const selectFn = vi.fn().mockReturnValue(baseQuery);
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, orderFn };
}

// Helper: thenable chain for select → eq → (optional eq) → await
function setupThenabledChain(data: any[], error: any = null) {
  const response = { data, error };
  const chain: any = {};
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(response);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.then = (fn: any) => Promise.resolve(response).then(fn);
  chain.catch = (fn: any) => Promise.resolve(response).catch(fn);
  chain.finally = (fn: any) => Promise.resolve(response).finally(fn);
  const selectFn = vi.fn().mockReturnValue(chain);
  mockFrom.mockReturnValue({ select: selectFn });
  return { chain };
}

// ─── listar ───────────────────────────────────────────────────────────────────

describe('afastamentoService.listar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns data and total from supabase', async () => {
    const records = [{ id: 'af-1', status: 'ativo' }];
    setupListarChain(records, 1);
    const result = await afastamentoService.listar();
    expect(result.data).toEqual(records);
    expect(result.total).toBe(1);
  });

  it('returns empty data when supabase returns null', async () => {
    setupListarChain(null as any, null as any);
    const result = await afastamentoService.listar();
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('filters by empresa_id from options.empresaId', async () => {
    const { eqFn } = setupListarChain([], 0);
    await afastamentoService.listar({ empresaId: 'emp-1' } as any);
    expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('filters by empresa_id from options.filters.empresa_id', async () => {
    const { eqFn } = setupListarChain([], 0);
    await afastamentoService.listar({ filters: { empresa_id: 'emp-2' } });
    expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-2');
  });

  it('filters by status when provided in filters', async () => {
    const { eqFn } = setupListarChain([], 0);
    await afastamentoService.listar({ filters: { status: 'encerrado' } });
    expect(eqFn).toHaveBeenCalledWith('status', 'encerrado');
  });

  it('orders by data_inicio descending', async () => {
    const { orderFn } = setupListarChain([], 0);
    await afastamentoService.listar();
    expect(orderFn).toHaveBeenCalledWith('data_inicio', { ascending: false });
  });

  it('throws on DB error', async () => {
    setupListarChain([], 0, { message: 'fail' });
    await expect(afastamentoService.listar()).rejects.toBeDefined();
  });
});

// ─── listarHistoricoRecente ───────────────────────────────────────────────────

describe('afastamentoService.listarHistoricoRecente', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns records for given colaboradorId', async () => {
    const records = [{ id: 'af-2', colaborador_id: 'c1' }];
    const { chain } = setupThenabledChain(records);
    const result = await afastamentoService.listarHistoricoRecente('c1');
    expect(result).toEqual(records);
    expect(chain.eq).toHaveBeenCalledWith('colaborador_id', 'c1');
  });

  it('returns empty array when no records', async () => {
    setupThenabledChain(null as any);
    const result = await afastamentoService.listarHistoricoRecente('c1');
    expect(result).toEqual([]);
  });

  it('adds gte filter for data_inicio', async () => {
    const { chain } = setupThenabledChain([]);
    await afastamentoService.listarHistoricoRecente('c1', 30);
    expect(chain.gte).toHaveBeenCalledWith('data_inicio', expect.any(String));
  });

  it('throws on DB error', async () => {
    setupThenabledChain([], { message: 'fail' });
    await expect(afastamentoService.listarHistoricoRecente('c1')).rejects.toBeDefined();
  });
});

// ─── buscarCID ────────────────────────────────────────────────────────────────

describe('afastamentoService.buscarCID', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns CID results', async () => {
    const cids = [{ codigo: 'J00', descricao: 'Resfriado' }];
    const { chain } = setupThenabledChain(cids);
    // override limit to resolve directly
    chain.limit = vi.fn().mockResolvedValue({ data: cids, error: null });
    const result = await afastamentoService.buscarCID('J00');
    expect(result).toEqual(cids);
  });

  it('uses or() filter with code and description ilike', async () => {
    const { chain } = setupThenabledChain([]);
    chain.limit = vi.fn().mockResolvedValue({ data: [], error: null });
    await afastamentoService.buscarCID('tosse');
    expect(chain.or).toHaveBeenCalledWith(expect.stringContaining('ilike.%tosse%'));
  });

  it('limits results to 10', async () => {
    const { chain } = setupThenabledChain([]);
    chain.limit = vi.fn().mockResolvedValue({ data: [], error: null });
    await afastamentoService.buscarCID('abc');
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it('returns empty array when no results', async () => {
    const { chain } = setupThenabledChain(null as any);
    chain.limit = vi.fn().mockResolvedValue({ data: null, error: null });
    const result = await afastamentoService.buscarCID('xyz');
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    const { chain } = setupThenabledChain([]);
    chain.limit = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    await expect(afastamentoService.buscarCID('err')).rejects.toBeDefined();
  });
});

// ─── listarConfiguracoes ──────────────────────────────────────────────────────

describe('afastamentoService.listarConfiguracoes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns configuration records', async () => {
    const configs = [{ tipo: 'doenca', dias_empresa_maximo: 15 }];
    const orderFn = vi.fn().mockResolvedValue({ data: configs, error: null });
    const selectFn = vi.fn().mockReturnValue({ order: orderFn });
    mockFrom.mockReturnValue({ select: selectFn });

    const result = await afastamentoService.listarConfiguracoes();
    expect(result).toEqual(configs);
    expect(mockFrom).toHaveBeenCalledWith('config_afastamentos');
  });

  it('returns empty array when no configurations', async () => {
    const orderFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectFn = vi.fn().mockReturnValue({ order: orderFn });
    mockFrom.mockReturnValue({ select: selectFn });

    const result = await afastamentoService.listarConfiguracoes();
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    const orderFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const selectFn = vi.fn().mockReturnValue({ order: orderFn });
    mockFrom.mockReturnValue({ select: selectFn });

    await expect(afastamentoService.listarConfiguracoes()).rejects.toBeDefined();
  });
});

// ─── calcularDias (pure) ──────────────────────────────────────────────────────

describe('afastamentoService.calcularDias', () => {
  it('returns 1 for same start and end date', () => {
    expect(afastamentoService.calcularDias('2026-01-10', '2026-01-10')).toBe(1);
  });

  it('counts inclusive days correctly', () => {
    // Jan 10 to Jan 14 = 5 days (10,11,12,13,14)
    expect(afastamentoService.calcularDias('2026-01-10', '2026-01-14')).toBe(5);
  });

  it('returns 0 when inicio is missing', () => {
    expect(afastamentoService.calcularDias('', '2026-01-14')).toBe(0);
  });

  it('returns 0 when fim is missing', () => {
    expect(afastamentoService.calcularDias('2026-01-10', '')).toBe(0);
  });

  it('returns 0 for invalid dates', () => {
    expect(afastamentoService.calcularDias('not-a-date', '2026-01-10')).toBe(0);
  });

  it('returns 0 when end is before start', () => {
    expect(afastamentoService.calcularDias('2026-01-20', '2026-01-10')).toBe(0);
  });
});

// ─── calcularDistribuicaoDias (pure) ─────────────────────────────────────────

describe('afastamentoService.calcularDistribuicaoDias', () => {
  const configDoenca = [{ tipo: 'doenca', dias_empresa_maximo: 15 }];
  const configSemLimite = [{ tipo: 'licenca', dias_empresa_maximo: 0 }];

  it('all days go to empresa when total <= maxEmpresa', () => {
    const result = afastamentoService.calcularDistribuicaoDias(10, 'doenca', configDoenca);
    expect(result.empresa).toBe(10);
    expect(result.inss).toBe(0);
  });

  it('splits days when total > maxEmpresa', () => {
    const result = afastamentoService.calcularDistribuicaoDias(30, 'doenca', configDoenca);
    expect(result.empresa).toBe(15);
    expect(result.inss).toBe(15);
  });

  it('all days go to empresa when maxEmpresa = 0 (no INSS period)', () => {
    const result = afastamentoService.calcularDistribuicaoDias(20, 'licenca', configSemLimite);
    expect(result.empresa).toBe(20);
    expect(result.inss).toBe(0);
  });

  it('uses default 15-day limit for illness types when no config found', () => {
    const result = afastamentoService.calcularDistribuicaoDias(20, 'doenca', []);
    expect(result.empresa).toBe(15);
    expect(result.inss).toBe(5);
  });

  it('empresa=total, inss=0 when no config and tipo is not illness-related', () => {
    const result = afastamentoService.calcularDistribuicaoDias(30, 'licenca_maternidade', []);
    expect(result.empresa).toBe(30);
    expect(result.inss).toBe(0);
  });
});
