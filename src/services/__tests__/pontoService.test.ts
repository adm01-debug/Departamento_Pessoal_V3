import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pontoService } from '../pontoService';

// ─── shared mock setup ────────────────────────────────────────────────────────

const { mockFrom, mockFunctionsInvoke } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockFunctionsInvoke: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    functions: { invoke: mockFunctionsInvoke },
  },
}));

vi.mock('./pontoMonitorService', () => ({
  pontoMonitorService: { trackGeofenceFailure: vi.fn() },
}));

vi.mock('../pontoMonitorService', () => ({
  pontoMonitorService: { trackGeofenceFailure: vi.fn() },
}));

vi.mock('date-fns', () => ({
  format: vi.fn((d: Date, fmt: string) => {
    if (fmt === 'yyyy-MM-dd') return '2026-07-24';
    if (fmt === 'HH:mm') return '08:00';
    return '';
  }),
}));

vi.mock('@/utils/dateLocal', () => ({
  formatDateLocalISO: (d: Date) => d.toISOString().slice(0, 10),
}));

vi.mock('crypto-js', () => ({
  default: { SHA256: vi.fn(() => ({ toString: () => 'mock-hash-abc123' })) },
}));

// ─── getSettings ──────────────────────────────────────────────────────────────

describe('pontoService.getSettings', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns settings for empresa', async () => {
    const settings = { empresa_id: 'emp-1', exige_geolocalizacao: false };
    const maybeSingle = vi.fn().mockResolvedValue({ data: settings, error: null });
    const eqFn = vi.fn().mockReturnValue({ maybeSingle });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ select: selectFn });

    const result = await pontoService.getSettings('emp-1');
    expect(result).toEqual(settings);
    expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('returns null when no settings found', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqFn = vi.fn().mockReturnValue({ maybeSingle });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ select: selectFn });

    const result = await pontoService.getSettings('emp-1');
    expect(result).toBeNull();
  });

  it('throws on DB error', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
    const eqFn = vi.fn().mockReturnValue({ maybeSingle });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    mockFrom.mockReturnValue({ select: selectFn });

    await expect(pontoService.getSettings('emp-1')).rejects.toBeDefined();
  });
});

// ─── buscarRegistroHoje ───────────────────────────────────────────────────────

describe('pontoService.buscarRegistroHoje', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  function setupBatidaChain(data: any[], error: any = null) {
    const orderFn = vi.fn().mockResolvedValue({ data, error });
    const baseQuery: any = {};
    const eqFn = vi.fn().mockReturnValue(baseQuery);
    Object.assign(baseQuery, { eq: eqFn, order: orderFn });
    const selectFn = vi.fn().mockReturnValue(baseQuery);
    mockFrom.mockReturnValue({ select: selectFn });
    return { selectFn, eqFn, orderFn };
  }

  it('returns batidas for today', async () => {
    const batidas = [{ id: 'b1', hora: '08:00', tipo: 'entrada' }];
    setupBatidaChain(batidas);
    const result = await pontoService.buscarRegistroHoje('c1');
    expect(result).toEqual(batidas);
  });

  it('returns empty array when no records', async () => {
    setupBatidaChain(null as any);
    const result = await pontoService.buscarRegistroHoje('c1');
    expect(result).toEqual([]);
  });

  it('filters by colaborador_id', async () => {
    const { eqFn } = setupBatidaChain([]);
    await pontoService.buscarRegistroHoje('colab-42');
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'colab-42');
  });

  it('orders by ordem ascending', async () => {
    const { orderFn } = setupBatidaChain([]);
    await pontoService.buscarRegistroHoje('c1');
    expect(orderFn).toHaveBeenCalledWith('ordem', { ascending: true });
  });

  it('throws on DB error', async () => {
    setupBatidaChain([], { message: 'fail' });
    await expect(pontoService.buscarRegistroHoje('c1')).rejects.toBeDefined();
  });
});

// ─── buscarRegistrosSemana ────────────────────────────────────────────────────

