/**
 * ============================================================================
 * ALLOWLIST TEMPORÁRIA DE TESTE — proteção ADICIONAL de custo
 * ============================================================================
 * Quando a geração paga está habilitada, a Edge Function exige que a empresa e
 * o conteúdo da solicitação correspondam EXATAMENTE aos dois IDs configurados
 * nos segredos do servidor. Não é uma autorização: JWT, vínculo com a empresa,
 * papel admin/RH, quota, claim atômico e idempotência continuam valendo.
 *
 * Regras:
 *   • qualquer variável ausente/vazia/inválida ⇒ 503 (configuração incompleta);
 *   • empresa ou conteúdo diferente ⇒ 403 (fora da allowlist);
 *   • comparação normalizada (trim + caixa baixa), pois UUID não tem caixa.
 *
 * Este módulo é PURO (não lê Deno.env), permitindo testes unitários no Node.
 * ============================================================================
 */

import { isUuid } from './uuid.ts';

export const ALLOWLIST_EMPRESA_ENV = 'TRAINING_IMAGE_ALLOWED_EMPRESA_ID';
export const ALLOWLIST_CONTENT_ENV = 'TRAINING_IMAGE_ALLOWED_CONTENT_ID';

export interface EntradaAllowlist {
  empresaId: string;
  contentId: string;
}

export interface ConfigAllowlist {
  empresaId?: string | null;
  contentId?: string | null;
}

export type ResultadoAllowlist =
  | { ok: true }
  | {
      ok: false;
      status: 403 | 503;
      motivo: 'fora_da_allowlist' | 'allowlist_nao_configurada';
      detalhe: string;
    };

function normalizar(valor: string | null | undefined): string {
  return String(valor ?? '').trim().toLowerCase();
}

/**
 * Valida a allowlist SEM confiar apenas no corpo: os IDs permitidos vêm do
 * ambiente do servidor. Retorna 503 quando a configuração está incompleta e
 * 403 quando a solicitação não corresponde exatamente.
 */
export function validarAllowlist(
  entrada: EntradaAllowlist,
  config: ConfigAllowlist
): ResultadoAllowlist {
  const empresaPermitida = normalizar(config.empresaId);
  const conteudoPermitido = normalizar(config.contentId);

  if (!isUuid(empresaPermitida) || !isUuid(conteudoPermitido)) {
    return {
      ok: false,
      status: 503,
      motivo: 'allowlist_nao_configurada',
      detalhe:
        `${ALLOWLIST_EMPRESA_ENV} e ${ALLOWLIST_CONTENT_ENV} são obrigatórios e devem ser UUIDs válidos quando a geração está habilitada.`,
    };
  }

  const empresaSolicitada = normalizar(entrada.empresaId);
  const conteudoSolicitado = normalizar(entrada.contentId);

  if (empresaSolicitada !== empresaPermitida || conteudoSolicitado !== conteudoPermitido) {
    return {
      ok: false,
      status: 403,
      motivo: 'fora_da_allowlist',
      detalhe: 'Empresa ou curso fora da allowlist temporária deste teste.',
    };
  }

  return { ok: true };
}
