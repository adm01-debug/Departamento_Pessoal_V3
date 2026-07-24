import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pontoAuditService } from '../pontoAuditService';

const { mockLog } = vi.hoisted(() => ({ mockLog: vi.fn() }));

vi.mock('@/utils/auditLogger', () => ({
  auditLogger: { log: mockLog },
}));

describe('pontoAuditService.logAdjustment', () => {
  beforeEach(() => { vi.clearAllMocks(); mockLog.mockResolvedValue(undefined); });

  it('calls auditLogger.log with UPDATE action', async () => {
    const anterior = { id: 'bp1', hora: '08:00' };
    const novo = { id: 'bp1', hora: '08:05' };
    await pontoAuditService.logAdjustment('bp1', anterior, novo);
    expect(mockLog).toHaveBeenCalledWith({
      tabela: 'batidas_ponto',
      registro_id: 'bp1',
      acao: 'UPDATE',
      dados_anteriores: anterior,
      dados_novos: novo,
    });
  });
});

describe('pontoAuditService.logExclusion', () => {
  beforeEach(() => { vi.clearAllMocks(); mockLog.mockResolvedValue(undefined); });

  it('calls auditLogger.log with DELETE action', async () => {
    const anterior = { id: 'bp1', hora: '08:00' };
    await pontoAuditService.logExclusion('bp1', anterior);
    expect(mockLog).toHaveBeenCalledWith({
      tabela: 'batidas_ponto',
      registro_id: 'bp1',
      acao: 'DELETE',
      dados_anteriores: anterior,
    });
  });
});

describe('pontoAuditService.logMassAction', () => {
  beforeEach(() => { vi.clearAllMocks(); mockLog.mockResolvedValue(undefined); });

  it('calls auditLogger.log with EXECUTE_CALC action and detalhes spread', async () => {
    await pontoAuditService.logMassAction('emp-1', 'fechar_periodo', { total: 10 });
    expect(mockLog).toHaveBeenCalledWith({
      tabela: 'registros_ponto',
      registro_id: 'emp-1',
      acao: 'EXECUTE_CALC',
      dados_novos: { action: 'fechar_periodo', total: 10 },
    });
  });
});
