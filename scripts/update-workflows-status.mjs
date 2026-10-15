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
import { closeSync, fstatSync, openSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const STATUS_PATH = 'docs/auditoria/estado/WORKFLOWS_STATUS.md';
const START = '<!-- REPORT:START -->';
const END = '<!-- REPORT:END -->';

// SonarCloud (path traversal): o sink só pode ler de dentro do diretório
// temporário do runner ou do próprio checkout — nunca de um path arbitrário
// do sistema. É o único chamador real
// (.github/workflows/workflows-report.yml), que sempre passa um arquivo em
// /tmp (ex. /tmp/workflows-report.md).
const ALLOWED_ROOTS = [tmpdir(), resolve('.')];

const reportFileArg = process.argv[2];
if (!reportFileArg) {
  console.error('Uso: node scripts/update-workflows-status.mjs <arquivo-com-saida-do-report>');
  process.exit(1);
}

// CodeQL (TOCTOU/file-system race): abre o arquivo uma única vez e valida o
// MESMO descritor (fstat + /proc/self/fd, só Linux — único ambiente onde
// este script roda, actions/runner-images ubuntu-latest) antes de ler dele,
// em vez de checar o path (stat/realpath) e só depois abrir — essa segunda
// forma deixa uma janela em que o arquivo apontado pelo path poderia ser
// substituído entre o check e o uso (symlink race).
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
const resolvedPath = readlinkSync(`/proc/self/fd/${reportFd}`);
if (!ALLOWED_ROOTS.some((root) => resolvedPath === root || resolvedPath.startsWith(root + '/'))) {
  closeSync(reportFd);
  console.error(`Caminho fora dos diretórios permitidos (tmp ou projeto): ${reportFileArg}`);
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
