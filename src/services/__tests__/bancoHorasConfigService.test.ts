import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bancoHorasConfigService } from '../bancoHorasConfigService';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

function setupMaybeSingleChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ maybeSingle });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, maybeSingle };
}

function setupInsertChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, selectFn, maybeSingle };
}

function setupUpdateChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const eqFn = vi.fn().mockReturnValue({ select: selectFn });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn, selectFn, maybeSingle };
}

// ─── buscar ───────────────────────────────────────────────────────────────────

describe('bancoHorasConfigService.buscar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns config for empresa', async () => {
    const config = { id: 'bhc-1', empresa_id: 'emp-1', limite_horas: 40 };
    setupMaybeSingleChain(config);
    const result = await bancoHorasConfigService.buscar('emp-1');
    expect(result).toEqual(config);
    expect(mockFrom).toHaveBeenCalledWith('banco_horas_config');
  });

  it('returns null when no config exists', async () => {
    setupMaybeSingleChain(null);
    const result = await bancoHorasConfigService.buscar('emp-1');
    expect(result).toBeNull();
  });

  it('filters by empresa_id', async () => {
    const { eqFn } = setupMaybeSingleChain(null);
    await bancoHorasConfigService.buscar('emp-42');
    expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-42');
  });

  it('throws on DB error', async () => {
    setupMaybeSingleChain(null, { message: 'fail' });
    await expect(bancoHorasConfigService.buscar('emp-1')).rejects.toBeDefined();
  });
});

// ─── salvar (new) ─────────────────────────────────────────────────────────────

describe('bancoHorasConfigService.salvar (no existing config)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('inserts when no existing config found', async () => {
    const created = { id: 'bhc-new', empresa_id: 'emp-1' };
    // buscar returns null (no existing), then insert returns created
    const maybeSingleBuscar = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqBuscar = vi.fn().mockReturnValue({ maybeSingle: maybeSingleBuscar });
    const selectBuscar = vi.fn().mockReturnValue({ eq: eqBuscar });

    const maybeSingleInsert = vi.fn().mockResolvedValue({ data: created, error: null });
    const selectInsert = vi.fn().mockReturnValue({ maybeSingle: maybeSingleInsert });
    const insertFn = vi.fn().mockReturnValue({ select: selectInsert });

    mockFrom
      .mockReturnValueOnce({ select: selectBuscar })
      .mockReturnValueOnce({ insert: insertFn });

    const result = await bancoHorasConfigService.salvar({ empresa_id: 'emp-1' });
    expect(insertFn).toHaveBeenCalledWith({ empresa_id: 'emp-1' });
    expect(result).toEqual(created);
  });

  it('throws when insert returns null data', async () => {
    const maybeSingleBuscar = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqBuscar = vi.fn().mockReturnValue({ maybeSingle: maybeSingleBuscar });
    const selectBuscar = vi.fn().mockReturnValue({ eq: eqBuscar });

    const maybeSingleInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectInsert = vi.fn().mockReturnValue({ maybeSingle: maybeSingleInsert });
    const insertFn = vi.fn().mockReturnValue({ select: selectInsert });

    mockFrom
      .mockReturnValueOnce({ select: selectBuscar })
      .mockReturnValueOnce({ insert: insertFn });

    await expect(bancoHorasConfigService.salvar({ empresa_id: 'emp-1' })).rejects.toThrow();
  });
});

// ─── salvar (update) ──────────────────────────────────────────────────────────

describe('bancoHorasConfigService.salvar (existing config)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates when existing config found', async () => {
    const existing = { id: 'bhc-1', empresa_id: 'emp-1' };
    const updated = { id: 'bhc-1', empresa_id: 'emp-1', limite_horas: 60 };

    const maybeSingleBuscar = vi.fn().mockResolvedValue({ data: existing, error: null });
    const eqBuscar = vi.fn().mockReturnValue({ maybeSingle: maybeSingleBuscar });
    const selectBuscar = vi.fn().mockReturnValue({ eq: eqBuscar });

    const maybeSingleUpdate = vi.fn().mockResolvedValue({ data: updated, error: null });
    const selectUpdate = vi.fn().mockReturnValue({ maybeSingle: maybeSingleUpdate });
    const eqUpdate = vi.fn().mockReturnValue({ select: selectUpdate });
    const updateFn = vi.fn().mockReturnValue({ eq: eqUpdate });

    mockFrom
      .mockReturnValueOnce({ select: selectBuscar })
      .mockReturnValueOnce({ update: updateFn });

    const result = await bancoHorasConfigService.salvar({ empresa_id: 'emp-1', limite_horas: 60 });
    expect(updateFn).toHaveBeenCalledWith({ empresa_id: 'emp-1', limite_horas: 60 });
    expect(eqUpdate).toHaveBeenCalledWith('id', 'bhc-1');
    expect(result).toEqual(updated);
  });

  it('throws when update returns null data', async () => {
    const existing = { id: 'bhc-1', empresa_id: 'emp-1' };

    const maybeSingleBuscar = vi.fn().mockResolvedValue({ data: existing, error: null });
    const eqBuscar = vi.fn().mockReturnValue({ maybeSingle: maybeSingleBuscar });
    const selectBuscar = vi.fn().mockReturnValue({ eq: eqBuscar });

    const maybeSingleUpdate = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectUpdate = vi.fn().mockReturnValue({ maybeSingle: maybeSingleUpdate });
    const eqUpdate = vi.fn().mockReturnValue({ select: selectUpdate });
    const updateFn = vi.fn().mockReturnValue({ eq: eqUpdate });

    mockFrom
      .mockReturnValueOnce({ select: selectBuscar })
      .mockReturnValueOnce({ update: updateFn });

    await expect(bancoHorasConfigService.salvar({ empresa_id: 'emp-1' })).rejects.toThrow();
  });
});
