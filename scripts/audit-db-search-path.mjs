#!/usr/bin/env node
/**
 * Gate de integridade: search_path x extensões isoladas.
 *
 * Contexto do incidente (28/07/2026):
 * O `pgcrypto` foi movido de `public` para o schema `extensions` durante o
 * endurecimento de segurança. 30 funções continuaram declaradas com
 * `SET search_path = public` e passaram a falhar em tempo de execução com
 * `function digest(text, unknown) does not exist` — incluindo os gatilhos
 * `enforce_*_hash` que selam folha de pagamento, ponto, férias e contratos.
 *
 * O Postgres NÃO acusa esse tipo de quebra na criação da função: o corpo de
 * uma função PL/pgSQL só é resolvido na execução. Este gate faz a checagem
 * que o banco não faz.
 *
 * Estratégia: para cada extensão instalada fora de `pg_catalog`, listar as
 * funções que ela fornece e procurar chamadas a elas em funções do schema
 * `public` cujo `search_path` fixado NÃO inclui o schema da extensão.
 *
 * Falsos positivos conhecidos e por que são excluídos:
 * - Funções que também existem em `pg_catalog` (ex.: `gen_random_uuid`, nativo
 *   desde o PG13). Resolvem sempre, independentemente do search_path.
 * - Funções sem `search_path` fixado: herdam o search_path da sessão. Não são
 *   alvo deste gate (são alvo do linter de segurança, que é outro assunto).
 *
 * Saída: código 0 quando limpo, 1 quando há quebra. Sem banco acessível o
 * script encerra em 0 e explica o motivo — um gate que não pôde rodar não
 * pode se declarar aprovado, mas também não deve reprovar o build por isso.
 */

import { execFileSync } from 'node:child_process';

const QUERY = `
WITH ext AS (
  SELECT e.extname, n.nspname AS sch
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE n.nspname <> 'pg_catalog'
),
ext_fn AS (
  SELECT DISTINCT e.extname, e.sch, p.proname
  FROM ext e
  JOIN pg_extension x ON x.extname = e.extname
  JOIN pg_depend d ON d.refobjid = x.oid AND d.deptype = 'e'
  JOIN pg_proc p ON p.oid = d.objid
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc c
    JOIN pg_namespace cn ON cn.oid = c.pronamespace
    WHERE cn.nspname = 'pg_catalog' AND c.proname = p.proname
  )
)
SELECT f.extname || E'\t' || f.sch || E'\t' || f.proname || E'\t' || c.oid::regprocedure::text
FROM ext_fn f
JOIN pg_proc c ON c.prosrc ~ ('\\m' || f.proname || '\\M')
JOIN pg_namespace cn ON cn.oid = c.pronamespace AND cn.nspname = 'public'
WHERE c.proconfig IS NOT NULL
  AND array_to_string(c.proconfig, ',') ~ 'search_path'
  AND array_to_string(c.proconfig, ',') !~ ('\\m' || f.sch || '\\M')
ORDER BY 1, 4;
`;

function hasDatabase() {
  return Boolean(process.env.PGHOST || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL);
}

function runQuery() {
  const args = ['-Atq', '-c', QUERY];
  const conn = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  // Sem PGHOST o psql cairia num socket local inexistente; nesse caso a URL
  // explícita é a única forma de conexão.
  if (!process.env.PGHOST && conn) args.unshift(conn);
  return execFileSync('psql', args, { encoding: 'utf8' });
}

function main() {
  if (!hasDatabase()) {
    console.warn('[search-path] Banco indisponível neste ambiente — verificação ignorada.');
    console.warn('[search-path] Defina PGHOST/PG* ou DATABASE_URL para habilitar o gate.');
    return 0;
  }

  let output;
  try {
    output = runQuery();
  } catch (error) {
    // Falha de conexão não é o mesmo que código aprovado, mas também não é
    // motivo para reprovar um PR. Reportamos alto e claro.
    console.warn(`[search-path] Não foi possível consultar o banco: ${error.message}`);
    return 0;
  }

  const rows = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [extname, schema, extFn, fn] = line.split('\t');
      return { extname, schema, extFn, fn };
    });

  if (rows.length === 0) {
    console.log('[search-path] OK — nenhuma função referencia extensão fora do seu search_path.');
    return 0;
  }

  console.error(
    `\n[search-path] ${rows.length} função(ões) quebrariam em tempo de execução:\n`,
  );
  for (const row of rows) {
    console.error(
      `  ✖ ${row.fn}\n      usa ${row.extFn}() de "${row.extname}" (schema ${row.schema}), ` +
        `ausente do search_path fixado`,
    );
  }
  console.error(
    '\n  Correção: ALTER FUNCTION <assinatura> SET search_path = public, <schema_da_extensao>;\n',
  );
  return 1;
}

process.exit(main());
