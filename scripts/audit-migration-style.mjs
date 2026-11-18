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

// Duas portas de RLS permissiva, derivadas de uma migration real que ficou fora
// da `main` justamente por reabrir isto (docs/auditoria/sql-preservado/README.md):
//
//   USING (empresa_id = user_empresa_id() OR empresa_id IS NULL
//          OR auth.jwt() ->> 'role' IN ('admin','super_admin'))
//
// 1. `empresa_id IS NULL` numa policy libera toda linha de tenant nulo para
//    QUALQUER usuário autenticado de QUALQUER empresa — uma linha basta para
//    vazar entre inquilinos. A `main` exige `empresa_id IS NOT NULL`.
// 2. Autorização lida de `auth.jwt()` é payload de token, não fonte de verdade
//    do servidor. A `main` decide por `public.is_admin(auth.uid())` /
//    `rls_tenant_or_admin()`, e tem invariantes de banco exigindo isso.
const POLICY_NULL_TENANT_RE = /\bempresa_id\s+IS\s+NULL\b/i;
const POLICY_JWT_AUTHZ_RE = /\bauth\s*\.\s*jwt\s*\(\s*\)/i;
const CREATE_POLICY_RE = /^\s*CREATE\s+POLICY\s+"?([A-Za-z0-9_]+)"?/i;

/** Remove comentários e literais para que a detecção olhe só o código: um
 *  `COMMENT ON ... IS '... empresa_id IS NULL ...'` não é uma policy. */
function stripSqlNoise(sql) {
  return sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\/|'(?:[^']|'')*'/g, (t) => (t[0] === "'" ? "''" : ''));
}

/** Escape hatch explícito: a anotação tem de citar o nome da policy. */
function temAnotacaoPara(rawContent, tipo, policyName) {
  const re = new RegExp(`^\\s*--\\s*audit-migration-style:\\s*${tipo}\\b.*\\b${escapeRegex(policyName)}\\b`, 'im');
  return re.test(rawContent);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasFailClosedGuardFor(contentWithoutDropLine, policyName, tableName) {
  if (!/pg_policies/i.test(contentWithoutDropLine) || !/RAISE\s+EXCEPTION/i.test(contentWithoutDropLine)) {
    return false;
  }
  const policyRe = new RegExp(`['"\`]${escapeRegex(policyName)}['"\`]`, 'i');
  const tableRe = new RegExp(`['"\`]${escapeRegex(tableName)}['"\`]`, 'i');
  return policyRe.test(contentWithoutDropLine) || tableRe.test(contentWithoutDropLine);
}

let entries;
try {
  entries = await readdir(migrationsDir);
} catch (err) {
  console.error(`❌ audit-migration-style: diretório de migrations não encontrado: ${migrationsDir}`);
  console.error(`   ${String(err.message || err)}`);
  process.exit(1);
}

const migrationFiles = entries
  .filter((name) => /^\d{14}_.+\.sql$/.test(name))
  .filter((name) => name.split('_')[0] >= CUTOFF_VERSION)
  .sort();

// Guard de falso verde: o corte é histórico, então 0 migrations avaliadas
// significa diretório esvaziado ou padrão de nome quebrado -- não "tudo limpo".
if (migrationFiles.length === 0) {
  console.error(
    `❌ audit-migration-style: nenhuma migration >= ${CUTOFF_VERSION} em ${migrationsDir} — nada foi avaliado.`
  );
  process.exit(1);
}

let failures = 0;
// Conta arquivos que possuem algum DROP POLICY IF EXISTS (guardado ou não),
// para o relatório mostrar o escopo real da varredura.
let filesWithAnyDrop = 0;

for (const fileName of migrationFiles) {
  const path = resolve(migrationsDir, fileName);
  const content = await readFile(path, 'utf8');
  const lines = content.split('\n');

  const hasAnyDrop = lines.some((line) => DROP_POLICY_RE.test(line));
  if (hasAnyDrop) filesWithAnyDrop += 1;

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
    `\n${failures} migration(s) nova(s) com DROP POLICY IF EXISTS solto ` +
      `(de ${filesWithAnyDrop} com DROP, ${migrationFiles.length} migrations avaliadas desde ${CUTOFF_VERSION}).`
  );
  process.exit(1);
}

// ── Segunda passada: policy permissiva (tenant nulo / authz por JWT) ─────────
let rlsFailures = 0;
let policiesAvaliadas = 0;

for (const fileName of migrationFiles) {
  const raw = await readFile(resolve(migrationsDir, fileName), 'utf8');
  const rawLines = raw.split('\n');
  // Split por `;`: o corpo de uma policy quebra em várias linhas, então a
  // detecção tem de olhar o STATEMENT inteiro, não linha a linha.
  const statements = stripSqlNoise(raw).split(';');
  const violacoes = [];

  for (const stmt of statements) {
    const match = CREATE_POLICY_RE.exec(stmt);
    if (!match) continue;
    policiesAvaliadas += 1;
    const policyName = match[1];
    const lineNo = rawLines.findIndex((l) => CREATE_POLICY_RE.test(l) && l.includes(policyName)) + 1;

    if (POLICY_NULL_TENANT_RE.test(stmt) && !temAnotacaoPara(raw, 'allow-null-tenant', policyName)) {
      violacoes.push({
        policyName,
        lineNo,
        tipo: 'allow-null-tenant',
        porque: '`empresa_id IS NULL` libera linhas de tenant nulo para qualquer empresa',
      });
    }
    if (POLICY_JWT_AUTHZ_RE.test(stmt) && !temAnotacaoPara(raw, 'allow-jwt-authz', policyName)) {
      violacoes.push({
        policyName,
        lineNo,
        tipo: 'allow-jwt-authz',
        porque: 'autorização vinda de `auth.jwt()` em vez de is_admin(auth.uid()) / rls_tenant_or_admin()',
      });
    }
  }

  if (violacoes.length === 0) continue;
  rlsFailures += 1;
  console.error(`❌ ${fileName}`);
  for (const v of violacoes) {
    console.error(`   linha ${v.lineNo} — policy "${v.policyName}": ${v.porque}`);
    console.error(`   Se for intencional: "-- audit-migration-style: ${v.tipo} <motivo> ${v.policyName}".`);
  }
}

if (rlsFailures > 0) {
  console.error(
    `\n${rlsFailures} migration(s) nova(s) com policy permissiva ` +
      `(de ${policiesAvaliadas} CREATE POLICY avaliadas desde ${CUTOFF_VERSION}).`
  );
  process.exit(1);
}

console.log(
  `✅ audit-migration-style: ${migrationFiles.length} migration(s) desde ${CUTOFF_VERSION} sem DROP POLICY solto, ${policiesAvaliadas} policy(s) sem tenant nulo nem authz por JWT` +
    (filesWithAnyDrop > 0 ? ` (${filesWithAnyDrop} com DROP guardado OK)` : '') +
    '.'
);
