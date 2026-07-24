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

export function safeErrorMessage(error: unknown, fallback = 'Ocorreu um erro. Tente novamente.'): string {
  if (!error) return fallback;

  const msg = error instanceof Error ? error.message : String(error);

  if (/duplicate key/i.test(msg)) return USER_FRIENDLY_MESSAGES.duplicate;
  if (/permission denied/i.test(msg)) return USER_FRIENDLY_MESSAGES.permission;
  if (/row-level security/i.test(msg)) return USER_FRIENDLY_MESSAGES.rls;

  if (INTERNAL_PATTERNS.some(p => p.test(msg))) {
    return fallback;
  }

  if (msg.length > 200) return msg.slice(0, 200) + '…';

  return msg;
}
