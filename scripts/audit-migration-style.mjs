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
 *   1. Verificação fail-closed NO MESMO ARQUIVO **referenciando a mesma
 *      policy ou tabela** do DROP: o arquivo consulta `pg_policies` E usa
 *      `RAISE EXCEPTION` E cita, entre aspas, o nome da policy dropada ou
 *      o nome da tabela (padrão de supabase/migrations/_template.sql).
 *      Pareado por nome, não por arquivo inteiro -- ver nota de segurança
 *      abaixo.
 *   2. Exceção anotada imediatamente acima da linha do DROP:
 *      `-- audit-migration-style: allow-silent-drop <motivo>`
 *
 * NOTA DE SEGURANÇA (achado em auditoria adversarial, 24/09/2026)
 * A primeira versão deste gate checava `pg_policies`+`RAISE EXCEPTION` em
 * QUALQUER lugar do arquivo, sem parear com o DROP específico -- um DROP
 * POLICY IF EXISTS genuinamente solto passava despercebido bastando o
 * arquivo conter qualquer OUTRO bloco fail-closed não relacionado
 * (ex.: verificação de uma policy diferente, em outra tabela). Isso
 * reproduzia exatamente o padrão do incidente original (A-036) disfarçado.
 * Corrigido para exigir que o bloco de verificação cite o nome exato da
 * policy ou da tabela sendo dropada.
 *
 * O QUE NÃO É AVALIADO
 * - `DROP POLICY` sem `IF EXISTS` (falha alto e claro sozinho, sem gate).
 * - Migrations já aplicadas antes deste gate existir -- CUTOFF_VERSION.
 * - Pareamento por nome ainda não é 100% preciso: um bloco fail-closed que
 *   cite a TABELA certa mas verifique uma POLICY diferente na mesma tabela
 *   passaria. Combater isso exigiria parsear o SQL de verdade; heurística
 *   por nome já fecha o bypass encontrado sem esse custo.
 *
 * Saída: 0 limpo, 1 com migration nova reprovada.
 */
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const migrationsDir = resolve(import.meta.dirname, '../supabase/migrations');

// Migrations com versão >= este timestamp são "novas" para este gate --
// tudo antes já foi aplicado e não é reavaliado retroativamente.
const CUTOFF_VERSION = '20260924300000';

const DROP_POLICY_RE =
  /^\s*DROP\s+POLICY\s+IF\s+EXISTS\s+"?([A-Za-z0-9_]+)"?\s+ON\s+(?:"?[A-Za-z0-9_]+"?\.)?"?([A-Za-z0-9_]+)"?/i;
const ALLOW_ANNOTATION_RE = /^\s*--\s*audit-migration-style:\s*allow-silent-drop\b/i;

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasFailClosedGuardFor(contentWithoutDropLine, policyName, tableName) {
  if (!/pg_policies/i.test(contentWithoutDropLine) || !/RAISE\s+EXCEPTION/i.test(contentWithoutDropLine)) {
    return false;
  }
  const policyRe = new RegExp(`['"]${escapeRegex(policyName)}['"]`, 'i');
  const tableRe = new RegExp(`['"]${escapeRegex(tableName)}['"]`, 'i');
  return policyRe.test(contentWithoutDropLine) || tableRe.test(contentWithoutDropLine);
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
    const match = DROP_POLICY_RE.exec(line);
    if (!match) return;
    const prevLine = lines[i - 1] ?? '';
    if (ALLOW_ANNOTATION_RE.test(prevLine)) return;
    const [, policyName, tableName] = match;
    // Exclui a própria linha do DROP da busca -- ela sempre contém o nome
    // da policy entre aspas (é o que está sendo dropado), então buscar no
    // conteúdo inteiro sem excluir essa linha faria a checagem "achar" o
    // nome ali mesmo, sem exigir nenhuma verificação de fato separada.
    const contentWithoutThisDrop = lines.filter((_, idx) => idx !== i).join('\n');
    if (hasFailClosedGuardFor(contentWithoutThisDrop, policyName, tableName)) return;
    unguardedDrops.push({ lineNo: i + 1, text: line.trim(), policyName, tableName });
  });

  if (unguardedDrops.length === 0) continue;
  checkedFiles += 1;
  failures += 1;
  console.error(`❌ ${fileName}`);
  for (const drop of unguardedDrops) {
    console.error(`   linha ${drop.lineNo}: ${drop.text}`);
  }
  console.error(
    '   DROP POLICY IF EXISTS sem verificação fail-closed que cite a policy ou tabela (pg_policies + ' +
    'RAISE EXCEPTION + nome entre aspas, ver supabase/migrations/_template.sql) e sem ' +
    '"-- audit-migration-style: allow-silent-drop <motivo>" na linha imediatamente acima.'
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
