#!/usr/bin/env node
/**
 * Gate de integridade dos "embed hints" do PostgREST.
 *
 * O problema que este gate fecha:
 * consultas do tipo
 *
 *   .select('*, colaborador:colaboradores!fk_ferias_colaborador(nome_completo)')
 *
 * amarram o código a um NOME DE CONSTRAINT do banco. Nada valida esse nome:
 * não é tipo TypeScript, não é coluna, o `tsgo` passa, o build passa, o teste
 * unitário com mock passa. A quebra aparece só em runtime, como
 * PGRST200 ("could not find a relationship"), e normalmente numa tela
 * secundária que ninguém abre no smoke test.
 *
 * Foi exatamente o que aconteceu ao desduplicar 135 FKs redundantes: sete
 * consultas apontavam para a constraint removida do par. O typecheck não viu.
 *
 * A dica de constraint também não é opcional por capricho — ela existe porque
 * havia ambiguidade (duas FKs entre as mesmas tabelas). Removida a
 * ambiguidade, a dica continua sendo a forma mais explícita e legível, e
 * quebra ruidosamente se a FK for renomeada. Este gate transforma esse
 * "quebra em runtime" em "quebra no CI".
 *
 * ESTRATÉGIA
 * 1. Varre `src/` e `supabase/functions/` procurando `tabela!nome_constraint`
 *    dentro de chamadas `.select(...)`.
 * 2. Consulta `pg_constraint` e confronta cada nome citado.
 * 3. Reprova quando a constraint não existe, ou quando existe mais de uma FK
 *    entre o mesmo par de tabelas sem que o código desambigue (regressão da
 *    duplicação que acabamos de eliminar).
 *
 * Sem banco acessível encerra em 0 avisando: um gate que não pôde rodar não
 * deve reprovar o build, mas também não deve se declarar aprovado em silêncio.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOTS = ['src', 'supabase/functions'];
const EXTS = new Set(['.ts', '.tsx', '.js', '.mjs']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'coverage']);

/**
 * Captura `alvo!constraint`. O alvo é o nome da tabela embutida; a constraint
 * é o desambiguador. Ignora `!inner` / `!left`, que são modificadores de join
 * do PostgREST e não nomes de constraint.
 */
const HINT_RE = /\b([a-z0-9_]+)!([a-z0-9_]+)\b/g;
const JOIN_MODIFIERS = new Set(['inner', 'left']);

function hasDatabase() {
  return Boolean(process.env.PGHOST || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL);
}

function runQuery(sql) {
  const args = ['-Atq', '-F', '\t', '-c', sql];
  const conn = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!process.env.PGHOST && conn) args.unshift(conn);
  return execFileSync('psql', args, { encoding: 'utf8' });
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else if (EXTS.has(extname(entry))) out.push(full);
  }
  return out;
}

/** Coleta as dicas citadas no código, com arquivo e linha para o relatório. */
function collectHints() {
  const hits = [];
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        // Só considera linhas de consulta: reduz falso positivo em strings
        // arbitrárias que por acaso contenham `algo!outra_coisa`.
        if (!line.includes('select(') && !line.includes('.select') && !line.includes('sel(')) return;
        for (const m of line.matchAll(HINT_RE)) {
          const [, table, constraint] = m;
          if (JOIN_MODIFIERS.has(constraint)) continue;
          hits.push({ file, line: i + 1, table, constraint });
        }
      });
    }
  }
  return hits;
}

function main() {
  const hints = collectHints();

  if (!hasDatabase()) {
    console.warn(
      `[embed-hints] AVISO — banco inacessível (sem PGHOST/DATABASE_URL). ` +
        `${hints.length} dica(s) de relacionamento NÃO foram verificadas.`
    );
    process.exit(0);
  }

  const existentes = new Set(
    runQuery(`SELECT conname FROM pg_constraint WHERE contype = 'f'`)
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const violacoes = hints.filter((h) => !existentes.has(h.constraint));

  // Regressão de duplicação: mais de uma FK ligando o mesmo par de tabelas
  // pelas mesmas colunas reintroduz a ambiguidade do PostgREST.
  const dupOut = runQuery(`
    SELECT c.conrelid::regclass::text, count(*)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.contype = 'f' AND n.nspname = 'public'
    GROUP BY c.conrelid, c.conkey, c.confrelid, c.confkey
    HAVING count(*) > 1
  `)
    .split('\n')
    .filter((l) => l.trim());

  let falhou = false;

  if (violacoes.length > 0) {
    falhou = true;
    console.error(
      `[embed-hints] FALHA — ${violacoes.length} dica(s) apontam para constraint inexistente:`
    );
    for (const v of violacoes) {
      console.error(`  ${v.file}:${v.line}  ${v.table}!${v.constraint}`);
    }
    console.error(
      '\n  Causa provável: a FK foi renomeada ou removida. Consulte o nome atual com:\n' +
        "    SELECT conname FROM pg_constraint WHERE conrelid = '<tabela>'::regclass AND contype='f';"
    );
  }

  if (dupOut.length > 0) {
    falhou = true;
    console.error(
      `\n[embed-hints] FALHA — ${dupOut.length} par(es) de tabelas com FK duplicada (ambiguidade no PostgREST):`
    );
    for (const l of dupOut) console.error(`  ${l.replace('\t', ' — ')} constraints para a mesma coluna`);
  }

  if (falhou) process.exit(1);

  console.log(
    `[embed-hints] OK — ${hints.length} dica(s) de relacionamento verificadas, ` +
      `todas existentes e sem FK duplicada no schema public.`
  );
}

main();
