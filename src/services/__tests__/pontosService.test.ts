import { describe, it, expect, vi } from 'vitest';

const { pontoFns, batidasFns, monitorMock, auditMock, offlineMock } = vi.hoisted(() => {
  const pontoFns = {
    registrar: vi.fn(), getSettings: vi.fn(), buscarRegistroHoje: vi.fn(),
    buscarRegistrosSemana: vi.fn(), validarBiometria: vi.fn(),
  };
  const batidasFns = {
    listar: vi.fn(), listarPorData: vi.fn(), ajustar: vi.fn(),
    excluir: vi.fn(), fecharPeriodo: vi.fn(),
  };
  return {
    pontoFns,
    batidasFns,
    monitorMock: { monitorar: vi.fn() },
    auditMock: { registrar: vi.fn() },
    offlineMock: { queueRegistro: vi.fn() },
  };
});

vi.mock('@/services/pontoService', () => ({
  pontoService: {
    registrar: pontoFns.registrar, getSettings: pontoFns.getSettings,
    buscarRegistroHoje: pontoFns.buscarRegistroHoje, buscarRegistrosSemana: pontoFns.buscarRegistrosSemana,
    validarBiometria: pontoFns.validarBiometria,
  },
}));

vi.mock('@/services/batidasPontoService', () => ({
  batidasPontoService: {
    listar: batidasFns.listar, listarPorData: batidasFns.listarPorData,
    ajustar: batidasFns.ajustar, excluir: batidasFns.excluir, fecharPeriodo: batidasFns.fecharPeriodo,
  },
}));

vi.mock('@/services/pontoMonitorService', () => ({ pontoMonitorService: monitorMock }));
vi.mock('@/services/pontoAuditService', () => ({ pontoAuditService: auditMock }));
vi.mock('@/services/pontoOfflineService', () => ({ pontoOfflineService: offlineMock }));

import { pontosService } from '../pontosService';

describe('pontosService facade', () => {
  it('exposes registrar from pontoService', () => {
    pontosService.registrar({ colaborador_id: 'c1' } as any);
    expect(pontoFns.registrar).toHaveBeenCalledWith({ colaborador_id: 'c1' });
  });

  it('exposes getSettings from pontoService', () => {
    pontosService.getSettings();
    expect(pontoFns.getSettings).toHaveBeenCalled();
  });

  it('exposes buscarRegistroHoje from pontoService', () => {
    pontosService.buscarRegistroHoje('col-1');
    expect(pontoFns.buscarRegistroHoje).toHaveBeenCalledWith('col-1');
  });

  it('exposes buscarRegistrosSemana from pontoService', () => {
    pontosService.buscarRegistrosSemana('col-1');
    expect(pontoFns.buscarRegistrosSemana).toHaveBeenCalledWith('col-1');
  });

  it('exposes validarBiometria from pontoService', () => {
    pontosService.validarBiometria('col-1', 'fp-data');
    expect(pontoFns.validarBiometria).toHaveBeenCalledWith('col-1', 'fp-data');
  });

  it('exposes listar from batidasPontoService', () => {
    pontosService.listar({ empresa_id: 'e1' });
    expect(batidasFns.listar).toHaveBeenCalledWith({ empresa_id: 'e1' });
  });

  it('exposes ajustar from batidasPontoService', () => {
    pontosService.ajustar('id-1', {} as any);
    expect(batidasFns.ajustar).toHaveBeenCalledWith('id-1', {});
  });

  it('exposes excluir from batidasPontoService', () => {
    pontosService.excluir('id-1');
    expect(batidasFns.excluir).toHaveBeenCalledWith('id-1');
  });

  it('exposes monitor namespace', () => {
    expect(pontosService.monitor).toBe(monitorMock);
  });

  it('exposes audit namespace', () => {
    expect(pontosService.audit).toBe(auditMock);
  });

  it('exposes offline namespace', () => {
    expect(pontosService.offline).toBe(offlineMock);
  });
});
