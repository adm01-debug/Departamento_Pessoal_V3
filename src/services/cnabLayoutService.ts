import { cnabService } from '@/services/cnabService';

export const cnabLayoutService = {
  /**
   * Layout CNAB 240 FEBRABAN para Folha de Pagamento
   * Implementação focada em Segmento A e B (Crédito em Conta/PIX)
   */
  async generateCNAB240Real(empresaId: string, folhaId: string): Promise<string> {
    return cnabService.generateCNAB240(empresaId, folhaId);
  }
};
