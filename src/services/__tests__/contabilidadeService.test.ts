import { describe, it, expect, vi, beforeEach } from 'vitest';
import { contabilidadeService } from '../contabilidadeService';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/utils/dateLocal', () => ({
  todayLocalISO: () => '2026-07-24',
}));

// select → eq → order → resolvedValue
function setupSelectEqOrder(data: any[], error: any = null) {
  const orderFn = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ order: orderFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn, orderFn };
}

// select → eq → resolvedValue (no order)
function setupSelectEq(data: any[], error: any = null) {
  const eqFn = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  mockFrom.mockReturnValue({ select: selectFn });
  return { selectFn, eqFn };
}

// ─── listLancamentos ──────────────────────────────────────────────────────────

describe('contabilidadeService.listLancamentos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns lancamentos ordered by data_lancamento desc', async () => {
    const records = [{ id: 'l1', valor: 5000 }];
    const { orderFn } = setupSelectEqOrder(records);
    const result = await contabilidadeService.listLancamentos('emp-1');
    expect(result).toEqual(records);
    expect(orderFn).toHaveBeenCalledWith('data_lancamento', { ascending: false });
  });

  it('returns empty array when data is null', async () => {
    setupSelectEqOrder(null as any);
    expect(await contabilidadeService.listLancamentos('emp-1')).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupSelectEqOrder([], { message: 'fail' });
    await expect(contabilidadeService.listLancamentos('emp-1')).rejects.toBeDefined();
  });
});

// ─── listPlanoContas ──────────────────────────────────────────────────────────

describe('contabilidadeService.listPlanoContas', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns plano de contas ordered by codigo', async () => {
    const records = [{ id: 'pc1', codigo: '1.1.01.001', nome: 'Caixa' }];
    const { orderFn } = setupSelectEqOrder(records);
    const result = await contabilidadeService.listPlanoContas('emp-1');
    expect(result).toEqual(records);
    expect(orderFn).toHaveBeenCalledWith('codigo');
  });

  it('returns empty array when data is null', async () => {
    setupSelectEqOrder(null as any);
    expect(await contabilidadeService.listPlanoContas('emp-1')).toEqual([]);
  });

  it('throws on DB error', async () => {
    setupSelectEqOrder([], { message: 'fail' });
    await expect(contabilidadeService.listPlanoContas('emp-1')).rejects.toBeDefined();
  });
});

// ─── gerarLancamentosFolha ────────────────────────────────────────────────────

describe('contabilidadeService.gerarLancamentosFolha', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  function setupGerarMocks(folha: any, plano: any[], insertError: any = null) {
    // 1st call: folhas_pagamento.select.eq.single
    const singleFn = vi.fn().mockResolvedValue({ data: folha, error: null });
    const eqFolha = vi.fn().mockReturnValue({ single: singleFn });
    const selectFolha = vi.fn().mockReturnValue({ eq: eqFolha });

    // 2nd call: plano_contas.select.eq → returns plano array
    const eqPlano = vi.fn().mockResolvedValue({ data: plano, error: null });
    const selectPlano = vi.fn().mockReturnValue({ eq: eqPlano });

    // 3rd call: lancamentos_contabeis.insert
    const insertFn = vi.fn().mockResolvedValue({ error: insertError });

    mockFrom
      .mockReturnValueOnce({ select: selectFolha })
      .mockReturnValueOnce({ select: selectPlano })
      .mockReturnValueOnce({ insert: insertFn });

    return { singleFn, eqPlano, insertFn };
  }

  const folha = { id: 'f1', competencia: '2026-07', total_liquido: 50000 };
  const plano = [
    { id: 'pc1', codigo: '2.1.01.001', nome: 'Salários a Pagar' },
    { id: 'pc2', codigo: '3.1.01.001', nome: 'Despesa de Salários' },
  ];

  it('inserts lancamento with correct debit/credit accounts', async () => {
    const { insertFn } = setupGerarMocks(folha, plano);
    await contabilidadeService.gerarLancamentosFolha('emp-1', 'f1');
    expect(insertFn).toHaveBeenCalledWith([expect.objectContaining({
      empresa_id: 'emp-1',
      folha_id: 'f1',
      valor: 50000,
      conta_debito_id: 'pc2',
      conta_credito_id: 'pc1',
      origem: 'folha',
      status: 'pendente',
    })]);
  });

  it('throws when plano de contas is incomplete', async () => {
    const incompletePlano = [{ id: 'pc1', codigo: '2.1.01.001' }]; // missing 3.1.01.001
    setupGerarMocks(folha, incompletePlano);
    await expect(
      contabilidadeService.gerarLancamentosFolha('emp-1', 'f1')
    ).rejects.toThrow('Plano de contas incompleto');
  });

  it('throws wrapped error when insert fails', async () => {
    const { insertFn } = setupGerarMocks(folha, plano, { message: 'insert failed' });
    void insertFn; // referenced via mock
    await expect(
      contabilidadeService.gerarLancamentosFolha('emp-1', 'f1')
    ).rejects.toThrow();
  });
});

// ─── exportarSPED ─────────────────────────────────────────────────────────────

describe('contabilidadeService.exportarSPED', () => {
  let listSpy: ReturnType<typeof vi.spyOn>;
  afterEach(() => { listSpy?.mockRestore(); });

  it('generates SPED file with header and footer', async () => {
    const records = [
      { id: 'l1', data_lancamento: '2026-07-01', valor: 1000, conta_debito: { codigo: '3.1' }, conta_credito: { codigo: '2.1' } },
    ];
    listSpy = vi.spyOn(contabilidadeService, 'listLancamentos').mockResolvedValue(records);
    const sped = await contabilidadeService.exportarSPED('emp-1');
    expect(sped).toContain('|0000|LECD|');
    expect(sped).toContain('|9999|');
    expect(sped).toContain('|I200|l1|');
  });

  it('returns SPED with only header and footer when no lancamentos', async () => {
    listSpy = vi.spyOn(contabilidadeService, 'listLancamentos').mockResolvedValue([]);
    const sped = await contabilidadeService.exportarSPED('emp-1');
    expect(sped).toContain('|0000|LECD|');
    expect(sped).toContain('|9999|');
    expect(sped).not.toContain('|I200|');
  });

  it('throws wrapped error on DB failure', async () => {
    listSpy = vi.spyOn(contabilidadeService, 'listLancamentos').mockRejectedValue(new Error('DB fail'));
    await expect(contabilidadeService.exportarSPED('emp-1')).rejects.toThrow('Falha ao exportar SPED');
  });
});
