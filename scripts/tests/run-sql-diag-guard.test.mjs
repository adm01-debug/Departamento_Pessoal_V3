// Regressões do guard de scripts/diag/run-sql-diag.mjs: consultas que o scanner
// lia diferente do lexer do Postgres (e por isso escapavam da transação READ
// ONLY) têm de ser recusadas ANTES de chegar ao psql. Usa um psql falso no PATH
// — não precisa de banco.
// Rodar: node --test scripts/tests/run-sql-diag-guard.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { after, test } from 'node:test';

const script = resolve(import.meta.dirname, '../diag/run-sql-diag.mjs');
const work = mkdtempSync(join(tmpdir(), 'run-sql-diag-guard-'));
after(() => rmSync(work, { recursive: true, force: true }));

const marker = join(work, 'psql-foi-chamado');
writeFileSync(join(work, 'psql'), `#!/bin/sh\n: > "${marker}"\necho ok\n`);
chmodSync(join(work, 'psql'), 0o755);

function run(query, env = {}) {
  rmSync(marker, { force: true });
  const result = spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${work}${delimiter}${process.env.PATH}`,
      SUPABASE_DB_URL: 'postgresql://fake',
      DIAG_QUERY: query,
      ALLOW_PII: '',
      DIAG_OUTPUT_FILE: '',
      ...env,
    },
  });
  return { status: result.status, reachedPsql: existsSync(marker), stderr: result.stderr };
}

const ESCAPE = '; ROLLBACK; BEGIN; DELETE FROM public.t; COMMIT';

const rejected = [
  ["E-string com \\' esconde o resto", `SELECT E'\\''${ESCAPE}; --'`],
  ['continuação de E-string em outra linha', `SELECT E'a'\n'\\''${ESCAPE}; --'`],
  ['identificador com $ lido como dollar-quote', `SELECT 1 AS x$a$${ESCAPE}; SELECT 1 AS y$a$`],
  ['dollar-quote com tag não-ASCII', `SELECT $é$ ' $é$${ESCAPE}; --'`],
  ['comentário -- terminado por CR', `SELECT 1 --\r${ESCAPE}`],
  ['dblink() comum', `SELECT * FROM dblink('x', 'DELETE FROM public.t RETURNING 1') AS t(x int)`],
  ['função proibida entre aspas', `SELECT "query_to_xml"('select 1', true, false, '')`],
  ['schema.função proibida entre aspas', `SELECT cron."schedule"('x', '* * * * *', 'select 1')`],
  ['set_config desfaz o SET LOCAL ROLE', `SELECT set_config('role', 'postgres', true)`],
  ['U&"..." com escape Unicode', `SELECT U&"set\\005Fconfig"('role', 'postgres', true)`],
  ['pg_read_binary_file', `SELECT pg_read_binary_file('/etc/hostname')`],
];

for (const [label, query] of rejected) {
  test(`recusa: ${label}`, () => {
    // ALLOW_PII=1 tira o filtro W27 da frente: quem tem de recusar é o guard read-only.
    const result = run(query, { ALLOW_PII: '1' });
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.reachedPsql, false, 'a consulta chegou ao psql');
  });
}

const accepted = [
  ['SELECT simples', 'SELECT 1'],
  ['; e palavra proibida só dentro de literal', `SELECT 'a; drop table x' AS s`],
  ["aspas escapadas com ''", `SELECT 'it''s' AS s`],
  ['E-string sem aspas escapadas', `SELECT E'a\\tb' AS s`],
  ['dollar-quote legítimo', `SELECT $q$a;b'$q$ AS s, $$c;d$$ AS t`],
  ['comentário de linha com CRLF', 'SELECT 1 AS um -- c\r\n, 2 AS dois'],
  ['identificador entre aspas', `SELECT relname AS "Nome" FROM pg_catalog.pg_class`],
];

for (const [label, query] of accepted) {
  test(`aceita: ${label}`, () => {
    const result = run(query);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.reachedPsql, true);
  });
}

test('aceita com allow_pii: coluna com nome reservado entre aspas', () => {
  const result = run('SELECT "comment" FROM public.t', { ALLOW_PII: '1' });
  assert.equal(result.status, 0, result.stderr);
});
