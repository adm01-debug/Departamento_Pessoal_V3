#!/usr/bin/env node

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';

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

function csv(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function validTimestamp(version) {
  if (!/^\d{14}$/.test(version)) return false;
  const year = Number(version.slice(0, 4));
  const month = Number(version.slice(4, 6));
  const day = Number(version.slice(6, 8));
  const hour = Number(version.slice(8, 10));
  const minute = Number(version.slice(10, 12));
  const second = Number(version.slice(12, 14));
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const migrationsDir = resolve(args.get('migrations') ?? 'supabase/migrations');
  const ledgerPath = resolve(args.get('ledger-json') ?? 'migration-list.json');
  const lastSuccessfulOrdinal = Number(args.get('last-successful-ordinal') ?? '0');
  const failedFile = args.get('failed-file') ?? '';
  const outputPath = resolve(args.get('output') ?? 'migration-classification.csv');
  const summaryPath = resolve(args.get('summary') ?? 'migration-classification.summary.json');

  const ledgerDocument = JSON.parse(readFileSync(ledgerPath, 'utf8'));
  const ledgerRows = Array.isArray(ledgerDocument)
    ? ledgerDocument
    : ledgerDocument.migrations ?? [];
  const remoteVersions = new Set(
    ledgerRows.map((row) => String(row.remote ?? '')).filter(Boolean),
  );

  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  const versionCounts = new Map();
  for (const file of files) {
    const version = file.split('_', 1)[0];
    versionCounts.set(version, (versionCounts.get(version) ?? 0) + 1);
  }

  const rows = [];
  const matchedRemoteVersions = new Set();

  files.forEach((file, index) => {
    const ordinal = index + 1;
    const version = file.split('_', 1)[0];
    const duplicateCount = versionCounts.get(version) ?? 1;
    const inLedger = remoteVersions.has(version);
    if (inLedger) matchedRemoteVersions.add(version);

    let classification;
    let replayStatus;
    let evidence;

    if (inLedger) {
      classification = 'ja_aplicada';
      replayStatus = ordinal <= lastSuccessfulOrdinal ? 'replay_ok' : 'nao_alcancada';
      evidence = 'versao_exata_presente_no_ledger_remoto';
    } else if (file === failedFile) {
      classification = 'obsoleta';
      replayStatus = 'falhou';
      evidence = 'falha_SQLSTATE_42703_coluna_bytes_sent_inexistente';
    } else if (duplicateCount > 1) {
      classification = 'parcial';
      replayStatus = ordinal <= lastSuccessfulOrdinal ? 'replay_ok' : 'nao_alcancada';
      evidence = 'versao_duplicada_impede_rastreabilidade_por_arquivo';
    } else if (ordinal <= lastSuccessfulOrdinal) {
      classification = 'parcial';
      replayStatus = 'replay_ok';
      evidence = 'replay_ok_mas_ausente_do_ledger_e_schema_final_divergente';
    } else {
      classification = 'ausente';
      replayStatus = 'nao_alcancada';
      evidence = 'ausente_do_ledger_e_nao_executada_apos_primeira_falha';
    }

    rows.push({
      scope: 'arquivo_local',
      ordinal,
      version,
      file,
      validTimestamp: validTimestamp(version),
      duplicateCount,
      ledgerStatus: inLedger ? 'applied' : 'missing',
      replayStatus,
      classification,
      evidence,
    });
  });

  for (const version of [...remoteVersions].sort()) {
    if (matchedRemoteVersions.has(version)) continue;
    rows.push({
      scope: 'ledger_remoto',
      ordinal: '',
      version,
      file: '',
      validTimestamp: validTimestamp(version),
      duplicateCount: 0,
      ledgerStatus: 'source_missing',
      replayStatus: 'nao_aplicavel',
      classification: 'parcial',
      evidence: 'versao_remota_aplicada_sem_arquivo_correspondente_no_repositorio',
    });
  }

  const headers = [
    'scope',
    'ordinal',
    'version',
    'file',
    'valid_timestamp',
    'duplicate_count',
    'ledger_status',
    'replay_status',
    'classification',
    'evidence',
  ];
  const csvRows = rows.map((row) =>
    [
      row.scope,
      row.ordinal,
      row.version,
      row.file,
      row.validTimestamp,
      row.duplicateCount,
      row.ledgerStatus,
      row.replayStatus,
      row.classification,
      row.evidence,
    ]
      .map(csv)
      .join(','),
  );
  writeFileSync(outputPath, `${headers.map(csv).join(',')}\n${csvRows.join('\n')}\n`);

  const countBy = (field) =>
    Object.fromEntries(
      [...new Set(rows.map((row) => row[field]))]
        .sort()
        .map((value) => [value, rows.filter((row) => row[field] === value).length]),
    );
  const summary = {
    generated_at: new Date().toISOString(),
    migrations_directory: relative(process.cwd(), migrationsDir) || '.',
    local_files: files.length,
    remote_versions: remoteVersions.size,
    exact_version_intersection: matchedRemoteVersions.size,
    remote_only_versions: remoteVersions.size - matchedRemoteVersions.size,
    duplicate_versions: [...versionCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([version, count]) => ({ version, count })),
    invalid_timestamp_files: rows.filter(
      (row) => row.scope === 'arquivo_local' && !row.validTimestamp,
    ).length,
    last_successful_ordinal: lastSuccessfulOrdinal,
    first_failed_file: basename(failedFile),
    classification_counts: countBy('classification'),
    ledger_status_counts: countBy('ledgerStatus'),
    replay_status_counts: countBy('replayStatus'),
    caveat:
      'Classificacao operacional conservadora. "parcial" indica que o arquivo ' +
      'foi replayavel, mas nao possui prova individual no ledger e o inventario ' +
      'fisico final diverge. Nao equivale a afirmar que todo DDL do arquivo esta vivo.',
  };
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        output: outputPath,
        summary: summaryPath,
        rows: rows.length,
        ...summary.classification_counts,
      },
      null,
      2,
    ),
  );
}

main();
