import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

function makeSelectChain(data: any = [], error: any = null) {
  const result = { data, error };
  const eq = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ then: (fn: any) => Promise.resolve(result).then(fn), eq, limit });
  return { select };
}

import { viewsService } from '../viewsService';

describe('viewsService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('alertasRH queries vw_alertas_rh and returns array', async () => {
    mockFrom.mockReturnValue(makeSelectChain([{ id: 'a1' }]));
    const result = await viewsService.alertasRH();
    expect(mockFrom).toHaveBeenCalledWith('vw_alertas_rh');
    expect(Array.isArray(result)).toBe(true);
  });

  it('alertasRH returns [] on error (view not found)', async () => {
    mockFrom.mockReturnValue(makeSelectChain(null, new Error('relation does not exist')));
    const result = await viewsService.alertasRH();
    expect(result).toEqual([]);
  });

  it('kpiTurnover queries vw_kpi_turnover', async () => {
    mockFrom.mockReturnValue(makeSelectChain([{ taxa: 0.05 }]));
    const result = await viewsService.kpiTurnover();
    expect(mockFrom).toHaveBeenCalledWith('vw_kpi_turnover');
    expect(Array.isArray(result)).toBe(true);
  });

  it('kpiTurnover returns [] on error', async () => {
    mockFrom.mockReturnValue(makeSelectChain(null, new Error('error')));
    const result = await viewsService.kpiTurnover();
    expect(result).toEqual([]);
  });

  it('kpiAbsenteismo queries vw_kpi_absenteismo', async () => {
    mockFrom.mockReturnValue(makeSelectChain([]));
    await viewsService.kpiAbsenteismo();
    expect(mockFrom).toHaveBeenCalledWith('vw_kpi_absenteismo');
  });

  it('kpiBeneficiosCusto queries vw_kpi_beneficios_custo', async () => {
    mockFrom.mockReturnValue(makeSelectChain([]));
    await viewsService.kpiBeneficiosCusto();
    expect(mockFrom).toHaveBeenCalledWith('vw_kpi_beneficios_custo');
  });

  it('kpiPontoResumo queries vw_kpi_ponto_resumo', async () => {
    mockFrom.mockReturnValue(makeSelectChain([]));
    await viewsService.kpiPontoResumo();
    expect(mockFrom).toHaveBeenCalledWith('vw_kpi_ponto_resumo');
  });

  it('bancoHorasSaldo queries vw_banco_horas_saldo', async () => {
    mockFrom.mockReturnValue(makeSelectChain([]));
    await viewsService.bancoHorasSaldo();
    expect(mockFrom).toHaveBeenCalledWith('vw_banco_horas_saldo');
  });

  it('feriasResumo queries vw_ferias_resumo', async () => {
    mockFrom.mockReturnValue(makeSelectChain([]));
    await viewsService.feriasResumo();
    expect(mockFrom).toHaveBeenCalledWith('vw_ferias_resumo');
  });

  it('faltasMensal queries vw_faltas_mensal', async () => {
    mockFrom.mockReturnValue(makeSelectChain([]));
    await viewsService.faltasMensal();
    expect(mockFrom).toHaveBeenCalledWith('vw_faltas_mensal');
  });

  it('cadastroIncompleto queries vw_cadastro_incompleto', async () => {
    mockFrom.mockReturnValue(makeSelectChain([]));
    await viewsService.cadastroIncompleto();
    expect(mockFrom).toHaveBeenCalledWith('vw_cadastro_incompleto');
  });

  it('colaboradoresCompleto queries vw_colaboradores_completo with limit', async () => {
    const chain = makeSelectChain([]);
    mockFrom.mockReturnValue(chain);
    await viewsService.colaboradoresCompleto(50);
    expect(mockFrom).toHaveBeenCalledWith('vw_colaboradores_completo');
    expect(chain.select().limit).toBeDefined();
  });

  it('dashboardTime queries vw_dashboard_time', async () => {
    mockFrom.mockReturnValue(makeSelectChain([]));
    await viewsService.dashboardTime();
    expect(mockFrom).toHaveBeenCalledWith('vw_dashboard_time');
  });

  it('batidasDia queries vw_batidas_dia with data param', async () => {
    const chain = makeSelectChain([]);
    mockFrom.mockReturnValue(chain);
    await viewsService.batidasDia('2024-07-24');
    expect(mockFrom).toHaveBeenCalledWith('vw_batidas_dia');
  });

  it('batidasResumo queries vw_batidas_resumo', async () => {
    mockFrom.mockReturnValue(makeSelectChain([]));
    await viewsService.batidasResumo();
    expect(mockFrom).toHaveBeenCalledWith('vw_batidas_resumo');
  });

  it('folhaPontoMensal queries vw_folha_ponto_mensal', async () => {
    mockFrom.mockReturnValue(makeSelectChain([]));
    await viewsService.folhaPontoMensal();
    expect(mockFrom).toHaveBeenCalledWith('vw_folha_ponto_mensal');
  });

  it('alertasCompensacao queries vw_alertas_compensacao', async () => {
    mockFrom.mockReturnValue(makeSelectChain([]));
    await viewsService.alertasCompensacao();
    expect(mockFrom).toHaveBeenCalledWith('vw_alertas_compensacao');
  });

  it('saldoCompensacaoMensal queries vw_saldo_compensacao_mensal', async () => {
    mockFrom.mockReturnValue(makeSelectChain([]));
    await viewsService.saldoCompensacaoMensal();
    expect(mockFrom).toHaveBeenCalledWith('vw_saldo_compensacao_mensal');
  });
});
