#!/usr/bin/env node
/**
 * Smoke test dos selos de integridade (`enforce_*_hash`).
 *
 * Esses gatilhos calculam o hash SHA-256 que sela registros de folha de
 * pagamento, ponto, férias, rescisões, ASO, EPI, CAT, eSocial e medidas
 * disciplinares. Se um deles parar de funcionar, o sistema não avisa: ou a
 * gravação falha em produção (indisponibilidade), ou — pior — o registro é
 * salvo sem selo e a cadeia de custódia se perde silenciosamente.
 *
 * O teste NÃO grava dados de negócio. Ele valida as três formas conhecidas de
 * o selo deixar de valer:
 *
 *   1. Gatilho órfão — a função existe mas não está acoplada a nenhuma tabela.
 *      Nesse caso nenhum registro é selado e nada acusa o problema.
 *   2. Momento errado — o gatilho precisa ser BEFORE INSERT/UPDATE. Um AFTER
 *      não consegue alterar NEW e o hash nunca chega ao disco.
 *   3. Dependência irresolúvel — o corpo chama `digest()` do pgcrypto, que
 *      vive no schema `extensions`. Se o search_path fixado da função não o
 *      incluir, a chamada só falha na execução (incidente de 28/07/2026).
 *
 * O item 3 é verificado executando de fato a expressão de hash sob exatamente
 * o mesmo `search_path` declarado na função — a única prova real de resolução.
 */

import { execFileSync } from 'node:child_process';

function hasDatabase() {
  return Boolean(process.env.PGHOST || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL);
}

function psql(sql) {
  const args = ['-Atq', '-c', sql];
  const conn = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!process.env.PGHOST && conn) args.unshift(conn);
  return execFileSync('psql', args, { encoding: 'utf8' }).trim();
}

const INVENTORY_SQL = `
SELECT p.proname
       || E'\t' || coalesce(string_agg(DISTINCT c.relname, ','), '')
       || E'\t' || coalesce(bool_or((t.tgtype & 2) = 2 AND (t.tgtype & 28) > 0)::text, 'false')
       || E'\t' || coalesce(array_to_string(p.proconfig, ','), '')
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
LEFT JOIN pg_trigger t ON t.tgfoid = p.oid AND NOT t.tgisinternal
LEFT JOIN pg_class c ON c.oid = t.tgrelid
WHERE p.proname LIKE 'enforce\\_%\\_hash'
GROUP BY p.proname, p.proconfig
ORDER BY p.proname;
`;

function searchPathOf(config) {
  const match = /search_path=([^,]*(?:,[^,=]*)*)/.exec(config || '');
  return match ? match[1] : null;
}

function main() {
  if (!hasDatabase()) {
    console.warn('[selos] Banco indisponível neste ambiente — smoke test ignorado.');
    return 0;
  }

  let raw;
  try {
    raw = psql(INVENTORY_SQL);
  } catch (error) {
    console.error('[selos] Falha ao inventariar os gatilhos — teste reprovado.');
    console.error(String(error.stderr || error.message).trim());
    return 1;
  }

  const rows = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [fn, tables, beforeWrite, config] = line.split('\t');
      return {
        fn,
        tables: tables ? tables.split(',') : [],
        beforeWrite: beforeWrite === 'true',
        config: config || '',
      };
    });

  if (rows.length === 0) {
    console.error('[selos] Nenhum gatilho enforce_*_hash encontrado — isso não é normal.');
    return 1;
  }

  const failures = [];

  for (const row of rows) {
    if (row.tables.length === 0) {
      failures.push(`${row.fn}: função existe mas não está acoplada a nenhuma tabela`);
      continue;
    }
    if (!row.beforeWrite) {
      failures.push(
        `${row.fn}: gatilho não é BEFORE INSERT/UPDATE — o hash não chegaria ao disco`,
      );
    }

    const searchPath = searchPathOf(row.config);
    if (!searchPath) {
      failures.push(`${row.fn}: sem search_path fixado (exigido em SECURITY DEFINER)`);
      continue;
    }

    // Prova de resolução: avalia digest() exatamente sob o search_path da função.
    try {
      const value = psql(
        `SET LOCAL search_path = ${searchPath}; SELECT encode(digest('smoke', 'sha256'), 'hex');`,
      );
      if (!/^[0-9a-f]{64}$/.test(value.split('\n').pop().trim())) {
        failures.push(`${row.fn}: digest() retornou valor inesperado sob "${searchPath}"`);
      }
    } catch {
      failures.push(
        `${row.fn}: digest() NÃO resolve sob search_path "${searchPath}" — ` +
          `gravações em ${row.tables.join(', ')} falhariam`,
      );
    }
  }

  if (failures.length > 0) {
    console.error(`\n[selos] ${failures.length} problema(s) na cadeia de integridade:\n`);
    for (const failure of failures) console.error(`  ✖ ${failure}`);
    console.error('');
    return 1;
  }

  console.log(`[selos] OK — ${rows.length} selos verificados:`);
  for (const row of rows) console.log(`  ✔ ${row.fn} → ${row.tables.join(', ')}`);
  return 0;
}

process.exit(main());
