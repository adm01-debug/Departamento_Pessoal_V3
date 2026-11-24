#!/usr/bin/env node
// Glue: lê o contexto do workflow_run via env vars e chama abrirOuRotacionar
// de issue-rotativa.mjs. Chamado por notifica-falha-main.yml.
//
// Corrige dois bugs do github-script inline que substituiu:
//   1. listForRepo sem paginação (default 30) → perdia issues em repos com muita atividade
//   2. sem rotação → issue acumulava indefinidamente (viola política E51/W91)

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { abrirOuRotacionar } from './issue-rotativa.mjs';

const [owner, repo] = (process.env.REPO ?? '').split('/');
const titulo = `[falha-main] ${process.env.WF_NAME} falhou na main`;
const corpo = [
  `**Workflow:** ${process.env.WF_NAME}`,
  `**Branch:** ${process.env.WF_BRANCH}`,
  `**Commit:** ${(process.env.WF_SHA ?? '').slice(0, 7)}`,
  `**Run:** ${process.env.WF_URL}`,
  `**Quando:** ${process.env.WF_AT}`,
].join('\n');

function gh(method, path, body) {
  const args = ['api', '--method', method, path];
  if (body) args.push('--input', '-');
  return JSON.parse(execFileSync('gh', args, {
    encoding: 'utf8',
    input: body ? JSON.stringify(body) : undefined,
  }) || '{}');
}

const num = await abrirOuRotacionar({
  gh, owner, repo,
  label: 'falha-main',
  title: titulo,
  body: corpo,
});
console.log(`issue ativa: #${num}`);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // sem main() explícito — o await de topo já executa
}
