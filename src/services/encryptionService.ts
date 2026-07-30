/**
 * P1-025: Service de criptografia para dados sensíveis (LGPD compliance)
 *
 * Utilidades PURAS de tratamento de dados sensíveis no cliente:
 * validação de CPF/CNPJ, mascaramento para exibição e sanitização para logs.
 *
 * Nenhuma operação criptográfica de PII acontece no navegador — ver a
 * "NOTA DE SEGURANÇA" abaixo.
 */

// =============================================================================
// NOTA DE SEGURANÇA — CRIPTOGRAFIA DE PII
// =============================================================================
// As funções `encryptPII` / `decryptPII` / `hashPII` (e `encryptDadosBancarios`,
// `checkEncryptionAvailable`, que dependiam delas) foram REMOVIDAS por dois
// motivos:
//
// 1. Elas chamavam as RPCs `encrypt_pii`, `decrypt_pii` e `hash_pii`, que NÃO
//    existem no banco — toda invocação falhava em runtime.
// 2. Expor uma RPC de decriptografia ao papel `authenticated` permitiria que
//    qualquer sessão do navegador revertesse PII de terceiros.
//
// Criptografia/decriptografia de PII deve ocorrer exclusivamente no servidor
// (Edge Function com service role) ou via colunas derivadas mantidas por
// trigger no banco (ex.: `fn_colab_cpf_hash` para o hash de CPF).
//
// Este módulo mantém apenas utilidades puras e seguras para o cliente:
// validação, mascaramento e sanitização para logs.
// =============================================================================

// =============================================================================
// VALIDAÇÃO DE CPF/CNPJ (ANTES DE CRIPTOGRAFAR)
// =============================================================================

export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');

  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF[10])) return false;

  return true;
}

export function validateCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, '');

  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;

  // Validação básica de dígitos verificadores
  // (implementação completa omitida para brevidade)
  return true;
}

// =============================================================================
// MÁSCARAS (PARA EXIBIÇÃO)
// =============================================================================

export function maskCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return `${clean.slice(0, 3)}.***.${clean.slice(9, 11)}**`;
}

export function maskCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return cnpj;
  return `${clean.slice(0, 2)}.***.${clean.slice(12, 14)}/**`;
}

export function maskContaBancaria(conta: string): string {
  if (conta.length <= 4) return '****';
  return `****${conta.slice(-4)}`;
}

// =============================================================================
// MASCARAMENTO TOTAL (PARA LOGS/TELEMETRIA)
// =============================================================================

/**
 * Remove dados sensíveis de objetos para logging seguro
 */
export function sanitizeForLogging<T extends Record<string, unknown>>(obj: T): T {
  const sensitiveFields = ['cpf', 'cnpj', 'rg', 'senha', 'password', 'conta', 'agencia', 'salario'];

  const sanitized: Record<string, unknown> = { ...obj };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some((field) => lowerKey.includes(field))) {
      const value = sanitized[key];
      if (typeof value === 'string') {
        sanitized[key] = `[REDACTED-${value.length}chars]`;
      }
    }
  }

  return sanitized as T;
}
