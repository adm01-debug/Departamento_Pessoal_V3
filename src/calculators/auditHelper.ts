import { auditLogger } from '@/utils/auditLogger';

interface FolhaResultado {
  proventos?: number | { totalProventos?: number };
  descontos?: number | { totalDescontos?: number };
  salarioLiquido?: number;
  liquido?: number;
}

export async function signCalculation(data: unknown) {
  const encoder = new TextEncoder();
  const rawData = JSON.stringify(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawData));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function auditCalculation(
  colaboradorId: string,
  competencia: string,
  resultado: FolhaResultado
) {
  // Gera assinatura digital única do resultado
  const signature = await signCalculation(resultado);
  
  await auditLogger.log({
    tabela: 'folhas_pagamento',
    registro_id: colaboradorId,
    acao: 'EXECUTE_CALC',
    dados_novos: {
      competencia,
      signature,
      // Metadados essenciais para conferência rápida
      total_proventos: (resultado.proventos as { totalProventos?: number } | undefined)?.totalProventos ?? (resultado.proventos as number | undefined),
      total_descontos: (resultado.descontos as { totalDescontos?: number } | undefined)?.totalDescontos ?? (resultado.descontos as number | undefined),
      salario_liquido: resultado.salarioLiquido || resultado.liquido,
      // Flag de integridade
      integridade_calculo: 'ASSINADO_SHA256',
      timestamp: new Date().toISOString()
    }
  });

  return signature;
}

/**
 * Verifica se um resultado de cálculo foi alterado comparando com a assinatura
 */
export async function verifyCalculationIntegrity(data: unknown, originalSignature: string): Promise<boolean> {
  const currentSignature = await signCalculation(data);
  return currentSignature === originalSignature;
}
