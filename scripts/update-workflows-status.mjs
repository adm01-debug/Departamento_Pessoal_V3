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
import { closeSync, fstatSync, openSync, readFileSync, writeFileSync } from 'node:fs';

const STATUS_PATH = 'docs/auditoria/estado/WORKFLOWS_STATUS.md';
const START = '<!-- REPORT:START -->';
const END = '<!-- REPORT:END -->';

const reportFileArg = process.argv[2];
if (!reportFileArg) {
  console.error('Uso: node scripts/update-workflows-status.mjs <arquivo-com-saida-do-report>');
  process.exit(1);
}

// SonarCloud (path traversal) + CodeQL (TOCTOU/file-system race): abre o
// arquivo uma única vez e valida o MESMO descritor (fstat) antes de ler
// dele, em vez de checar o path (stat/realpath) e só depois abrir — essa
// segunda forma deixa uma janela em que o arquivo apontado pelo path
// poderia ser substituído entre o check e o uso (symlink race). O caminho
// pode ser fora do repo por design: o único chamador real
// (.github/workflows/workflows-report.yml) sempre passa um arquivo
// temporário do runner (ex. /tmp/workflows-report.md), não input de
// terceiros.
let reportFd;
try {
  reportFd = openSync(reportFileArg, 'r');
} catch {
  console.error(`Arquivo de relatório não encontrado: ${reportFileArg}`);
  process.exit(1);
}
if (!fstatSync(reportFd).isFile()) {
  closeSync(reportFd);
  console.error(`Caminho não é um arquivo regular: ${reportFileArg}`);
  process.exit(1);
}

const report = readFileSync(reportFd, 'utf-8').trim();
closeSync(reportFd);
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
