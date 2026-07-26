/**
 * P1-017: RPC error details — log no servidor, NUNCA expõe ao cliente
 *
 * PostgREST retorna erro de RPC com:
 *   error.message   → logado ao cliente + servidor
 *   error.details   → hint de índice, constraint, FK (NÃO retorna ao cliente)
 *   error.hint      → sugestões de correção (NÃO retorna ao cliente)
 *   error.code      → código SQL (ex: 23505 unique violation)
 *
 * Cenários de falha simulados:
 *   1. RPC com constraint violation → details contém nome da constraint interna
 *      → Sanitizar antes de log, NÃO retornar ao cliente
 *   2. details com valores de dados sensíveis (CPF, email)
 *      → Regex replace antes de qualquer log
 *   3. Nível de log errado (info para erro real)
 *      → Categorização por código SQL: 23505=error, 23503=warn, demais=error
 *   4. Hint útil para debugging mas expõe lógica interna
 *      → Log server-side, resposta genérica ao cliente
 *   5. Erro de rede vs erro PostgREST
 *      → Distinguir e logar diferencialmente
 */

export interface PostgRESTRpcError {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}

export interface RpcErrorContext {
  rpcName: string;
  userId?: string;
  empresaId?: string;
  params?: Record<string, unknown>;
  statusCode?: number;
}

const CPF_REGEX  = /\b\d{11}\b/g;
const CNPJ_REGEX = /\b\d{14}\b/g;
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const TELEFONE_REGEX = /\b\d{10,11}\b/g;

function sanitize(value: string): string {
  return value
    .replace(CPF_REGEX,  '***CPF***')
    .replace(CNPJ_REGEX,  '***CNPJ***')
    .replace(EMAIL_REGEX, '***EMAIL***')
    .replace(TELEFONE_REGEX, '***TEL***');
}

function categorizeByCode(code: string | undefined): 'error' | 'warn' | 'info' {
  if (!code) return 'error';
  const c = Number(code);
  if (c === 23505) return 'warn';    // unique_violation
  if (c === 23503) return 'warn';    // foreign_key_violation
  if (c === 23502) return 'error';   // not_null_violation
  if (c === 23514) return 'error';   // check_violation
  if (c === 23506) return 'error';  // exclusion_violation
  if (code === '22P02') return 'warn'; // invalid_text_representation (tipo errado — usa string)
  return 'error';
}

/**
 * Loga erro de RPC PostgREST de forma estruturada.
 *
 * @param err         — erro lançado pelo handler de RPC
 * @param ctx         — contexto: nome da RPC, userId, empresaId, params, statusCode
 * @param sendToSentry — se true, envia ao Sentry (default: true para status >= 500)
 *
 * Retorna mensagem segura para retornar ao cliente.
 * A mensagem original vai para LOG; uma genérica vai para o cliente.
 */
export function logRpcError(
  err: unknown,
  ctx: RpcErrorContext,
  sendToSentry = false,
): string {
  const rpcError = extractRpcError(err);
  const { rpcName, userId, empresaId, statusCode = 500 } = ctx;

  const level = categorizeByCode(rpcError.code);
  const sanitizedDetails = rpcError.details ? sanitize(rpcError.details) : undefined;
  const sanitizedHint    = rpcError.hint    ? sanitize(rpcError.hint)    : undefined;
  const sanitizedMessage = rpcError.message ? sanitize(rpcError.message) : 'Erro desconhecido';

  const logData = {
    rpc:        rpcName,
    userId:     userId ?? null,
    empresaId:  empresaId ?? null,
    errorCode:  rpcError.code   ?? null,
    statusCode,
    level,
    // Params sem dados sensíveis (só nomes de colunas)
    paramKeys:  ctx.params ? Object.keys(ctx.params) : null,
    message:    sanitizedMessage,
    details:    sanitizedDetails ?? null,
    hint:       sanitizedHint    ?? null,
    timestamp:  new Date().toISOString(),
  };

  if (level === 'error' || level === 'warn') {
    console.error(`[rpc-error] [${level.toUpperCase()}] ${rpcName}`, JSON.stringify(logData));
  } else {
    console.warn(`[rpc-error] [${level.toUpperCase()}] ${rpcName}`, JSON.stringify(logData));
  }

  if (sendToSentry) {
    try {
      const { captureException } = (globalThis as Record<string, unknown>).Sentry
        ? (globalThis as Record<string, unknown>).Sentry as { captureException: (e: unknown, ctx?: object) => void }
        : { captureException: () => {} };
      captureException(err, { extra: logData });
    } catch {
      // Sentry indisponível — não travar
    }
  }

  // Mensagem GENÉRICA para o cliente — nunca expõe details/hint/código SQL
  if (statusCode >= 500) {
    return 'Erro interno do servidor. A equipe foi notificada.';
  }
  if (statusCode === 409) {
    return 'Conflito de dados. O registro pode já existir.';
  }
  if (statusCode === 404) {
    return 'Registro não encontrado.';
  }
  if (statusCode === 400) {
    return 'Dados inválidos. Verifique os campos preenchidos.';
  }
  return 'Erro na operação. Tente novamente.';
}

function extractRpcError(err: unknown): PostgRESTRpcError {
  if (err instanceof Error) {
    // Tentar extrair do message (formato PostgREST: "{\"message\":\"...\",\"details\":\"...\"}")
    try {
      const parsed = JSON.parse(err.message);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          message: parsed.message,
          details: parsed.details,
          hint:    parsed.hint,
          code:    parsed.code,
        };
      }
    } catch {
      // Message não é JSON — usar o que temos
    }
    // Erro genérico JS
    return { message: err.message };
  }
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>;
    return {
      message: typeof e.message === 'string' ? e.message : undefined,
      details: typeof e.details === 'string' ? e.details : undefined,
      hint:    typeof e.hint    === 'string' ? e.hint    : undefined,
      code:    typeof e.code    === 'string' ? e.code    : undefined,
    };
  }
  return { message: String(err) };
}
