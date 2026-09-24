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
 * ⚠️ NÃO LIGADO AO CI (24/09/2026) — testado contra produção e descartado
 * nesta forma. `supabase_migrations.schema_migrations` tem 403 linhas
 * cobrindo versões de 20260511 a hoje, mas só 403 dos 684 arquivos locais
 * têm entrada correspondente — sem corte de data limpo, espalhado ao longo
 * de todo o histórico. A convenção de gravar no ledger nunca foi seguida de
 * forma consistente neste projeto (a maior parte da história foi aplicada
 * por um caminho que não escreve nessa tabela), então o diff cru contra o
 * ledger reprova ~40% das migrations existentes — inutilizável como gate,
 * mesmo sabendo que pelo menos um subconjunto real (o lote de 19-31/07,
 * A-036) genuinamente nunca rodou. Script mantido no repo porque a lógica
 * está correta; falta uma forma confiável de estabelecer quais migrations
 * pré-existentes são esperadas no ledger antes de religar isto ao CI.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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
    console.error(err.message);
    return 1;
  }

  const naoAplicadas = [...local].filter((v) => !ledger.has(v)).sort();
  const orfasNoLedger = [...ledger].filter((v) => !local.has(v)).sort();

  if (orfasNoLedger.length > 0) {
    console.warn(
      `[schema-drift] ${orfasNoLedger.length} versão(ões) no ledger sem arquivo local correspondente (aviso, não reprova):`
    );
    orfasNoLedger.forEach((v) => console.warn(`  - ${v}`));
  }

  if (naoAplicadas.length > 0) {
    console.error(
      `[schema-drift] ${naoAplicadas.length} migration(ões) no repositório sem registro no ledger de produção:`
    );
    naoAplicadas.forEach((v) => console.error(`  ✖ ${v}`));
    console.error(
      '\n  Isso não prova ausência de aplicação (ver limitação no topo do arquivo), mas é o sinal' +
      '\n  mais forte disponível sem uma auditoria semântica por objeto. Investigar antes de tratar' +
      '\n  qualquer achado corrigido nessas migrations como resolvido em produção.'
    );
    return 1;
  }

  console.log(`[schema-drift] OK — ${local.size} migration(ões) local(is), todas com registro no ledger.`);
  return 0;
}

process.exit(main());
