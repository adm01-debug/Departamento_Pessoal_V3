#!/usr/bin/env node
/**
 * ============================================================================
 * VERIFICADOR DE LAYOUT PROTEGIDO — Gestão de Desempenho (área congelada)
 * ============================================================================
 *
 * Confere se as ÂNCORAS VISUAIS declaradas em
 * `docs/protegido/desempenho-layout.baseline.json` continuam existindo nos
 * arquivos protegidos e, quando houver modificação no working tree, imprime o
 * `git diff` do arquivo para revisão humana.
 *
 * ── O QUE ELE **NÃO** FAZ ───────────────────────────────────────────────────
 *  • Não bloqueia correções funcionais: em arquivos MISTOS (TSX com lógica +
 *    JSX) a lógica pode mudar à vontade; só FALHA quando uma âncora visual
 *    declarada desaparece ou muda;
 *  • Não é pixel-diff: é uma checagem por substring dos trechos que definem o
 *    contrato visual (mais o teste de navegador em
 *    `e2e/authenticated/layout-protegido-desempenho.spec.ts`);
 *  • Não altera nada — é somente leitura.
 *
 * Uso:
 *   node scripts/verificar-layout-protegido.mjs            # checa + mostra diff
 *   node scripts/verificar-layout-protegido.mjs --sem-diff # só as âncoras
 *   node scripts/verificar-layout-protegido.mjs --json     # saída para máquina
 *   node scripts/verificar-layout-protegido.mjs --so=src/components/avaliacao/FeedbackCard.tsx
 *
 * Código de saída: 0 = OK · 1 = âncora visual alterada/ausente · 2 = erro de uso.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = resolve(RAIZ, 'docs/protegido/desempenho-layout.baseline.json');

const args = process.argv.slice(2);
const modoJson = args.includes('--json');
const mostrarDiff = !args.includes('--sem-diff');
const so = args.find((a) => a.startsWith('--so='))?.slice(5) ?? null;

if (!existsSync(BASELINE)) {
  console.error(`✗ Baseline não encontrado: ${BASELINE}`);
  process.exit(2);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const alvos = baseline.arquivos.filter((a) => (so ? a.caminho === so : true));

/** Diff do working tree para um arquivo (vazio quando igual ao HEAD). */
function diffDoArquivo(caminho) {
  try {
    return execFileSync('git', ['--no-pager', 'diff', '--unified=2', '--', caminho], {
      cwd: RAIZ,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    }).trim();
  } catch {
    return '';
  }
}

const resultados = [];
for (const entrada of alvos) {
  const absoluto = resolve(RAIZ, entrada.caminho);
  if (!existsSync(absoluto)) {
    resultados.push({ ...entrada, existe: false, faltando: entrada.ancoras.map((a) => a.id), diff: '' });
    continue;
  }
  const conteudo = readFileSync(absoluto, 'utf8');
  const faltando = entrada.ancoras.filter((a) => !conteudo.includes(a.trecho)).map((a) => a.id);
  resultados.push({ ...entrada, existe: true, faltando, diff: mostrarDiff ? diffDoArquivo(entrada.caminho) : '' });
}

const comFalha = resultados.filter((r) => !r.existe || r.faltando.length > 0);
const modificados = resultados.filter((r) => r.diff);

if (modoJson) {
  console.log(
    JSON.stringify(
      {
        area: baseline.area,
        ok: comFalha.length === 0,
        verificados: resultados.length,
        falhas: comFalha.map((r) => ({ caminho: r.caminho, faltando: r.faltando, existe: r.existe })),
        modificados: modificados.map((r) => r.caminho),
      },
      null,
      2,
    ),
  );
} else {
  console.log(`\n── VERIFICADOR DE LAYOUT PROTEGIDO · ${baseline.area} (${baseline.rota}) ──\n`);
  for (const r of resultados) {
    const total = r.ancoras.length;
    if (!r.existe) {
      console.log(`✗ ${r.caminho} — ARQUIVO AUSENTE (${r.rotulo})`);
      continue;
    }
    if (r.faltando.length === 0) {
      const marca = r.diff ? '▲' : '✓';
      const extra = r.diff ? ' · modificado (diff abaixo para revisão)' : '';
      console.log(`${marca} ${r.caminho} — ${total}/${total} âncoras intactas${extra}`);
    } else {
      console.log(`✗ ${r.caminho} — ${total - r.faltando.length}/${total} âncoras intactas`);
      console.log(`   ÂNCORAS ALTERADAS/AUSENTES: ${r.faltando.join(', ')}`);
    }
  }

  if (mostrarDiff && modificados.length > 0) {
    console.log('\n── DIFF PARA REVISÃO (working tree × HEAD) ────────────────────────────');
    for (const r of modificados) {
      console.log(`\n### ${r.caminho}  ·  ${r.rotulo}\n`);
      console.log(r.diff.split('\n').slice(0, 120).join('\n'));
      if (r.diff.split('\n').length > 120) console.log('... (diff truncado em 120 linhas)');
    }
    console.log('\nRevisão obrigatória: alteração funcional que preserve o JSX/classes é permitida;');
    console.log('qualquer mudança visual precisa de autorização explícita do usuário.');
  }

  console.log(
    comFalha.length === 0
      ? '\nRESULTADO: OK — nenhuma âncora visual protegida foi alterada.\n'
      : `\nRESULTADO: FALHA — ${comFalha.length} arquivo(s) com âncora visual alterada. NÃO conclua a tarefa sem autorização do usuário.\n`,
  );
}

process.exit(comFalha.length === 0 ? 0 : 1);
