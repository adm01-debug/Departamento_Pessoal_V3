const MASK_CHAR = '•';

export function maskCpfDisplay(cpf: string | null | undefined): string {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return MASK_CHAR.repeat(11);
  return `${MASK_CHAR.repeat(3)}.${MASK_CHAR.repeat(3)}.${MASK_CHAR.repeat(3)}-${digits.slice(9)}`;
}

export function maskBankAccount(account: string | null | undefined): string {
  if (!account) return '';
  const clean = account.replace(/\D/g, '');
  if (clean.length < 4) return MASK_CHAR.repeat(clean.length);
  return MASK_CHAR.repeat(clean.length - 4) + clean.slice(-4);
}

export function maskPisDisplay(pis: string | null | undefined): string {
  if (!pis) return '';
  const digits = pis.replace(/\D/g, '');
  if (digits.length !== 11) return MASK_CHAR.repeat(11);
  return `${MASK_CHAR.repeat(3)}.${MASK_CHAR.repeat(5)}.${MASK_CHAR.repeat(2)}-${digits.slice(10)}`;
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return MASK_CHAR.repeat(email.length);
  const visibleLocal =
    local.length <= 2
      ? MASK_CHAR.repeat(local.length)
      : local[0] + MASK_CHAR.repeat(local.length - 2) + local[local.length - 1];
  return `${visibleLocal}@${domain}`;
}

/** Máscara genérica: preserva os últimos 4 caracteres (telefone, CNPJ, chave aleatória). */
export function maskGeneric(value: string | null | undefined): string {
  if (!value) return '';
  if (value.length <= 4) return MASK_CHAR.repeat(value.length);
  return MASK_CHAR.repeat(value.length - 4) + value.slice(-4);
}

// Chaves cujo conteúdo é PII/segredo independente do formato — usada para
// mascarar payloads arbitrários (trilha de auditoria, exports).
const PII_KEY =
  /^(cpf|cnpj|pis|pasep|rg|email|telefone|celular|salario|salario_base|conta|conta_bancaria|agencia|digito|pix_chave|chave_pix|data_nascimento|nome_mae|endereco|logradouro|cep|banco_nome|assinatura_base64|senha|password|token|api_key|secret)/i;

/**
 * Mascara recursivamente valores de chaves sensíveis em payloads
 * arbitrários (ex.: dados_novos da trilha de auditoria). Não altera
 * estrutura nem valores de chaves não sensíveis.
 */
export function maskPiiDeep(value: unknown, depth = 0): unknown {
  if (depth > 8 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => maskPiiDeep(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = PII_KEY.test(k) && v != null ? MASK_CHAR.repeat(4) : maskPiiDeep(v, depth + 1);
  }
  return out;
}
