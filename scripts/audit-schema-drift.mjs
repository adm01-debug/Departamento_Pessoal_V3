#!/usr/bin/env node
/**
 * Gate de regressão: migration presente no repositório sem registro no ledger
 * de produção.
 *
 * O INCIDENTE QUE MOTIVOU ESTE GATE (A-036)
 * ------------------------------------------
 * O lote de hardening de RLS de 19-31/07/2026 (12 arquivos) está no
 * repositório desde então, mas nunca foi aplicado ao banco de produção. Como
 * nenhum gate comparava repositório × banco vivo, todo achado "corrigido pelo
 * código-fonte" nesse intervalo era enganoso: o schema vivo divergia do que o
 * repositório sugeria.
 *
 * O QUE É AVALIADO
 * Todo arquivo em `supabase/migrations/*.sql` tem sua versão (prefixo
 * numérico do nome) comparada contra `supabase_migrations.schema_migrations`
 * em produção. Versão presente no repositório e ausente do ledger é reprovada
 * — sinal forte de que a migration nunca rodou.
 *
 * LIMITAÇÃO CONHECIDA (documentada, não escondida)
 * Presença no ledger **não prova** que o DDL foi de fato aplicado — o próprio
 * lote de julho citado acima ficou parcialmente registrado no ledger e ausente
 * do schema real (E50-14 trata disso separadamente). Este gate pega a omissão
 * mais grosseira e mais comum (nenhum registro), não substitui uma auditoria
 * semântica de cada objeto.
 *
 * Versão presente no ledger e ausente do repositório só gera aviso (pode ser
 * squash/limpeza legítima de migrations antigas já aplicadas) — não reprova.
 *
 * Saída: 0 limpo, 1 com migration não aplicada. Sem banco alcançável encerra
 * em 0 avisando — um gate que não pôde rodar não deve reprovar o build, mas
 * também não deve se declarar aprovado em silêncio.
 *
 * HISTÓRICO DO GATE (por que ele só vale a partir de 13/10/2026)
 * ---------------------------------------------------------------
 * Em 24/09/2026 o diff cru contra o ledger foi testado e reprovado como
 * gate: a convenção de gravar em `schema_migrations` nunca foi seguida de
 * forma consistente neste projeto (boa parte do histórico foi aplicada por
 * um caminho que não escreve nessa tabela), então reprovar o histórico
 * inteiro seria ruído permanente, não sinal.
 *
 * Levantamento de 26/11/2026 (repo x banco canônico): 1172 arquivos locais,
 * 1132 versões no ledger, 40 ausentes = 7 legados (`001`..`007`) + 33
 * versionadas, de 20260317001935 a 20261012130000. As 33 foram conferidas
 * objeto por objeto contra o schema vivo: nenhum objeto consumido pelo app
 * (`src/` e `supabase/functions/`) depende delas — as ausências reais são de
 * índices/MVs/RPCs sem consumidor. Ou seja: dívida de escrituração, não
 * funcionalidade ausente.
 *
 * Corte adotado: `--since=20261013`, ligado no job `db-integrity-live` do
 * `.github/workflows/ci.yml`. A partir daí são 109 migrations avaliadas e
 * 0 ausentes. O corte é o menor valor que zera o gate sem esconder
 * migration nova: a última ausente é 20261012130000. Reavaliar o corte só
 * se o runbook de reconciliação
 * (`infra/runbooks/RECONCILIACAO_DRIFT_MIGRATIONS.md`) fechar a dívida das 33.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// --since=YYYYMMDD  — ignora migrations com versão < cutoff (históricas, pré-convenção).
// Permite ligar o gate para migrations novas sem reprovar 40% do histórico.
// Exemplo: --since=20260924 (data em que a convenção de ledger foi adotada).
const sinceArg = process.argv.find(a => a.startsWith('--since='));
const SINCE_VERSION = sinceArg ? sinceArg.split('=')[1] : null;

// --warn-only  — achado de migration sem registro vira aviso, sem exit 1.
// Usado em pull_request: a política do repo só permite `apply` a partir de
// `main` (gate de branch do canonical-migrations.yml), então uma migration
// nova em PR não pode estar no ledger por construção — reprovar ali seria um
// falso negativo estrutural em toda PR que adiciona migration. Em push na
// `main`/`workflow_dispatch` o gate continua reprovando de verdade.
const WARN_ONLY = process.argv.includes('--warn-only');
// O filtro é comparação de string com a versão: valor não numérico
// (--since=abc, --since=2026-09-24) descartava TODAS as migrations e saía "OK".
if (sinceArg && !/^\d{8,14}$/.test(SINCE_VERSION)) {
  console.error(`[schema-drift] --since inválido: "${SINCE_VERSION}" (use AAAAMMDD ou a versão de 14 dígitos).`);
  process.exit(1);
}

const MIGRATIONS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'supabase',
  'migrations'
);

function hasDatabase() {
  return Boolean(process.env.PGHOST || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL);
}

function runQuery(sql) {
  const args = ['-Atq', '-F', '\t', '-c', sql];
  const conn = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!process.env.PGHOST && conn) args.unshift(conn);
  return execFileSync('psql', args, { encoding: 'utf8' });
}

function localVersions() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => f.match(/^(\d+)_/)?.[1])
    .filter(Boolean);
}

function ledgerVersions() {
  const saida = runQuery(
    'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;'
  );
  return saida.split('\n').map((l) => l.trim()).filter(Boolean);
}

function main() {
  if (!hasDatabase()) {
    console.warn('[schema-drift] Banco indisponível neste ambiente — verificação ignorada.');
    console.warn('[schema-drift] Defina PGHOST/PG* ou DATABASE_URL para habilitar o gate.');
    return 0;
  }

  const local = new Set(localVersions());
  let ledger;
  try {
    ledger = new Set(ledgerVersions());
  } catch (err) {
    console.error('[schema-drift] A consulta ao ledger falhou — gate reprovado.');
    // err.message traz a linha de comando do psql, isto é, a DATABASE_URL com
    // a senha. O stderr do psql já explica a falha sem expor a credencial.
    console.error(String(err.stderr || err.message).trim());
    return 1;
  }

  const localFiltrado = SINCE_VERSION
    ? new Set([...local].filter(v => v >= SINCE_VERSION))
    : local;
  if (SINCE_VERSION) {
    const ignoradas = local.size - localFiltrado.size;
    console.log(`[schema-drift] Filtro --since=${SINCE_VERSION}: ignorando ${ignoradas} migration(ões) históricas.`);
  }

  // Guard de falso verde: sem nenhuma migration no escopo não há o que aprovar.
  if (localFiltrado.size === 0) {
    console.error(`[schema-drift] ERRO: nenhuma migration avaliada em ${MIGRATIONS_DIR} — diretório vazio ou --since além da última versão.`);
    return 1;
  }

  const naoAplicadas = [...localFiltrado].filter((v) => !ledger.has(v)).sort();
  const orfasNoLedger = [...ledger].filter((v) => !local.has(v)).sort();

  if (orfasNoLedger.length > 0) {
    console.warn(
      `[schema-drift] ${orfasNoLedger.length} versão(ões) no ledger sem arquivo local correspondente (aviso, não reprova):`
    );
    orfasNoLedger.forEach((v) => console.warn(`  - ${v}`));
  }

  if (naoAplicadas.length > 0) {
    const log = WARN_ONLY ? console.warn : console.error;
    log(
      `[schema-drift] ${naoAplicadas.length} migration(ões) no repositório sem registro no ledger de produção:`
    );
    naoAplicadas.forEach((v) => log(`  ✖ ${v}`));
    log(
      '\n  Isso não prova ausência de aplicação (ver limitação no topo do arquivo), mas é o sinal' +
      '\n  mais forte disponível sem uma auditoria semântica por objeto. Investigar antes de tratar' +
      '\n  qualquer achado corrigido nessas migrations como resolvido em produção.'
    );
    if (!WARN_ONLY) return 1;
    console.warn(
      `[schema-drift] AVISO — ${naoAplicadas.length} migration(ões) sem registro no ledger; ` +
        'o gate reprova quando isso acontece em push na main.'
    );
    return 0;
  }

  const escopo = SINCE_VERSION ? `${localFiltrado.size} desde ${SINCE_VERSION}` : `${local.size}`;
  console.log(`[schema-drift] OK — ${escopo} migration(ões), todas com registro no ledger.`);
  return 0;
}

process.exit(main());
