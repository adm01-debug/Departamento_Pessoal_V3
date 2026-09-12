import assert from 'node:assert/strict';
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
]) {
  assert.throws(() => validateCanonicalDbUrl(value), undefined, label);
}

console.log('CANONICAL_DB_URL_VALIDATOR_OK: direct/pooler accepted; wrong ref, credential shape, database and TLS rejected.');
