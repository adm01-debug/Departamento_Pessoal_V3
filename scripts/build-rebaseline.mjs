#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(process.argv[2] ?? '/tmp/20260831000000_rebaseline_canonico.sql');
const publicDumpPath = resolve(root, 'supabase/rebaseline/20260831_corrected_public.sql');
// Estas correÃ§Ãµes nÃ£o pertencem ao histÃ³rico de migrations ativo: elas sÃ£o
// aplicadas SOBRE o snapshot fÃ­sico antes de ele virar a baseline Ãºnica.
// A ordem Ã© deliberada: primeiro helpers de autorizaÃ§Ã£o, depois policies e
// funÃ§Ãµes que os consomem, e sÃ³ entÃ£o views e Storage.
const remediationPaths = [
  'supabase/rebaseline/20260831_security_remediation.sql',
  'supabase/rebaseline/20260902_rls_tenant_tautology_remediation.sql',
  'supabase/rebaseline/20260902_secdef_authz_remediation.sql',
  'supabase/rebaseline/20260902_view_security_invoker_remediation.sql',
].map((path) => resolve(root, path));
const storagePath = resolve(root, 'supabase/rebaseline/20260831_storage_remediation.sql');

let publicDump, remediations, storage;
try {
  publicDump = (await readFile(publicDumpPath, 'utf8')).replace(/\r\n/g, '\n');
  remediations = await Promise.all(remediationPaths.map((path) => readFile(path, 'utf8')));
  storage = await readFile(storagePath, 'utf8');
} catch (err) {
  process.stderr.write(`âŒ build-rebaseline: arquivo de entrada ausente â€” ${err.message}\n`);
  process.exit(1);
}

const sanitizedDump = publicDump
  .split('\n')
  .filter((line) => !/^\\(?:un)?restrict\b/.test(line))
  .filter((line) => line !== 'CREATE SCHEMA "public";')
  // A role postgres usada pelo runner oficial nÃ£o pode alterar os defaults da
  // role gerenciada supabase_admin. Esses defaults jÃ¡ vÃªm do bootstrap da
  // plataforma e nÃ£o pertencem ao schema da aplicaÃ§Ã£o.
  .filter((line) => !/^ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin"\s/.test(line))
  .join('\n')
  .trim();

const prelude = `-- Baseline canÃ´nica Ãºnica do Departamento Pessoal V3.
-- Gerada de um restore fÃ­sico do projeto frjbfeamybqsejlvmqbl, corrigido e
-- validado localmente. NÃ£o contÃ©m dados, usuÃ¡rios, sessÃµes ou objetos Storage.

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

-- O bootstrap local/hosted pode conceder privilÃ©gios de tabela distintos
-- por versÃ£o. Zeramos o papel anon antes de criar as tabelas; os GRANTs
-- explÃ­citos do dump restauram exatamente a superfÃ­cie canÃ´nica. Sem isso,
-- anon herdava TRUNCATE/REFERENCES em todas as tabelas no teste limpo.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;
`;

const cron = `-- Jobs canÃ´nicos de auditoria e retenÃ§Ã£o.
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

const result = [prelude, sanitizedDump, ...remediations.map((content) => content.trim()), storage.trim(), cron].join(
  '\n\n'
);

// --- VerificaÃ§Ãµes de seguranÃ§a (ausÃªncia de padrÃµes proibidos) ---
if (/^\\(?:un)?restrict\b/m.test(result)) {
  throw new Error('A migraÃ§Ã£o nÃ£o pode conter metacomandos exclusivos do psql.');
}
// O dump usa identificadores entre aspas (CREATE SCHEMA "public"): dado vazado viria como INSERT INTO "public"."t".
if (/^COPY\s|^INSERT INTO "?(?:auth|public)"?\./im.test(result)) {
  throw new Error('A migraÃ§Ã£o squash nÃ£o pode conter dados de Auth ou negÃ³cio.');
}
if (/CREATE SCHEMA "public";/.test(result)) {
  throw new Error('A migraÃ§Ã£o nÃ£o pode recriar o schema public gerenciado.');
}

// --- VerificaÃ§Ãµes de conteÃºdo (presenÃ§a de estrutura mÃ­nima esperada) ---
// Um dump sem nenhum CREATE TABLE indica que o snapshot foi gerado incorretamente
// ou que o filtro de linhas removeu tudo â€” falso verde sem este check.
if (!/^CREATE TABLE\b/m.test(result)) {
  throw new Error('A migraÃ§Ã£o gerada nÃ£o contÃ©m nenhum CREATE TABLE â€” o dump pode estar vazio ou corrompido.');
}
// A baseline deve ao menos referenciar as roles de acesso controlado do projeto.
if (!result.includes('dp_mcp_role')) {
  throw new Error('A migraÃ§Ã£o gerada nÃ£o contÃ©m a role dp_mcp_role â€” o prelude nÃ£o foi incluÃ­do.');
}
// Tamanho mÃ­nimo: um dump real do schema pÃºblico tem dezenas de kB.
if (result.length < 50_000) {
  throw new Error(`A migraÃ§Ã£o gerada tem apenas ${result.length} bytes â€” esperado > 50 kB para um dump completo.`);
}

await writeFile(output, result, { mode: 0o600 });
console.log(output);
