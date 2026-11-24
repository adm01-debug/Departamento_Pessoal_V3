// MP-014: Sentry-lite observability helper for Edge Functions.
// Sends events to SENTRY_DSN when configured; no-op otherwise.
// Avoids heavy Deno SDK cold-start; sends via native fetch to Sentry envelope endpoint.

interface SentryContext {
  function: string;
  release?: string;
  environment?: string;
  extra?: Record<string, unknown>;
  user?: { id?: string; email?: string };
}

const DSN = Deno.env.get('SENTRY_DSN') || '';
const RELEASE = Deno.env.get('SENTRY_RELEASE') || 'unknown';
const ENV = Deno.env.get('SENTRY_ENVIRONMENT') || 'production';

function parseDsn(dsn: string) {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace('/', '');
    const host = url.host;
    return {
      publicKey,
      projectId,
      envelopeUrl: `${url.protocol}//${host}/api/${projectId}/envelope/`,
    };
  } catch {
    return null;
  }
}

const PARSED = parseDsn(DSN);

/** Captures an exception non-blocking. Safe to call even if Sentry is disabled. */
export async function captureException(
  err: unknown,
  context: SentryContext,
): Promise<void> {
  if (!PARSED) {
    console.error(`[${context.function}] error:`, err);
    return;
  }

  const eventId = crypto.randomUUID().replace(/-/g, '');
  const timestamp = new Date().toISOString();
  const error = err instanceof Error ? err : new Error(String(err));

  const event = {
    event_id: eventId,
    timestamp,
    level: 'error',
    logger: `edge.${context.function}`,
    release: context.release || RELEASE,
    environment: context.environment || ENV,
    platform: 'javascript',
    tags: { function: context.function, runtime: 'deno' },
    user: context.user,
    extra: context.extra,
    exception: {
      values: [
        {
          type: error.name,
          value: error.message,
          stacktrace: error.stack ? { frames: parseStack(error.stack) } : undefined,
        },
      ],
    },
  };

  const header = { event_id: eventId, sent_at: timestamp, dsn: DSN };
  const itemHeader = { type: 'event' };
  const envelope =
    JSON.stringify(header) + '\n' +
    JSON.stringify(itemHeader) + '\n' +
    JSON.stringify(event);

  try {
    await fetch(PARSED.envelopeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${PARSED.publicKey}, sentry_client=lovable-edge/1.0`,
      },
      body: envelope,
    });
  } catch (e) {
    console.error(`[sentry] failed to send event for ${context.function}:`, e);
  }
}

function parseStack(stack: string) {
  return stack
    .split('\n')
    .slice(1)
    .map((line) => {
      const m = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (m) {
        return { function: m[1], filename: m[2], lineno: parseInt(m[3]), colno: parseInt(m[4]) };
      }
      return { function: line.trim() };
    })
    .reverse();
}

/** Wraps a handler with Sentry error capture. */
export function withSentry<T extends (...args: any[]) => Promise<Response>>(
  functionName: string,
  handler: T,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (err) {
      await captureException(err, { function: functionName });
      throw err;
    }
  }) as T;
}
