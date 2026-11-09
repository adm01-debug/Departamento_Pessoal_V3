// Utilitários compartilhados do autofix. Zero IA: só ferramentas determinísticas
// (tsc, eslint, prettier, git). Nada aqui faz chamada de rede além do git fetch.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const log = (...a) => console.log(`[autofix ${new Date().toTimeString().slice(0, 8)}]`, ...a);

/** Executa um comando sem shell; nunca lança por exit code != 0 (a menos que allowFail=false). */
export function sh(cmd, args, { cwd, allowFail = true } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    p.on('error', reject);
    p.on('close', (code) => {
      if (code !== 0 && !allowFail) reject(new Error(`${cmd} ${args.join(' ')} -> exit ${code}\n${stderr || stdout}`));
      else resolve({ code, stdout, stderr });
    });
  });
}

export const git = (cwd, ...args) => sh('git', args, { cwd, allowFail: false }).then((r) => r.stdout.trim());
export const bin = (cwd, name) => join(cwd, 'node_modules', '.bin', name);

// ---------- typecheck ----------
const TSC_LINE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;

/**
 * Roda o tsc do projeto (mesmo tsconfig.json que o CI usa). Incremental para as
 * rodadas repetidas do codemod custarem segundos, não ~20s cada.
 */
export async function typecheck(cwd, buildInfo) {
  const r = await sh(bin(cwd, 'tsc'), ['--noEmit', '--incremental', '--tsBuildInfoFile', buildInfo, '--pretty', 'false'], { cwd });
  const errors = [];
  for (const line of r.stdout.split('\n')) {
    const m = TSC_LINE.exec(line);
    if (m) errors.push({ file: m[1], line: +m[2], code: m[4], msg: m[5] });
    else if (/error TS\d+/.test(line)) errors.push({ file: '<global>', line: 0, code: 'TS', msg: line.trim() });
  }
  // exit != 0 sem nenhuma linha de erro = o tsc quebrou; tratar como falha, nunca como "verde".
  return { errors, crashed: r.code !== 0 && errors.length === 0, raw: r.stdout + r.stderr };
}

// Chave sem coluna: os edits do codemod nunca mudam o número de linhas, então a linha é estável.
export const errKey = (e) => `${e.file}|${e.line}|${e.code}|${e.msg}`;

/** Erros presentes em `now` que não existiam em `base` (comparação por multiconjunto). */
export function newErrors(base, now) {
  const budget = new Map();
  for (const e of base) budget.set(errKey(e), (budget.get(errKey(e)) ?? 0) + 1);
  const out = [];
  for (const e of now) {
    const k = errKey(e);
    const left = budget.get(k) ?? 0;
    if (left > 0) budget.set(k, left - 1);
    else out.push(e);
  }
  return out;
}

// ---------- eslint ----------
/** Roda o eslint do projeto em modo JSON. Falha alto se a saída não for JSON (nunca "verde falso"). */
export async function eslintJson(cwd, targets, extraArgs = []) {
  const r = await sh(bin(cwd, 'eslint'), [...targets, ...extraArgs, '-f', 'json'], { cwd });
  let data;
  try {
    data = JSON.parse(r.stdout);
  } catch {
    throw new Error(`eslint não devolveu JSON (exit ${r.code}):\n${(r.stderr || r.stdout).slice(0, 2000)}`);
  }
  let warnings = 0;
  let errors = 0;
  const byFile = new Map();
  for (const f of data) {
    warnings += f.warningCount;
    errors += f.errorCount;
    if (f.messages.length) byFile.set(relative(cwd, f.filePath), f.messages);
  }
  return { warnings, errors, byFile };
}

// ---------- arquivos ----------
const SRC_EXT = /\.(ts|tsx|css|json|md)$/;

export function listSrc(cwd, dir = 'src') {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      if (name === 'node_modules') continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (SRC_EXT.test(name)) out.push(relative(cwd, p));
    }
  };
  walk(join(cwd, dir));
  return out;
}

/** Foto do conteúdo de todos os arquivos de src/. Permite rollback exato, mesmo com WIP não commitado. */
export function snapshot(cwd, files) {
  const snap = new Map();
  for (const f of files) snap.set(f, readFileSync(join(cwd, f), 'utf8'));
  return snap;
}

export function touchedSince(cwd, snap) {
  const out = [];
  for (const [f, text] of snap) if (readFileSync(join(cwd, f), 'utf8') !== text) out.push(f);
  return out;
}

export function restore(cwd, snap, files) {
  for (const f of files) writeFileSync(join(cwd, f), snap.get(f));
}

export async function prettierWrite(cwd, files) {
  for (let i = 0; i < files.length; i += 150) {
    const r = await sh(bin(cwd, 'prettier'), ['--write', '--log-level', 'warn', ...files.slice(i, i + 150)], { cwd });
    if (r.code !== 0) throw new Error(`prettier falhou:\n${r.stderr || r.stdout}`);
  }
}

export async function prettierCheck(cwd, files) {
  const bad = [];
  for (let i = 0; i < files.length; i += 150) {
    const r = await sh(bin(cwd, 'prettier'), ['--list-different', ...files.slice(i, i + 150)], { cwd });
    bad.push(...r.stdout.split('\n').filter(Boolean));
  }
  return bad;
}
