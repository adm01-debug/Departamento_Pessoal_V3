#!/usr/bin/env node
/**
 * W92: injeta a saída de scripts/report-workflows.mjs em
 * docs/auditoria/estado/WORKFLOWS_STATUS.md, entre os marcadores
 * <!-- REPORT:START --> / <!-- REPORT:END -->.
 *
 * Usado por .github/workflows/workflows-report.yml (cron semanal) para
 * manter a tabela de duração/P95 atualizada sem reescrever o resto do
 * documento (contexto, histórico de limpeza de artifacts, próximos passos).
 *
 * SonarCloud sinalizava "Path Traversal via faulty LLM-supplied CLI
 * arguments" quando o caminho do relatório vinha de process.argv — mas o
 * único chamador real (workflows-report.yml) sempre gera e lê exatamente
 * /tmp/workflows-report.md, nunca um caminho variável. Em vez de sanitizar
 * um argumento que não precisa existir, o caminho agora é fixo: elimina a
 * fonte do taint (não há mais input externo chegando ao sink de arquivo).
 */
import { readFileSync, writeFileSync } from 'node:fs';

const REPORT_PATH = '/tmp/workflows-report.md';
const STATUS_PATH = 'docs/auditoria/estado/WORKFLOWS_STATUS.md';
const START = '<!-- REPORT:START -->';
const END = '<!-- REPORT:END -->';

let report;
try {
  report = readFileSync(REPORT_PATH, 'utf-8').trim();
} catch {
  console.error(
    `Arquivo de relatório não encontrado: ${REPORT_PATH} (rode "node scripts/report-workflows.mjs > ${REPORT_PATH}" antes).`
  );
  process.exit(1);
}
const status = readFileSync(STATUS_PATH, 'utf-8');

const startIdx = status.indexOf(START);
const endIdx = status.indexOf(END);
if (startIdx === -1 || endIdx === -1) {
  console.error(`Marcadores ${START}/${END} não encontrados em ${STATUS_PATH}`);
  process.exit(1);
}

const before = status.slice(0, startIdx + START.length);
const after = status.slice(endIdx);

// Codex (P2, PR #242-followup): preservar a data quando apenas o timestamp
// muda, sem alteração real no relatório — senão git diff --quiet sempre
// detecta mudança e abre um PR semanal com diff só de data.
const existingBlock = status.slice(startIdx + START.length, endIdx);
const prevDate = (existingBlock.match(/Última execução automática: (\d{4}-\d{2}-\d{2})/) || [])[1] ?? '';
const prevReport = existingBlock
  .replace(/>\s*Última execução automática:[^\n]*\n?/g, '')
  .trim();
const today = new Date().toISOString().slice(0, 10);
const date = prevReport === report.trim() && prevDate ? prevDate : today;

const body = `\n\n> Última execução automática: ${date} (workflows-report.yml)\n\n${report}\n\n`;

writeFileSync(STATUS_PATH, before + body + after);
console.log(`WORKFLOWS_STATUS.md atualizado (${STATUS_PATH})${date === prevDate ? ' (data preservada — relatório inalterado)' : ''}.`);
