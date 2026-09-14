import { auditLogger } from '@/utils/auditLogger';
import type { Tables } from '@/integrations/supabase/database.types';

type BatidaPonto = Partial<Tables<'batidas_ponto'>> | null;

export const pontoAuditService = {
  async logAdjustment(registroId: string, dadosAnteriores: BatidaPonto, dadosNovos: BatidaPonto) {
    await auditLogger.log({
      tabela: 'batidas_ponto',
      registro_id: registroId,
      acao: 'UPDATE',
      dados_anteriores: dadosAnteriores,
      dados_novos: dadosNovos,
    });
  },

  async logExclusion(registroId: string, dadosAnteriores: BatidaPonto) {
    await auditLogger.log({
      tabela: 'batidas_ponto',
      registro_id: registroId,
      acao: 'DELETE',
      dados_anteriores: dadosAnteriores,
    });
  },

  async logMassAction(empresaId: string, acao: string, detalhes: Record<string, unknown>) {
    await auditLogger.log({
      tabela: 'registros_ponto',
      registro_id: empresaId,
      acao: 'EXECUTE_CALC',
      empresa_id: empresaId,
      dados_novos: { action: acao, ...detalhes },
    });
  },
};
