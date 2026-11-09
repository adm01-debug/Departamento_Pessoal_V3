#!/usr/bin/env node
/**
 * autofix — correção automática do código SEM IA (só tsc/eslint/prettier/git).
 *
 * Modos
 *   (padrão)  cria/reaproveita um git worktree isolado a partir de origin/main, aplica as
 *             correções, prova cada uma contra o tsc e commita numa branch autofix/<data>.
 *             Não toca no seu checkout, não faz push.
 *   --here    aplica no checkout atual, só nos arquivos que a branch já alterou (diff vs base +
 *             WIP). Não commita (use --commit). Para limpar um PR antes de abri-lo.
 *
 * Etapas (--steps eslint,any,format,ratchet; padrão: todas)
 *   eslint  : eslint --fix com o conjunto de regras seguras (type-imports, inferrable-types, …)
 *   any     : codemod de no-explicit-any provado pelo tsc (ver any-codemod.mjs)
 *   format  : prettier nos arquivos tocados (exigência do format:check:changed do CI)
 *   ratchet : baixa scripts/.any-baseline.json para o novo número
 *
 * Garantia: nada é mantido se o tsc ganhar erro novo, se o eslint piorar ou se o ratchet subir.
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync, readFileSync } from 'node:fs';
import { homedir, tmpdir, setPriority } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { sh, git, bin, log, typecheck, newErrors, eslintJson, listSrc, snapshot, touchedSince, restore, prettierWrite, prettierCheck } from './lib.mjs';
import { runAnyPass } from './any-codemod.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => {
  const eq = argv.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.slice(n.length + 3);
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};

if (flag('help') || flag('h')) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^[#/* ]+/gm, '').trim());
  process.exit(0);
}

const REPO = resolve(import.meta.dirname, '..', '..');
const STEPS = opt('steps', 'eslint,any,format,ratchet').split(',');
const HERE = flag('here');
const DRY = flag('dry-run');
const MAX_RUNS = Number(opt('max-runs', '150'));
const BASE = opt('base', 'origin/main');
const SAFE_RULES = [
  '@typescript-eslint/consistent-type-imports',
  '@typescript-eslint/no-inferrable-types',
  'object-shorthand',
  'no-else-return',
  'prefer-const',
  'no-var',
  'no-extra-boolean-cast',
  'no-useless-rename',
];

if (HERE && DRY) {
  console.error('--here e --dry-run não combinam (o dry-run precisa de um worktree descartável). Use sem --here.');
  process.exit(2);
}

// ---------- trava (uma execução por vez; a VM já travou com medições em paralelo) ----------
const LOCK = join(tmpdir(), 'dp-autofix.lock');
function acquireLock() {
  try {
    mkdirSync(LOCK);
  } catch {
    let alive = false;
    try {
      process.kill(Number(readFileSync(join(LOCK, 'pid'), 'utf8')), 0);
      alive = true;
    } catch {}
    if (alive) throw new Error(`outra execução do autofix está ativa (${LOCK})`);
    rmSync(LOCK, { recursive: true, force: true });
    mkdirSync(LOCK);
  }
  writeFileSync(join(LOCK, 'pid'), String(process.pid));
}
const releaseLock = () => rmSync(LOCK, { recursive: true, force: true });

// ---------- ambiente ----------
async function setupWorktree(stamp) {
  const wt = resolve(opt('worktree', join(homedir(), 'projetos/_worktrees/Departamento_Pessoal_V3-autofix')));
  await sh('git', ['fetch', 'origin', '--quiet'], { cwd: REPO }); // falha de rede não é fatal: usa o que existe
  await git(REPO, 'worktree', 'prune');
  const branch = `autofix/${stamp}`;
  if (existsSync(wt)) {
    const cur = await git(wt, 'rev-parse', '--abbrev-ref', 'HEAD').catch(() => '');
    if (!cur.startsWith('autofix/') && cur !== 'HEAD') throw new Error(`${wt} existe mas não é um worktree do autofix (branch "${cur}")`);
    if (await git(wt, 'status', '--porcelain')) throw new Error(`${wt} tem alterações não commitadas; resolva antes (git -C ${wt} status)`);
    await git(wt, 'checkout', '-q', '-B', branch, BASE);
  } else {
    await git(REPO, 'worktree', 'add', '-q', '-B', branch, wt, BASE);
  }
  const nm = join(wt, 'node_modules');
  if (!existsSync(nm)) symlinkSync(join(REPO, 'node_modules'), nm);
  return { wt, branch };
}

const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})/, '$1-');
const report = { stamp, mode: HERE ? 'here' : 'worktree', dry: DRY, steps: {}, commits: [], ok: false };
let cwd = REPO;
let startSha = '';
let startSnap;
let srcFiles = [];

async function changedFilesVsBase() {
  const names = new Set();
  const add = (s) => s.split('\n').filter(Boolean).forEach((f) => names.add(f));
  add((await sh('git', ['diff', '--name-only', '--diff-filter=ACMR', `${BASE}...HEAD`], { cwd })).stdout);
  add((await sh('git', ['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'], { cwd })).stdout);
  add((await sh('git', ['ls-files', '--others', '--exclude-standard'], { cwd })).stdout);
  return [...names].filter((f) => f.startsWith('src/') && /\.(ts|tsx|css|json|md)$/.test(f));
}

async function commit(msg, files) {
  if (DRY || (HERE && !flag('commit')) || !files.length) return;
  await git(cwd, 'add', '--', ...files);
  if (!(await git(cwd, 'diff', '--cached', '--name-only'))) return;
  await git(cwd, 'commit', '--no-verify', '-q', '-m', msg);
  report.commits.push({ sha: (await git(cwd, 'rev-parse', '--short', 'HEAD')), msg, files: files.length });
  log(`commit: ${msg} (${files.length} arquivos)`);
}

async function main() {
  acquireLock();
  setPriority(10); // não competir com o editor/WSL

  if (HERE) {
    cwd = await git(process.cwd(), 'rev-parse', '--show-toplevel');
  } else {
    const w = await setupWorktree(stamp);
    cwd = w.wt;
    report.branch = w.branch;
  }
  startSha = await git(cwd, 'rev-parse', 'HEAD');
  const req = createRequire(join(cwd, 'package.json'));
  const ts = req('typescript');
  const buildInfo = join(tmpdir(), `dp-autofix-${createHash('sha1').update(cwd).digest('hex').slice(0, 8)}.tsbuildinfo`);
  const tc = () => typecheck(cwd, buildInfo);

  srcFiles = listSrc(cwd);
  const only = HERE ? new Set(await changedFilesVsBase()) : null;
  const inScope = (f) => !only || only.has(f);
  startSnap = snapshot(cwd, srcFiles);
  log(`modo=${report.mode} cwd=${cwd} base=${BASE} escopo=${only ? `${only.size} arquivos alterados` : 'src inteiro'}`);

  // ----- linha de base -----
  const baseTsc = await tc();
  if (baseTsc.crashed) throw new Error(`tsc quebrou na linha de base:\n${baseTsc.raw.slice(0, 1500)}`);
  const baseLint = await eslintJson(cwd, ['src']);
  report.baseline = { tscErrors: baseTsc.errors.length, lintWarnings: baseLint.warnings, lintErrors: baseLint.errors };
  log(`linha de base: tsc=${baseTsc.errors.length} erros, eslint=${baseLint.warnings} avisos / ${baseLint.errors} erros`);

  const gate = async () => {
    const t = await tc();
    const fresh = newErrors(baseTsc.errors, t.errors);
    return { ok: !t.crashed && fresh.length === 0, fresh };
  };
  const stepSnapshot = () => snapshot(cwd, srcFiles);
  const rollback = (snap) => restore(cwd, snap, touchedSince(cwd, snap));

  // ----- 1. eslint --fix com regras seguras -----
  if (STEPS.includes('eslint')) {
    const snap = stepSnapshot();
    const targets = only ? [...only].filter((f) => /\.tsx?$/.test(f)) : ['src'];
    const t0 = { touched: 0, kept: [], dropped: [] };
    if (targets.length) {
      const run = (rules) => sh(bin(cwd, 'eslint'), ['--fix', ...targets, ...rules.flatMap((r) => ['--rule', `${r}:error`])], { cwd });
      await run(SAFE_RULES);
      t0.touched = touchedSince(cwd, snap).length;
      if (t0.touched) {
        if ((await gate()).ok) t0.kept = SAFE_RULES;
        else {
          log('eslint --fix em conjunto regrediu o tsc; reaplicando regra a regra');
          rollback(snap);
          for (const rule of SAFE_RULES) {
            const s2 = stepSnapshot();
            await run([rule]);
            if (!touchedSince(cwd, s2).length) continue;
            if ((await gate()).ok) t0.kept.push(rule);
            else {
              rollback(s2);
              t0.dropped.push(rule);
            }
          }
        }
      }
    }
    const touched = touchedSince(cwd, snap);
    report.steps.eslint = { files: touched.length, rules: t0.kept, dropped: t0.dropped };
    log(`eslint --fix: ${touched.length} arquivos (regras ok: ${t0.kept.length}, descartadas: ${t0.dropped.length})`);
    await commit('chore(autofix): eslint --fix com regras seguras (type-imports, inferrable-types, …)', touched);
  }

  // ----- 2. codemod de any provado pelo tsc -----
  if (STEPS.includes('any')) {
    const snap = stepSnapshot();
    const before = await eslintJson(cwd, ['src']);
    const files = [...before.byFile]
      .filter(([f, msgs]) => inScope(f) && msgs.some((m) => m.ruleId === '@typescript-eslint/no-explicit-any'))
      .map(([f]) => f);
    const kinds = flag('include-as') ? ['drop', 'unknown', 'as'] : ['drop', 'unknown'];
    const pass = { candidates: 0, accepted: 0, rejected: 0, runs: 0, exhausted: false };
    const bl = (await tc()).errors; // estado atual (já com o eslint --fix aceito) é a nova referência
    let left = MAX_RUNS;
    for (const k of kinds) {
      if (left <= 0) break;
      const r = await runAnyPass({ cwd, ts, files, kinds: [k], baselineErrors: bl, typecheck: tc, maxRuns: left, log });
      left -= r.runs;
      pass.candidates += r.candidates;
      pass.accepted += r.accepted;
      pass.rejected += r.rejected;
      pass.runs += r.runs;
      pass.exhausted ||= r.exhausted;
    }
    const touched = touchedSince(cwd, snap);
    const after = await eslintJson(cwd, ['src']);
    report.steps.any = { ...pass, files: touched.length, warningsBefore: before.warnings, warningsAfter: after.warnings };
    log(`any: ${pass.accepted}/${pass.candidates} aceitos em ${touched.length} arquivos; avisos ${before.warnings} -> ${after.warnings} (${pass.runs} rodadas do tsc)`);
    await commit(`fix(types): remove ${pass.accepted} \`any\` explícitos provados pelo tsc (autofix)`, touched);
  }

  // ----- 3. prettier nos arquivos tocados (CI exige nos arquivos que o PR altera) -----
  // O formato é obrigatório sempre que algo mudou: o CI reprova arquivo tocado fora do padrão.
  if (STEPS.includes('format') || touchedSince(cwd, startSnap).length) {
    // O CI (format:check:changed) exige prettier em tudo que o PR altera: arquivos que o autofix tocou
    // + (no modo --here) os que a branch já alterava.
    const known = new Set(srcFiles);
    const touched = flag('format-all')
      ? srcFiles.filter(inScope)
      : [...new Set([...touchedSince(cwd, startSnap), ...(only ?? [])])].filter((f) => known.has(f));
    const snap = stepSnapshot();
    const tsFiles = touched.filter((f) => /\.tsx?$/.test(f));
    const preLint = tsFiles.length ? await eslintJson(cwd, tsFiles) : { byFile: new Map() };
    await prettierWrite(cwd, touched);
    // O Prettier pode reflowar uma linha e afastar um `eslint-disable-next-line` do `any` que ele cobria
    // (avisos sobem), ou não estabilizar. Esses arquivos voltam ao estado original em vez de reprovar tudo.
    const postLint = tsFiles.length ? await eslintJson(cwd, tsFiles) : { byFile: new Map() };
    const count = (r, f) => r.byFile.get(f)?.length ?? 0;
    const reverted = new Set(tsFiles.filter((f) => count(postLint, f) > count(preLint, f)));
    for (const f of await prettierCheck(cwd, touched)) reverted.add(f);
    for (const f of reverted) if (startSnap.has(f)) restore(cwd, startSnap, [f]);
    const changed = touchedSince(cwd, snap);
    report.steps.format = { files: changed.length, reverted: [...reverted] };
    log(`prettier: ${changed.length} arquivos alterados de ${touched.length}; ${reverted.size} revertidos ao original (reflow/instável)`);
    await commit('style(autofix): prettier nos arquivos alterados', changed);
  }

  // ----- 4. ratchet do any -----
  const ratchet = join(cwd, 'scripts/ratchet-any.mjs');
  if (STEPS.includes('ratchet') && existsSync(ratchet) && (report.steps.any?.accepted ?? 0) > 0) {
    const r = await sh('node', [ratchet, '--write'], { cwd });
    report.steps.ratchet = { exit: r.code, out: r.stdout.trim().split('\n').slice(-4).join(' | ') };
    log(`ratchet --write: exit ${r.code}`);
    await commit('chore(autofix): baixa o orçamento de any (scripts/.any-baseline.json)', ['scripts/.any-baseline.json']);
  }

  // ----- gate final: nada piora -----
  const touchedAll = touchedSince(cwd, startSnap);
  const g = await gate();
  const lint = await eslintJson(cwd, ['src']);
  const fmtBad = await prettierCheck(cwd, touchedAll.filter((f) => /\.(ts|tsx|css|json|md)$/.test(f)));
  const rr = existsSync(ratchet) ? await sh('node', [ratchet], { cwd }) : { code: 0 };
  const problems = [];
  if (!g.ok) problems.push(`tsc: ${g.fresh.length} erros novos (ex.: ${g.fresh[0] ? `${g.fresh[0].file}:${g.fresh[0].line} ${g.fresh[0].code}` : 'crash'})`);
  if (lint.errors > baseLint.errors) problems.push(`eslint: erros ${baseLint.errors} -> ${lint.errors}`);
  if (lint.warnings > baseLint.warnings) problems.push(`eslint: avisos ${baseLint.warnings} -> ${lint.warnings}`);
  if (fmtBad.length) problems.push(`prettier: ${fmtBad.length} arquivos tocados fora do padrão (${fmtBad.slice(0, 3).join(', ')})`);
  if (rr.code !== 0) problems.push('ratchet-any reprovou');
  report.final = { tscErrors: baseTsc.errors.length + g.fresh.length, lintWarnings: lint.warnings, lintErrors: lint.errors, filesTouched: touchedAll.length };

  if (problems.length) {
    log(`GATE FINAL REPROVOU: ${problems.join('; ')} — desfazendo tudo`);
    report.problems = problems;
    if (HERE) restore(cwd, startSnap, touchedAll);
    else await git(cwd, 'reset', '--hard', '-q', startSha);
    return 1;
  }

  if (DRY) {
    await git(cwd, 'reset', '--hard', '-q', startSha);
    await sh('git', ['clean', '-fdq', '--', 'src', 'scripts'], { cwd });
    log('dry-run: nada mantido');
  }
  report.ok = true;
  log(`OK: avisos do eslint ${baseLint.warnings} -> ${lint.warnings}; tsc sem erro novo; ${touchedAll.length} arquivos tocados`);
  return 0;
}

function writeReport() {
  const dir = opt('report-dir', join(homedir(), '.autofix-reports', 'Departamento_Pessoal_V3'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${stamp}.json`), JSON.stringify(report, null, 2));
  const md = [
    `# autofix ${stamp} — ${report.ok ? 'OK' : 'FALHOU'}`,
    `modo: ${report.mode}${report.dry ? ' (dry-run)' : ''}${report.branch ? `, branch \`${report.branch}\`` : ''}`,
    report.baseline && `linha de base: tsc ${report.baseline.tscErrors} erros, eslint ${report.baseline.lintWarnings} avisos`,
    report.final && `final: tsc ${report.final.tscErrors} erros, eslint ${report.final.lintWarnings} avisos, ${report.final.filesTouched} arquivos`,
    ...Object.entries(report.steps).map(([k, v]) => `- **${k}**: ${JSON.stringify(v)}`),
    ...report.commits.map((c) => `- commit ${c.sha}: ${c.msg}`),
    ...(report.problems ?? []).map((p) => `- PROBLEMA: ${p}`),
    report.error && `ERRO: ${report.error}`,
  ].filter(Boolean).join('\n');
  writeFileSync(join(dir, `${stamp}.md`), md + '\n');
  log(`relatório: ${join(dir, `${stamp}.md`)}`);
}

let code = 1;
try {
  code = await main();
} catch (e) {
  report.error = String(e.message ?? e);
  console.error(`[autofix] ERRO: ${report.error}`);
  // rollback em caso de queda no meio de uma etapa
  try {
    if (startSnap) restore(cwd, startSnap, touchedSince(cwd, startSnap));
  } catch {}
} finally {
  writeReport();
  releaseLock();
}
process.exit(code);
