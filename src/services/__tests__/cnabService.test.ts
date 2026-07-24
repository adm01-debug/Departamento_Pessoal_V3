import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cnabService } from '../cnabService';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

// select → eq → maybeSingle
function setupSelectEqMaybeSingle(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ maybeSingle });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, maybeSingle };
}

// select → eq → order → resolvedValue
function setupSelectEqOrder(data: any[], error: any = null) {
  const orderFn = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ order: orderFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, orderFn };
}

// update → eq → resolvedValue
function setupUpdateEq(error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ error });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ update: updateFn });
  return { updateFn, eqFn };
}

// insert → resolvedValue
function setupInsert(error: any = null) {
  const insertFn = vi.fn().mockResolvedValue({ error });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn };
}

// ─── getConfig ────────────────────────────────────────────────────────────────

describe('cnabService.getConfig', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns config when found', async () => {
    const config = { banco_codigo: '001', agencia: '1234', conta: '00001', conta_digito: '5', convenio: 'CON001' };
    const { eqFn } = setupSelectEqMaybeSingle(config);
    const result = await cnabService.getConfig('emp-1');
    expect(result).toEqual(config);
    expect(eqFn).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('returns null when config not found', async () => {
    setupSelectEqMaybeSingle(null);
    expect(await cnabService.getConfig('emp-1')).toBeNull();
  });

  it('throws on DB error', async () => {
    setupSelectEqMaybeSingle(null, { message: 'fail' });
    await expect(cnabService.getConfig('emp-1')).rejects.toBeDefined();
  });
});

// ─── saveConfig ───────────────────────────────────────────────────────────────

describe('cnabService.saveConfig', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const config = { banco_codigo: '001', agencia: '1234', conta: '00001', conta_digito: '5', convenio: 'CON001' };

  it('calls UPDATE when existing config found', async () => {
    const existing = { id: 'cfg-1' };

    // First call: select.eq.maybeSingle → existing
    const maybeSingle1 = vi.fn().mockResolvedValue({ data: existing, error: null });
    const eq1 = vi.fn().mockReturnValue({ maybeSingle: maybeSingle1 });
    const select1 = vi.fn().mockReturnValue({ eq: eq1 });

    // Second call: update.eq → success
    const eq2 = vi.fn().mockResolvedValue({ error: null });
    const update2 = vi.fn().mockReturnValue({ eq: eq2 });

    mockFrom
      .mockReturnValueOnce({ select: select1 })
      .mockReturnValueOnce({ update: update2 });

    await cnabService.saveConfig('emp-1', config);
    expect(update2).toHaveBeenCalledWith(config);
    expect(eq2).toHaveBeenCalledWith('id', 'cfg-1');
  });

  it('calls INSERT when no existing config', async () => {
    // First call: select.eq.maybeSingle → null (no existing)
    const maybeSingle1 = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq1 = vi.fn().mockReturnValue({ maybeSingle: maybeSingle1 });
    const select1 = vi.fn().mockReturnValue({ eq: eq1 });

    // Second call: insert → success
    const insertFn = vi.fn().mockResolvedValue({ error: null });
    mockFrom
      .mockReturnValueOnce({ select: select1 })
      .mockReturnValueOnce({ insert: insertFn });

    await cnabService.saveConfig('emp-1', config);
    expect(insertFn).toHaveBeenCalledWith([expect.objectContaining({ empresa_id: 'emp-1', ...config })]);
  });

  it('throws when update fails', async () => {
    const existing = { id: 'cfg-1' };
    const maybeSingle1 = vi.fn().mockResolvedValue({ data: existing, error: null });
    const eq1 = vi.fn().mockReturnValue({ maybeSingle: maybeSingle1 });
    const select1 = vi.fn().mockReturnValue({ eq: eq1 });

    const eq2 = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
    const update2 = vi.fn().mockReturnValue({ eq: eq2 });
    mockFrom
      .mockReturnValueOnce({ select: select1 })
      .mockReturnValueOnce({ update: update2 });

    await expect(cnabService.saveConfig('emp-1', config)).rejects.toBeDefined();
  });
});

// ─── listRemessas ─────────────────────────────────────────────────────────────

describe('cnabService.listRemessas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns remessas ordered by created_at desc', async () => {
    const records = [{ id: 'r1', status: 'enviado', valor_total: 5000 }];
    const { orderFn } = setupSelectEqOrder(records);
    const result = await cnabService.listRemessas('emp-1');
    expect(result).toEqual(records);
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns empty array when data is null', async () => {
    setupSelectEqOrder(null as any);
    expect(await cnabService.listRemessas('emp-1')).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupSelectEqOrder([], { message: 'fail' });
    await expect(cnabService.listRemessas('emp-1')).rejects.toBeDefined();
  });
});

