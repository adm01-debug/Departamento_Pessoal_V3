#!/usr/bin/env node
/**
 * GA02: garante que o CLAUDE.md nao foi apagado ou esvaziado por outra sessao.
 * Verifica: arquivo existe, cabecalhos obrigatorios presentes, nao encolheu >30% vs a base.
 * Base: CLAUDE_MD_BASE (no CI, a main buscada; localmente, sem a variavel, compara com o HEAD).
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// CLAUDE.md é agora um arquivo de redirect (@AGENTS.md); as regras reais vivem em AGENTS.md.
const CHECKED_FILE = 'AGENTS.md';
const REQUIRED_SECTIONS = [
  '## 1. Contexto',
  '## 2. Como trabalhar',
  '## 7. Fluxo Git',
  '## 8. Específico deste repositório',
];
const SHRINK_THRESHOLD = 0.30;

let content;
try {
  content = readFileSync(CHECKED_FILE, 'utf8');
} catch {
  console.error(`::error::${CHECKED_FILE} nao encontrado. Outra sessao pode ter apagado o arquivo.`);
  process.exitCode = 1;
  process.exit();
}

const missing = REQUIRED_SECTIONS.filter((s) => !content.includes(s));
if (missing.length > 0) {
  for (const s of missing) console.error(`::error::${CHECKED_FILE}: secao obrigatoria ausente: ${s}`);
  process.exitCode = 1;
  process.exit();
}

const BASE = process.env.CLAUDE_MD_BASE || 'HEAD';
let headContent;
try {
  headContent = execSync(`git show ${BASE}:${CHECKED_FILE}`, { encoding: 'utf8' });
} catch {
  headContent = null;
}

if (headContent) {
  const ratio = content.length / headContent.length;
  if (ratio < (1 - SHRINK_THRESHOLD)) {
    console.error(`::error::${CHECKED_FILE} encolheu ${Math.round((1 - ratio) * 100)}% vs ${BASE} (atual: ${content.length} bytes, base: ${headContent.length} bytes). Possivel wipe por sessao paralela.`);
    process.exitCode = 1;
    process.exit();
  }
}

console.log(`${CHECKED_FILE} OK: ${REQUIRED_SECTIONS.length} secoes presentes, ${content.length} bytes.`);
