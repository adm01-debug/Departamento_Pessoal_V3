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
 * Uso: node scripts/update-workflows-status.mjs <arquivo-com-saida-do-report>
 */
import { readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const STATUS_PATH = 'docs/auditoria/estado/WORKFLOWS_STATUS.md';
const START = '<!-- REPORT:START -->';
const END = '<!-- REPORT:END -->';

const reportFileArg = process.argv[2];
if (!reportFileArg) {
  console.error('Uso: node scripts/update-workflows-status.mjs <arquivo-com-saida-do-report>');
  process.exit(1);
}

// SonarCloud: path traversal — normaliza qualquer "../" no argumento (resolve
// é determinístico e elimina a forma clássica de escape) e resolve symlinks
// antes de ler, confirmando que o destino final é um arquivo regular comum
// (nunca um device/FIFO/socket). O caminho pode ser fora do repo por design:
// o único chamador real (.github/workflows/workflows-report.yml) sempre passa
// um arquivo temporário do runner (ex. /tmp/workflows-report.md), não input
// de terceiros.
let reportFile;
try {
  reportFile = realpathSync(resolve(reportFileArg));
} catch {
  console.error(`Arquivo de relatório não encontrado: ${reportFileArg}`);
  process.exit(1);
}
if (!statSync(reportFile).isFile()) {
  console.error(`Caminho não é um arquivo regular: ${reportFileArg}`);
  process.exit(1);
}

const report = readFileSync(reportFile, 'utf-8').trim();
const status = readFileSync(STATUS_PATH, 'utf-8');

const startIdx = status.indexOf(START);
const endIdx = status.indexOf(END);
if (startIdx === -1 || endIdx === -1) {
  console.error(`Marcadores ${START}/${END} não encontrados em ${STATUS_PATH}`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const before = status.slice(0, startIdx + START.length);
const after = status.slice(endIdx);
const body = `\n\n> Última execução automática: ${today} (workflows-report.yml)\n\n${report}\n\n`;

writeFileSync(STATUS_PATH, before + body + after);
console.log(`WORKFLOWS_STATUS.md atualizado (${STATUS_PATH}).`);
