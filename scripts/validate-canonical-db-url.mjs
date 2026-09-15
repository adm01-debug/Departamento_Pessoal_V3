import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const CANONICAL_PROJECT_REF = 'frjbfeamybqsejlvmqbl';

export function validateCanonicalDbUrl(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('SUPABASE_DB_URL ausente');

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('SUPABASE_DB_URL não é uma URI válida');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('SUPABASE_DB_URL deve usar postgresql://');
  }
  if (!url.password) throw new Error('SUPABASE_DB_URL não contém senha');
  if (url.pathname !== '/postgres') throw new Error('SUPABASE_DB_URL deve apontar para o database postgres');
  const sslmode = url.searchParams.get('sslmode');
  if (!['require', 'verify-ca', 'verify-full'].includes(sslmode ?? '')) {
    throw new Error('SUPABASE_DB_URL deve exigir TLS com sslmode=require, verify-ca ou verify-full');
  }

  const directHost = `db.${CANONICAL_PROJECT_REF}.supabase.co`;
  const isDirect = url.hostname === directHost && url.username === 'postgres';
  const isPooler = url.hostname.endsWith('.pooler.supabase.com') &&
    url.username === `postgres.${CANONICAL_PROJECT_REF}`;
  if (!isDirect && !isPooler) {
    throw new Error('SUPABASE_DB_URL não pertence ao projeto canônico');
  }

  const safeTarget = `${isDirect ? 'direct' : 'pooler'}:${url.hostname}:${url.port || '5432'}:${url.pathname}`;
  return {
    projectRef: CANONICAL_PROJECT_REF,
    connectionKind: isDirect ? 'direct' : 'pooler',
    hostFingerprint: createHash('sha256').update(safeTarget).digest('hex').slice(0, 16),
    tls: sslmode,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = validateCanonicalDbUrl(process.env.SUPABASE_DB_URL);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
