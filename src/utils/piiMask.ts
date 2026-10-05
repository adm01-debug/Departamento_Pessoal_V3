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
  // <=4 dígitos mascara tudo — mostrar "últimos 4" de uma agência de 4
  // dígitos exporia o valor inteiro (incoerente com a máscara profunda).
  if (clean.length <= 4) return MASK_CHAR.repeat(clean.length);
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
// salario/salario_base NÃO entram: as telas já exibem salário a todos os
// papéis (decisão de produto) — o export deve carregar a mesma visão da tela.
// Casa prefixo E sufixo com fronteira de `_` (conjuge_cpf, colaborador_cpf,
// numero_pis, user_email, telefone_contato...), sem casar substring (cargo,
// contador, orgao não batem).
const PII_KEY =
  /(^|_)(cpf|cnpj|pis|pasep|rg|email|telefone|celular|whatsapp|conta|conta_bancaria|agencia|digito|pix_chave|chave_pix|data_nascimento|nome_mae|nome_pai|nome_nascimento|endereco|logradouro|cep|bairro|cidade|ctps|cnh|titulo_eleitor|banco_nome|assinatura_base64|senha|password|token|api_key|secret)(_|$)/i;

/**
 * Mascara recursivamente valores de chaves sensíveis em payloads
 * arbitrários (ex.: dados_novos da trilha de auditoria). Não altera
 * estrutura nem valores de chaves não sensíveis. A proteção contra
 * estruturas cíclicas usa WeakSet — não há limite de profundidade, então
 * chaves sensíveis são mascaradas em qualquer nível de aninhamento.
 */
export function maskPiiDeep(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return MASK_CHAR.repeat(4);
  seen.add(value);
  if (Array.isArray(value)) {
    const arr = value.map((v) => maskPiiDeep(v, seen));
    seen.delete(value); // libera refs compartilhadas (não-cíclicas) entre irmãos
    return arr;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = PII_KEY.test(k) && v != null ? MASK_CHAR.repeat(4) : maskPiiDeep(v, seen);
  }
  seen.delete(value);
  return out;
}
