const INTERNAL_PATTERNS = [
  /violates? (row.level|check|foreign key|unique) constraint/i,
  /relation ".*" does not exist/i,
  /column ".*" (does not exist|of relation)/i,
  /permission denied for (table|schema|function)/i,
  /new row violates row-level security/i,
  /duplicate key value violates unique constraint/i,
  /function .* does not exist/i,
  /at character \d+/i,
  /DETAIL:|HINT:|CONTEXT:/i,
  /supabase/i,
  /postgresql?/i,
  /syntax error at or near/i,
];

const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  duplicate: 'Este registro já existe no sistema.',
  permission: 'Você não tem permissão para esta operação.',
  not_found: 'Registro não encontrado.',
  rls: 'Acesso negado pela política de segurança.',
};

/**
 * Extrai uma mensagem legível de qualquer formato de erro.
 *
 * Erros vindos do PostgREST/Edge Functions chegam como objetos simples
 * (`{ message, details, hint, code }`), não como instâncias de `Error`.
 * Usar `String(obj)` nesses casos produzia o inútil "[object Object]".
 */
function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    const candidate = error as Record<string, unknown>;
    for (const key of ['message', 'error_description', 'error', 'details', 'hint'] as const) {
      const value = candidate[key];
      if (typeof value === 'string' && value.trim()) return value;
      // `error` pode ser aninhado (ex.: `{ error: { message } }`).
      if (value && typeof value === 'object') {
        const nested = (value as Record<string, unknown>).message;
        if (typeof nested === 'string' && nested.trim()) return nested;
      }
    }
    return '';
  }
  if (error === null || error === undefined) return '';
  return String(error);
}

export function safeErrorMessage(error: unknown, fallback = 'Ocorreu um erro. Tente novamente.'): string {
  if (!error) return fallback;

  const msg = extractMessage(error);
  if (!msg) return fallback;

  if (/duplicate key/i.test(msg)) return USER_FRIENDLY_MESSAGES.duplicate;
  if (/permission denied/i.test(msg)) return USER_FRIENDLY_MESSAGES.permission;
  if (/row-level security/i.test(msg)) return USER_FRIENDLY_MESSAGES.rls;

  if (INTERNAL_PATTERNS.some(p => p.test(msg))) {
    return fallback;
  }

  if (msg.length > 200) return msg.slice(0, 200) + '…';

  return msg;
}
