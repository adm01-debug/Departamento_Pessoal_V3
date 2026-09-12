import { supabase } from '@/integrations/supabase/client';

export type LogLevel = 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  nivel: LogLevel;
  mensagem: string;
  contexto: Record<string, unknown>;
  created_at: string;
  user_id?: string;
}

// P3-066: correlation_id por sessão (UUID gerado no boot).
const SESSION_ID = crypto.randomUUID();

const MAX_LOGS_BUFFER = 50;
const logBuffer: LogEntry[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

// Levels that warrant remote persistence via SECURITY DEFINER RPC.
// info is intentionally excluded to avoid flooding the audit table.
const PERSIST_LEVELS = new Set<LogLevel>(['warn', 'error', 'fatal']);

// Levels that must flush immediately (no buffering delay).
const IMMEDIATE_LEVELS = new Set<LogLevel>(['error', 'fatal']);

const REDACTED = '[REDACTED]';
const MAX_LOG_TEXT_LENGTH = 2_048;
const SENSITIVE_CONTEXT_KEY =
  /(?:email|e_mail|password|senha|token|secret|authorization|cookie|api_?key|cpf|cnpj|phone|telefone|celular|endereco|address|user_?id|userid|refresh)/i;
const URL_CONTEXT_KEY = /(?:url|uri|href|link)$/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const CNPJ_PATTERN = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const JWT_OR_SECRET_PATTERN =
  /\b(?:eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|sb(?:p|_secret|_publishable)_[A-Za-z0-9_-]{12,})\b/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const URL_SECRET_PATTERN =
  /([?&](?:access_token|refresh_token|token|code|password|secret|api_?key|authorization)=)[^&#\s]+/gi;
const INLINE_SECRET_PATTERN =
  /\b(access_token|refresh_token|token|code|password|secret|api_?key|authorization)\s*[=:]\s*[^\s,;]+/gi;

/** Redacts values that must never cross the browser, console, or audit RPC boundary. */
export function redactLogText(value: string): string {
  const redacted = value
    .replace(URL_SECRET_PATTERN, `$1${REDACTED}`)
    .replace(INLINE_SECRET_PATTERN, (_match, key: string) => `${key}=${REDACTED}`)
    .replace(BEARER_PATTERN, `Bearer ${REDACTED}`)
    .replace(JWT_OR_SECRET_PATTERN, REDACTED)
    .replace(EMAIL_PATTERN, REDACTED)
    .replace(CPF_PATTERN, REDACTED)
    .replace(CNPJ_PATTERN, REDACTED);

  return redacted.length > MAX_LOG_TEXT_LENGTH ? `${redacted.slice(0, MAX_LOG_TEXT_LENGTH)}…[TRUNCATED]` : redacted;
}

function sanitizeLogUrl(value: string): string {
  try {
    const url = new URL(value, window.location.origin);
    // Query strings and fragments are common carriers for recovery codes and
    // access tokens. Route-level observability is sufficient for client logs.
    return `${url.origin}${url.pathname}`;
  } catch {
    return '[INVALID_URL]';
  }
}

function redactLogValue(value: unknown, key?: string, seen = new WeakSet<object>()): unknown {
  if (key && SENSITIVE_CONTEXT_KEY.test(key)) return REDACTED;

  if (typeof value === 'string') {
    return key && URL_CONTEXT_KEY.test(key) ? sanitizeLogUrl(value) : redactLogText(value);
  }
  if (typeof value === 'bigint') return value.toString();
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (value instanceof Error) {
    return { name: value.name, message: redactLogText(value.message) };
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return '[CIRCULAR]';
    seen.add(value);
    return value.map((item) => redactLogValue(item, undefined, seen));
  }
  if (typeof value !== 'object') return '[UNSERIALIZABLE]';
  if (seen.has(value)) return '[CIRCULAR]';

  seen.add(value);
  const result: Record<string, unknown> = {};
  for (const [nestedKey, nestedValue] of Object.entries(value)) {
    result[nestedKey] = redactLogValue(nestedValue, nestedKey, seen);
  }
  return result;
}

/** Produces JSON-safe, privacy-minimized context for every logger sink. */
export function redactLogContext(contexto: Record<string, unknown>): Record<string, unknown> {
  return redactLogValue(contexto) as Record<string, unknown>;
}

/**
 * P3-066: emite JSON estruturado por linha (Datadog/Sentry/BetterStack ready).
 * Em DEV usa console.* para legibilidade; em PROD usa JSON.
 */
function emitStructured(entry: LogEntry): void {
  const payload = {
    ts: entry.created_at,
    level: entry.nivel,
    session_id: SESSION_ID,
    mensagem: entry.mensagem,
    contexto: entry.contexto,
    user_id: entry.user_id,
  };
  if (import.meta.env.DEV) {
    // Em dev, console formatado para legibilidade
    const tag = `[${entry.nivel.toUpperCase()}]`;
    if (entry.nivel === 'error' || entry.nivel === 'fatal') {
      console.error(tag, entry.mensagem, entry.contexto);
    } else if (entry.nivel === 'warn') {
      console.warn(tag, entry.mensagem, entry.contexto);
    } else {
      console.debug(tag, entry.mensagem, entry.contexto);
    }
  } else {
    // Em prod, JSON puro para ingestão
    console.log(JSON.stringify(payload));
  }
}

export const loggerService = {
  async log(nivel: LogLevel, mensagem: string, contexto: Record<string, unknown> = {}, stackTrace?: string) {
    const trace = stackTrace || (nivel === 'error' || nivel === 'fatal' ? new Error().stack : undefined);
    const enrichedContexto: Record<string, unknown> = {
      ...redactLogContext(contexto),
      url: sanitizeLogUrl(window.location.href),
      ...(trace ? { stack_trace: redactLogText(trace) } : {}),
    };
    const logEntry: LogEntry = {
      nivel,
      mensagem: redactLogText(mensagem),
      contexto: enrichedContexto,
      created_at: new Date().toISOString(),
    };

    logBuffer.push(logEntry);

    if (IMMEDIATE_LEVELS.has(nivel)) {
      emitStructured(logEntry);
      return this.flush();
    } else if (nivel === 'warn') {
      emitStructured(logEntry);
      // Warn logs flush immediately to preserve security audit trail
      return this.flush();
    } else {
      if (logBuffer.length >= MAX_LOGS_BUFFER) {
        void this.flush();
      } else if (!flushTimeout) {
        flushTimeout = setTimeout(() => {
          void this.flush();
        }, 10000);
      }
    }
  },

  async flush() {
    if (logBuffer.length === 0) return;
    if (flushTimeout) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }

    const logsToSend = logBuffer.splice(0, logBuffer.length);

    // Persist warn/error/fatal via SECURITY DEFINER RPC — bypasses RLS on audit_log_unified
    const persistableLogs = logsToSend.filter((l) => PERSIST_LEVELS.has(l.nivel));

    // A RPC de auditoria exige sessão autenticada. Tentá-la em login, reset de
    // senha ou bootstrap sem sessão só cria uma segunda falha de telemetria e
    // não consegue registrar nada. O evento continua emitido localmente pelo
    // logger estruturado e será persistido normalmente após autenticação.
    const getSession = (supabase as { auth?: { getSession?: unknown } } | undefined)?.auth?.getSession;
    if (typeof getSession !== 'function') {
      if (import.meta.env.DEV) {
        console.debug('[logger] sessão indisponível — descartando lote remoto.');
      }
      return;
    }

    try {
      const { data } = await getSession();
      if (!data?.session) {
        if (import.meta.env.DEV) {
          console.debug('[logger] sem sessão — descartando lote remoto.');
        }
        return;
      }
    } catch {
      if (import.meta.env.DEV) {
        console.debug('[logger] não foi possível consultar sessão — descartando lote remoto.');
      }
      return;
    }

    // Defensivo: em ambientes degradados (testes, SSR, client parcialmente
    // mockado) `supabase.rpc` pode não existir. Nunca deixar o logger derrubar
    // o processo com uma unhandled rejection — ele é infraestrutura, não regra.
    const rpc = (supabase as { rpc?: unknown } | undefined)?.rpc;
    if (typeof rpc !== 'function') {
      if (import.meta.env.DEV) {
        console.debug('[logger] supabase.rpc indisponível — descartando lote local.');
      }
      return;
    }

    for (const entry of persistableLogs) {
      try {
        const result = supabase.rpc('log_frontend_error', {
          p_nivel: entry.nivel,
          p_mensagem: entry.mensagem,
          p_contexto: entry.contexto as Record<string, unknown>,
        }) as unknown as Promise<unknown> | undefined;

        if (result && typeof (result as Promise<unknown>).catch === 'function') {
          void (result as Promise<unknown>).catch((e: unknown) => {
            if (import.meta.env.DEV) {
              console.error('[logger] RPC flush failed:', e);
            }
          });
        }
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error('[logger] RPC flush threw synchronously:', e);
        }
      }
    }

    if (import.meta.env.DEV) {
      const skipped = logsToSend.length - persistableLogs.length;
      if (skipped > 0) {
        console.debug(`[logger] ${skipped} info entries not persisted remotely.`);
      }
    }
  },

  /**
   * Log de depuração — só emitido em DEV (nunca persistido remotamente),
   * mapeado para o nível 'info' no backend quando necessário.
   */
  debug(mensagem: string, contexto?: Record<string, unknown>) {
    if (import.meta.env.DEV) {
      console.debug(`[debug] ${redactLogText(mensagem)}`, redactLogContext(contexto ?? {}));
    }
  },

  info(mensagem: string, contexto?: Record<string, unknown>) {
    void this.log('info', mensagem, contexto);
  },

  warn(mensagem: string, contexto?: Record<string, unknown>) {
    return this.log('warn', mensagem, contexto);
  },

  error(mensagem: string, contexto?: Record<string, unknown>, error?: Error) {
    return this.log('error', mensagem, contexto, error?.stack);
  },

  fatal(mensagem: string, contexto?: Record<string, unknown>, error?: Error) {
    return this.log('fatal', mensagem, contexto, error?.stack);
  },
};
