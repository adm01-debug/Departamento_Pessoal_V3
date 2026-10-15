#!/usr/bin/env node
/**
 * W67 — deriva, sem hardcode, os arquivos de `supabase/migrations/*.sql`
 * que ainda não têm versão em `supabase_migrations.schema_migrations`.
 *
 * Não acessa o banco diretamente: recebe as versões já aplicadas (uma por
 * linha, coluna `version`) via --applied-versions <arquivo> ou stdin — o
 * chamador (o workflow `canonical-migrations.yml`) obtém essa lista via
 * `psql`, no mesmo padrão usado pelo resto do workflow para falar com o
 * banco canônico. Isto mantém este script puro e testável sem rede/DB.
 *
 * Distinto de `scripts/db/classify-migration-drift.mjs`, que é a
 * ferramenta forense do runbook de reconciliação de drift (consome um
 * `migration-list.json` com metadados de replay manual e não deve ser
 * reaproveitada aqui — teria mudado contrato de uma ferramenta já citada
 * em `infra/runbooks/RECONCILIACAO_DRIFT_MIGRATIONS.md`).
 *
 * Codex review (P1, PR #238): "ausente do ledger" NÃO é sinônimo de "seguro
 * para aplicar". Confirmado ao vivo (15/10/2026): o ledger canônico tem 428
 * versões, mas `supabase/migrations/` tem 749 arquivos reais -- ou seja,
 * ~321 arquivos ficariam marcados "pending" por esta comparação simples.
 * `infra/runbooks/RECONCILIACAO_DRIFT_MIGRATIONS.md` existe exatamente
 * porque essa diferença é DRIFT HISTÓRICO não reconciliado (DDL já
 * materializado por outro caminho, replay ainda vermelho em alguns pontos,
 * squash/baseline do Gate D ainda não aplicado) — a regra 3 do runbook
 * proíbe "executar... enquanto existir... replay vermelho ou diff físico
 * não explicado". Tratar esses ~321 arquivos como "pending" convidaria um
 * humano a copiar essa lista inteira para um dispatch mode=apply (que
 * EXIGE migration_files explícito, mas não valida seu conteúdo) e replicar
 * DDL histórico não-idempotente contra produção.
 *
 * Por isso este módulo falha fechado (process.exitCode = 1, não apenas
 * warning) quando `pending_count` excede DEFAULT_MAX_PENDING -- o caso de
 * uso real (um lote pequeno de migrations novas desde o último dispatch)
 * nunca deveria passar de poucas dezenas. Acima disso, é reconciliação de
 * drift histórico, não "migrations novas", e precisa do processo do
 * runbook (classify-migration-drift.mjs + revisão humana), não de
 * auto-detecção.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Ver nota "Codex review (P1, PR #238)" no cabeçalho — acima disso é drift
// histórico a reconciliar via runbook, não um lote normal de migrations novas.
export const DEFAULT_MAX_PENDING = 20;

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Argumento inválido: ${key ?? '(ausente)'}`);
    }
    args.set(key.slice(2), value);
  }
  return args;
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

export function derivePendingMigrations({ migrationsDir, appliedVersionsRaw }) {
  const appliedVersions = new Set(
    appliedVersionsRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  );

  // Migrações reais, nunca os sidecars de verificação do W69
  // (`<versão>.verify.sql`), que não representam DDL a aplicar.
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql') && !file.endsWith('.verify.sql'))
    .sort();

  const versionsSeen = new Set();
  const duplicates = [];
  const pending = [];

  for (const file of files) {
    const version = file.split('_', 1)[0];
    if (versionsSeen.has(version)) duplicates.push(file);
    versionsSeen.add(version);
    if (!appliedVersions.has(version)) pending.push(file);
  }

  return {
    migrations_directory: migrationsDir,
    applied_versions_count: appliedVersions.size,
    local_files_count: files.length,
    duplicate_version_files: duplicates,
    pending_count: pending.length,
    pending_files: pending,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const migrationsDir = resolve(args.get('migrations-dir') ?? 'supabase/migrations');
  const appliedPath = args.get('applied-versions');
  const appliedVersionsRaw = appliedPath ? readFileSync(resolve(appliedPath), 'utf8') : readStdin();
  const maxPending = Number(args.get('max-pending') ?? DEFAULT_MAX_PENDING);

  const result = derivePendingMigrations({ migrationsDir, appliedVersionsRaw });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.duplicate_version_files.length > 0) {
    process.stderr.write(
      `::warning::Versões duplicadas em supabase/migrations: ${result.duplicate_version_files.join(', ')}\n`,
    );
  }
  if (result.pending_count > maxPending) {
    process.stderr.write(
      `::error::${result.pending_count} arquivo(s) ausentes do ledger -- acima do limite de ` +
        `${maxPending} para auto-detecção seguro de "migrations novas". Isto é DRIFT HISTÓRICO, ` +
        `não um lote normal; siga infra/runbooks/RECONCILIACAO_DRIFT_MIGRATIONS.md ` +
        `(classify-migration-drift.mjs + revisão humana) antes de informar migration_files ` +
        `explicitamente. Rodar com --max-pending maior só depois dessa revisão.\n`,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === `file://${resolve(process.argv[1])}`) {
  main();
}
