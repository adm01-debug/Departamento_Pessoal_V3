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
      ...contexto,
      url: window.location.href,
      user_agent: navigator.userAgent,
      ...(trace ? { stack_trace: trace } : {}),
    };
    const logEntry: LogEntry = {
      nivel,
      mensagem,
      contexto: enrichedContexto,
      created_at: new Date().toISOString()
    };

    logBuffer.push(logEntry);

    if (IMMEDIATE_LEVELS.has(nivel)) {
      emitStructured(logEntry);
      void this.flush();
    } else if (nivel === 'warn') {
      emitStructured(logEntry);
      // Warn logs flush immediately to preserve security audit trail
      void this.flush();
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
    const persistableLogs = logsToSend.filter(l => PERSIST_LEVELS.has(l.nivel));
    for (const entry of persistableLogs) {
      supabase.rpc('log_frontend_error', {
        p_nivel: entry.nivel,
        p_mensagem: entry.mensagem,
        p_contexto: entry.contexto as Record<string, unknown>,
      }).catch((e: unknown) => {
        if (import.meta.env.DEV) {
          console.error('[logger] RPC flush failed:', e);
        }
      });
    }

    if (import.meta.env.DEV) {
      const skipped = logsToSend.length - persistableLogs.length;
      if (skipped > 0) {
        console.debug(`[logger] ${skipped} info entries not persisted remotely.`);
      }
    }
  },

  info(mensagem: string, contexto?: Record<string, unknown>) {
    void this.log('info', mensagem, contexto);
  },

  warn(mensagem: string, contexto?: Record<string, unknown>) {
    void this.log('warn', mensagem, contexto);
  },

  error(mensagem: string, contexto?: Record<string, unknown>, error?: Error) {
    void this.log('error', mensagem, contexto, error?.stack);
  },

  fatal(mensagem: string, contexto?: Record<string, unknown>, error?: Error) {
    void this.log('fatal', mensagem, contexto, error?.stack);
  }
};