// ─── listPixLotes ─────────────────────────────────────────────────────────────

describe('cnabService.listPixLotes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns PIX lotes ordered by created_at desc', async () => {
    const records = [{ id: 'pl1', status: 'gerado' }];
    const { orderFn } = setupSelectEqOrder(records);
    const result = await cnabService.listPixLotes('emp-1');
    expect(result).toEqual(records);
    expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns empty array when data is null', async () => {
    setupSelectEqOrder(null as any);
    expect(await cnabService.listPixLotes('emp-1')).toEqual([]);
  });
});

// ─── parseRetornoCNAB ─────────────────────────────────────────────────────────

describe('cnabService.parseRetornoCNAB', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  function makeSegmentALine(seuNumero: string, ocorrencia: string): string {
    // CNAB 240: tipoRegistro at index 7, segmento at index 13, seuNumero at 73-93, ocorrencia at 230-232
    const line = ' '.repeat(240);
    const chars = line.split('');
    chars[7] = '3';       // tipoRegistro === '3'
    chars[13] = 'A';      // segmento === 'A'
    // seuNumero: positions 73-92 (20 chars)
    const numPadded = seuNumero.padEnd(20, ' ');
    for (let i = 0; i < 20; i++) chars[73 + i] = numPadded[i];
    // ocorrencia: positions 230-231 (2 chars)
    chars[230] = ocorrencia[0];
    chars[231] = ocorrencia[1];
    return chars.join('');
  }

  it('ignores lines shorter than 240 chars', async () => {
    const result = await cnabService.parseRetornoCNAB('short line\n');
    expect(result).toEqual({ sucesso: 0, erro: 0, detalhes: [] });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('processes success ocorrencia 00 and counts sucesso', async () => {
    const line = makeSegmentALine('SEU001', '00');
    const item = { id: 'item-1', folha_item_id: 'fi-1', nome_favorecido: 'João' };

    // cnab_itens select.eq.maybeSingle
    const maybeSingle = vi.fn().mockResolvedValue({ data: item, error: null });
    const eqCnab = vi.fn().mockReturnValue({ maybeSingle });
    const selectCnab = vi.fn().mockReturnValue({ eq: eqCnab });

    // cnab_itens update.eq
    const eqUpdate1 = vi.fn().mockResolvedValue({ error: null });
    const updateCnab = vi.fn().mockReturnValue({ eq: eqUpdate1 });

    // folha_itens update.eq
    const eqUpdate2 = vi.fn().mockResolvedValue({ error: null });
    const updateFolha = vi.fn().mockReturnValue({ eq: eqUpdate2 });

    mockFrom
      .mockReturnValueOnce({ select: selectCnab })
      .mockReturnValueOnce({ update: updateCnab })
      .mockReturnValueOnce({ update: updateFolha });

    const result = await cnabService.parseRetornoCNAB(line);
    expect(result.sucesso).toBe(1);
    expect(result.erro).toBe(0);
    expect(result.detalhes[0]).toEqual(expect.objectContaining({
      nome: 'João',
      status: 'pago',
      ocorrencia: '00',
    }));
  });

  it('processes error ocorrencia and counts erro', async () => {
    const line = makeSegmentALine('SEU002', '99');
    const item = { id: 'item-2', folha_item_id: null, nome_favorecido: 'Maria' };

    const maybeSingle = vi.fn().mockResolvedValue({ data: item, error: null });
    const eqCnab = vi.fn().mockReturnValue({ maybeSingle });
    const selectCnab = vi.fn().mockReturnValue({ eq: eqCnab });

    const eqUpdate1 = vi.fn().mockResolvedValue({ error: null });
    const updateCnab = vi.fn().mockReturnValue({ eq: eqUpdate1 });

    mockFrom
      .mockReturnValueOnce({ select: selectCnab })
      .mockReturnValueOnce({ update: updateCnab });

    const result = await cnabService.parseRetornoCNAB(line);
    expect(result.erro).toBe(1);
    expect(result.sucesso).toBe(0);
    expect(result.detalhes[0].status).toBe('erro');
  });

  it('skips segment A lines where item is not found in DB', async () => {
    const line = makeSegmentALine('NOTFOUND', '00');

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqCnab = vi.fn().mockReturnValue({ maybeSingle });
    const selectCnab = vi.fn().mockReturnValue({ eq: eqCnab });
    mockFrom.mockReturnValueOnce({ select: selectCnab });

    const result = await cnabService.parseRetornoCNAB(line);
    expect(result.sucesso).toBe(0);
    expect(result.erro).toBe(0);
    expect(result.detalhes).toHaveLength(0);
  });
});
