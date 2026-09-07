#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(process.argv[2] ?? '/tmp/20260831000000_rebaseline_canonico.sql');
const publicDumpPath = resolve(root, 'supabase/rebaseline/20260831_corrected_public.sql');
const storagePath = resolve(root, 'supabase/rebaseline/20260831_storage_remediation.sql');

const publicDump = await readFile(publicDumpPath, 'utf8');
const storage = await readFile(storagePath, 'utf8');

const sanitizedDump = publicDump
  .split('\n')
  .filter((line) => !/^\\(?:un)?restrict\b/.test(line))
  .filter((line) => line !== 'CREATE SCHEMA "public";')
  // A role postgres usada pelo runner oficial não pode alterar os defaults da
  // role gerenciada supabase_admin. Esses defaults já vêm do bootstrap da
  // plataforma e não pertencem ao schema da aplicação.
  .filter((line) => !/^ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin"\s/.test(line))
  .join('\n')
  .trim();

const prelude = `-- Baseline canônica única do Departamento Pessoal V3.
-- Gerada de um restore físico do projeto frjbfeamybqsejlvmqbl, corrigido e
-- validado localmente. Não contém dados, usuários, sessões ou objetos Storage.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dp_mcp_role') THEN
    CREATE ROLE dp_mcp_role;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dp_mcp_user') THEN
    CREATE ROLE dp_mcp_user;
  END IF;
END
$roles$;

ALTER ROLE dp_mcp_role WITH NOINHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOBYPASSRLS;
ALTER ROLE dp_mcp_user WITH INHERIT NOCREATEROLE NOCREATEDB LOGIN NOBYPASSRLS CONNECTION LIMIT 5;
GRANT dp_mcp_role TO dp_mcp_user WITH INHERIT TRUE;

ALTER ROLE anon SET statement_timeout TO '3s';
ALTER ROLE authenticated SET statement_timeout TO '8s';
ALTER ROLE authenticator SET statement_timeout TO '8s';

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pgsodium;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgaudit WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- O bootstrap local/hosted pode conceder privilégios de tabela distintos
-- por versão. Zeramos o papel anon antes de criar as tabelas; os GRANTs
-- explícitos do dump restauram exatamente a superfície canônica. Sem isso,
-- anon herdava TRUNCATE/REFERENCES em todas as tabelas no teste limpo.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;
`;

const cron = `-- Jobs canônicos de auditoria e retenção.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN (
  'sec-audit-policies-daily',
  'sec-policy-regressions-purge',
  'sec-verify-seals-weekly'
);

SELECT cron.schedule(
  'sec-audit-policies-daily',
  '0 4 * * *',
  $cron$SELECT public.sec_audit_policies_scan();$cron$
);

SELECT cron.schedule(
  'sec-policy-regressions-purge',
  '30 4 * * 0',
  $cron$SELECT public.sec_policy_regressions_purge();$cron$
);

SELECT cron.schedule(
  'sec-verify-seals-weekly',
  '15 3 * * 1',
  $cron$SELECT public.sec_verify_seals_scan();$cron$
);
`;

const result = `${prelude}\n\n${sanitizedDump}\n\n${storage.trim()}\n\n${cron}`;

if (/^\\(?:un)?restrict\b/m.test(result)) {
  throw new Error('A migração não pode conter metacomandos exclusivos do psql.');
}
if (/^COPY\s|^INSERT INTO auth\.|^INSERT INTO public\./m.test(result)) {
  throw new Error('A migração squash não pode conter dados de Auth ou negócio.');
}
if (/CREATE SCHEMA "public";/.test(result)) {
  throw new Error('A migração não pode recriar o schema public gerenciado.');
}

await writeFile(output, result, { mode: 0o600 });
console.log(output);