describe('pontoService.buscarRegistrosSemana', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  function setupSemanaChain(data: any[], error: any = null) {
    const orderFn = vi.fn().mockResolvedValue({ data, error });
    const baseQuery: any = {};
    const eqFn = vi.fn().mockReturnValue(baseQuery);
    const gteFn = vi.fn().mockReturnValue(baseQuery);
    Object.assign(baseQuery, { eq: eqFn, gte: gteFn, order: orderFn });
    const selectFn = vi.fn().mockReturnValue(baseQuery);
    mockFrom.mockReturnValue({ select: selectFn });
    return { selectFn, eqFn, gteFn, orderFn };
  }

  it('returns records for the past week', async () => {
    const records = [{ id: 'r1', data: '2026-07-18' }];
    setupSemanaChain(records);
    const result = await pontoService.buscarRegistrosSemana('c1');
    expect(result).toEqual(records);
  });

  it('returns empty array when no records', async () => {
    setupSemanaChain(null as any);
    const result = await pontoService.buscarRegistrosSemana('c1');
    expect(result).toEqual([]);
  });

  it('filters by colaborador_id', async () => {
    const { eqFn } = setupSemanaChain([]);
    await pontoService.buscarRegistrosSemana('colab-5');
    expect(eqFn).toHaveBeenCalledWith('colaborador_id', 'colab-5');
  });

  it('applies gte filter for 7 days ago', async () => {
    const { gteFn } = setupSemanaChain([]);
    await pontoService.buscarRegistrosSemana('c1');
    expect(gteFn).toHaveBeenCalledWith('data', expect.any(String));
  });

  it('orders by data descending', async () => {
    const { orderFn } = setupSemanaChain([]);
    await pontoService.buscarRegistrosSemana('c1');
    expect(orderFn).toHaveBeenCalledWith('data', { ascending: false });
  });

  it('throws on DB error', async () => {
    setupSemanaChain([], { message: 'fail' });
    await expect(pontoService.buscarRegistrosSemana('c1')).rejects.toBeDefined();
  });
});

// ─── registrar ────────────────────────────────────────────────────────────────

describe('pontoService.registrar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('throws immediately when colaboradorId is empty', async () => {
    await expect(pontoService.registrar('entrada', '')).rejects.toThrow(
      'Colaborador é obrigatório'
    );
  });

  it('throws when a duplicate ponto record exists', async () => {
    // First call: duplicate check returns a record
    const dupMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'dup-1' }, error: null });
    const dupQuery: any = {};
    const dupEqFn = vi.fn().mockReturnValue(dupQuery);
    Object.assign(dupQuery, { eq: dupEqFn, maybeSingle: dupMaybeSingle });
    const selectFn = vi.fn().mockReturnValue(dupQuery);
    mockFrom.mockReturnValueOnce({ select: selectFn });

    await expect(pontoService.registrar('entrada', 'c1')).rejects.toThrow(
      'Já existe um registro idêntico'
    );
  });

  it('throws when colaborador is not found', async () => {
    // Call 1: no duplicate (null)
    const noDupMaybe = vi.fn().mockResolvedValue({ data: null, error: null });
    const noDupQuery: any = {};
    const noDupEq = vi.fn().mockReturnValue(noDupQuery);
    Object.assign(noDupQuery, { eq: noDupEq, maybeSingle: noDupMaybe });
    const selectDup = vi.fn().mockReturnValue(noDupQuery);
    mockFrom.mockReturnValueOnce({ select: selectDup });

    // Call 2: colaborador query returns null
    const colabMaybe = vi.fn().mockResolvedValue({ data: null, error: null });
    const colabQuery: any = {};
    const colabEq = vi.fn().mockReturnValue(colabQuery);
    Object.assign(colabQuery, { eq: colabEq, maybeSingle: colabMaybe });
    const selectColab = vi.fn().mockReturnValue(colabQuery);
    mockFrom.mockReturnValueOnce({ select: selectColab });

    await expect(pontoService.registrar('entrada', 'c1')).rejects.toThrow(
      'Colaborador não encontrado'
    );
  });
});

// ─── validarBiometria ─────────────────────────────────────────────────────────

describe('pontoService.validarBiometria', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls functions.invoke with correct payload', async () => {
    mockFunctionsInvoke.mockResolvedValue({ data: { valid: true }, error: null });
    await pontoService.validarBiometria('b1', 'c1', 'base64string==');
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('validar-biometria', {
      body: { batidaId: 'b1', colaboradorId: 'c1', fotoBase64: 'base64string==' },
    });
  });

  it('returns validation result', async () => {
    mockFunctionsInvoke.mockResolvedValue({ data: { valid: true, score: 0.95 }, error: null });
    const result = await pontoService.validarBiometria('b1', 'c1', 'img');
    expect(result).toEqual({ valid: true, score: 0.95 });
  });

  it('throws when function invocation returns an error', async () => {
    mockFunctionsInvoke.mockResolvedValue({ data: null, error: { message: 'func error' } });
    await expect(pontoService.validarBiometria('b1', 'c1', 'img')).rejects.toBeDefined();
  });
});
