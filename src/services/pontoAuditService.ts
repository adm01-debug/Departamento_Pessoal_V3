import { auditLogger } from '@/utils/auditLogger';

export const pontoAuditService = {
  async logAdjustment(registroId: string, dadosAnteriores: any, dadosNovos: any) {
    await auditLogger.log({
      tabela: 'batidas_ponto',
      registro_id: registroId,
      acao: 'UPDATE',
      dados_anteriores: dadosAnteriores,
      dados_novos: dadosNovos
    });
  },

  async logExclusion(registroId: string, dadosAnteriores: any) {
    await auditLogger.log({
      tabela: 'batidas_ponto',
      registro_id: registroId,
      acao: 'DELETE',
      dados_anteriores: dadosAnteriores
    });
  },

  async logMassAction(empresaId: string, acao: string, detalhes: any) {
    await auditLogger.log({
      tabela: 'registros_ponto',
      registro_id: empresaId,
      acao: 'EXECUTE_CALC',
      dados_novos: { action: acao, ...detalhes }
    });
  }
};
