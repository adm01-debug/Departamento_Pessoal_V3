#!/usr/bin/env node

/**
 * Gate estático (sem DATABASE_URL): reprova migration nova com
 * `DROP POLICY IF EXISTS` solto -- sem verificação fail-closed no mesmo
 * arquivo e sem exceção anotada e revisada.
 *
 * O INCIDENTE QUE MOTIVOU ESTE GATE (A-036, E50-12)
 * `DROP POLICY IF EXISTS "nome"` é silencioso por natureza: se o nome não
 * bater exatamente (acento, cedilha, espaço), o Postgres não dropa nada e
 * não avisa nada. O lote de migrations de 19-31/07/2026 fez exatamente
 * isso -- passou no CI, ficou meses no repositório parecendo aplicado,
 * enquanto a policy antiga e insegura continuava viva em produção ao lado
 * da nova (policies PERMISSIVE se combinam por OU: a nova não protege
 * enquanto a antiga continuar lá).
 *
 * O QUE É EXIGIDO
 * Toda ocorrência de `DROP POLICY IF EXISTS` numa migration NOVA (versão >=
 * CUTOFF_VERSION -- não reprova retroativamente o histórico já aplicado)
 * precisa de uma das duas coisas:
 *   1. Verificação fail-closed no mesmo arquivo: o arquivo consulta
 *      `pg_policies` E usa `RAISE EXCEPTION` (padrão do supabase/migrations/
 *      _template.sql) -- heurística de arquivo inteiro, não pareamento
 *      exato por policy, deliberadamente simples para não travar em falso
 *      positivo de formatação.
 *   2. Exceção anotada imediatamente acima da linha do DROP:
 *      `-- audit-migration-style: allow-silent-drop <motivo>`
 *
 * O QUE NÃO É AVALIADO
 * - `DROP POLICY` sem `IF EXISTS` (falha alto e claro sozinho, sem gate).
 * - Migrations já aplicadas antes deste gate existir -- CUTOFF_VERSION.
 *
 * Saída: 0 limpo, 1 com migration nova reprovada.
 */
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const migrationsDir = resolve(import.meta.dirname, '../supabase/migrations');

// Migrations com versão >= este timestamp são "novas" para este gate --
// tudo antes já foi aplicado e não é reavaliado retroativamente.
const CUTOFF_VERSION = '20260924300000';

const DROP_POLICY_RE = /^\s*DROP\s+POLICY\s+IF\s+EXISTS\s+"?([A-Za-z0-9_]+)"?\s+ON\s+/i;
const ALLOW_ANNOTATION_RE = /^\s*--\s*audit-migration-style:\s*allow-silent-drop\b/i;

function hasFailClosedGuard(content) {
  return /pg_policies/i.test(content) && /RAISE\s+EXCEPTION/i.test(content);
}

const entries = await readdir(migrationsDir);
const migrationFiles = entries
  .filter((name) => /^\d{14}_.+\.sql$/.test(name))
  .filter((name) => name.split('_')[0] >= CUTOFF_VERSION)
  .sort();

let failures = 0;
let checkedFiles = 0;

for (const fileName of migrationFiles) {
  const path = resolve(migrationsDir, fileName);
  const content = await readFile(path, 'utf8');
  const lines = content.split('\n');

  const unguardedDrops = [];
  lines.forEach((line, i) => {
    if (!DROP_POLICY_RE.test(line)) return;
    const prevLine = lines[i - 1] ?? '';
    if (ALLOW_ANNOTATION_RE.test(prevLine)) return;
    unguardedDrops.push({ lineNo: i + 1, text: line.trim() });
  });

  if (unguardedDrops.length === 0) continue;
  checkedFiles += 1;

  if (hasFailClosedGuard(content)) continue;

  failures += 1;
  console.error(`❌ ${fileName}`);
  for (const drop of unguardedDrops) {
    console.error(`   linha ${drop.lineNo}: ${drop.text}`);
  }
  console.error(
    '   DROP POLICY IF EXISTS sem verificação fail-closed (pg_policies + RAISE EXCEPTION, ver ' +
    'supabase/migrations/_template.sql) e sem "-- audit-migration-style: allow-silent-drop <motivo>" ' +
    'na linha imediatamente acima.'
  );
}

if (failures > 0) {
  console.error(
    `\n${failures} migration(s) nova(s) com DROP POLICY IF EXISTS solto (de ${checkedFiles} com DROP encontrado, ` +
    `${migrationFiles.length} migrations avaliadas desde ${CUTOFF_VERSION}).`
  );
  process.exit(1);
}

console.log(
  `✅ audit-migration-style: ${migrationFiles.length} migration(s) desde ${CUTOFF_VERSION} sem DROP POLICY solto.`
);
