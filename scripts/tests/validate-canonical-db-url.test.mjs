import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANONICAL_PROJECT_REF, validateCanonicalDbUrl } from '../validate-canonical-db-url.mjs';

const validDirect = validateCanonicalDbUrl(
  `postgresql://postgres:encoded%40password@db.${CANONICAL_PROJECT_REF}.supabase.co:5432/postgres?sslmode=require`,
);
assert.equal(validDirect.connectionKind, 'direct');
assert.equal(validDirect.tls, 'require');

const validPooler = validateCanonicalDbUrl(
  `postgresql://postgres.${CANONICAL_PROJECT_REF}:encoded%40password@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require`,
);
assert.equal(validPooler.connectionKind, 'pooler');
assert.match(validPooler.hostFingerprint, /^[a-f0-9]{16}$/);

// Parâmetros que não redirecionam a conexão continuam aceitos.
assert.equal(
  validateCanonicalDbUrl(
    `postgresql://postgres:secret@db.${CANONICAL_PROJECT_REF}.supabase.co:5432/postgres?sslmode=verify-full&connect_timeout=10&application_name=ci`,
  ).tls,
  'verify-full',
);

for (const [label, value] of [
  ['missing', ''],
  ['wrong protocol', 'https://example.test'],
  ['wrong direct ref', 'postgresql://postgres:secret@db.wrong.supabase.co:5432/postgres?sslmode=require'],
  ['wrong pooler user', 'postgresql://postgres.wrong:secret@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require'],
  ['no password', `postgresql://postgres@db.${CANONICAL_PROJECT_REF}.supabase.co:5432/postgres?sslmode=require`],
  ['wrong database', `postgresql://postgres:secret@db.${CANONICAL_PROJECT_REF}.supabase.co:5432/other?sslmode=require`],
  ['TLS disabled', `postgresql://postgres:secret@db.${CANONICAL_PROJECT_REF}.supabase.co:5432/postgres?sslmode=disable`],
  ['TLS omitted', `postgresql://postgres:secret@db.${CANONICAL_PROJECT_REF}.supabase.co:5432/postgres`],
  ['TLS allow downgrade', `postgresql://postgres:secret@db.${CANONICAL_PROJECT_REF}.supabase.co:5432/postgres?sslmode=allow`],
  ['TLS prefer downgrade', `postgresql://postgres:secret@db.${CANONICAL_PROJECT_REF}.supabase.co:5432/postgres?sslmode=prefer`],
  // Regressão: o libpq honra estes parâmetros da query por cima da autoridade validada.
  ['sslmode repetido (libpq usa o último)', `postgresql://postgres:secret@db.${CANONICAL_PROJECT_REF}.supabase.co:5432/postgres?sslmode=require&sslmode=disable`],
  ['host na query', `postgresql://postgres:secret@db.${CANONICAL_PROJECT_REF}.supabase.co:5432/postgres?sslmode=require&host=evil.example`],
  ['hostaddr na query', `postgresql://postgres:secret@db.${CANONICAL_PROJECT_REF}.supabase.co:5432/postgres?sslmode=require&hostaddr=203.0.113.9`],
  ['host percent-encoded na query', `postgresql://postgres:secret@db.${CANONICAL_PROJECT_REF}.supabase.co:5432/postgres?sslmode=require&%68ost=evil.example`],
  ['dbname na query', `postgresql://postgres:secret@db.${CANONICAL_PROJECT_REF}.supabase.co:5432/postgres?sslmode=require&dbname=other`],
  ['user na query (pooler)', `postgresql://postgres.${CANONICAL_PROJECT_REF}:secret@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require&user=postgres.wrong`],
]) {
  assert.throws(() => validateCanonicalDbUrl(value), undefined, label);
}

// Regressão: invocado por um caminho com symlink, o CLI saía com 0 sem validar nada.
const linkDir = mkdtempSync(join(tmpdir(), 'canonical-db-url-'));
try {
  const link = join(linkDir, 'validate.mjs');
  symlinkSync(fileURLToPath(new URL('../validate-canonical-db-url.mjs', import.meta.url)), link);
  const viaSymlink = spawnSync(process.execPath, [link], {
    env: { ...process.env, SUPABASE_DB_URL: 'https://example.test' },
    encoding: 'utf8',
  });
  assert.equal(viaSymlink.status, 1, 'CLI via symlink deve reprovar URL inválida');
} finally {
  rmSync(linkDir, { recursive: true, force: true });
}

console.log('CANONICAL_DB_URL_VALIDATOR_OK: direct/pooler accepted; wrong ref, credential shape, database and TLS rejected.');
