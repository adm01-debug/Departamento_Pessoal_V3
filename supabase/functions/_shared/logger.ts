// Bridge structured logger (P3-063).
// Emite JSON estruturado por linha para fácil ingestão por Datadog/CloudWatch.
// Cada chamada é síncrona e lock-free; performance overhead é mínimo.
//
// Níveis: debug < info < warn < error < fatal
// Cada nível inclui: ts, level, event, correlation_id, request_id (se houver).

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

const MIN_LEVEL: LogLevel =
  ((Deno.env.get('BRIDGE_LOG_LEVEL') as LogLevel) || 'info');

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[MIN_LEVEL];
}

function emit(level: LogLevel, event: string, data: Record<string, unknown> = {}): void {
  if (!shouldLog(level)) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  });
  switch (level) {
    case 'debug':
    case 'info':
      console.log(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    case 'error':
    case 'fatal':
      console.error(line);
      break;
  }
}

export const log = {
  debug: (event: string, data?: Record<string, unknown>) => emit('debug', event, data),
  info: (event: string, data?: Record<string, unknown>) => emit('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => emit('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) => emit('error', event, data),
  fatal: (event: string, data?: Record<string, unknown>) => emit('fatal', event, data),
};
