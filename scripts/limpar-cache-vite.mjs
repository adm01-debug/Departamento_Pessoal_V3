#!/usr/bin/env node
/**
 * ============================================================================
 * LIMPEZA DO CACHE DE DEPENDÊNCIAS DO VITE — `node_modules/.vite`
 * ============================================================================
 *
 * POR QUE ISSO EXISTE
 * -------------------
 * O Vite pré-empacota as dependências em `node_modules/.vite/deps` e serve os
 * arquivos com `?v=<hash>` na URL. Quando o hash muda — re-otimização on-demand
 * (ex.: uma rota lazy que é a primeira a puxar uma dep), inclusão de dep em
 * `optimizeDeps.include`, upgrade de pacote ou restart do servidor — as URLs
 * mudam. Uma ABA ABERTA ANTES da troca continua com o módulo antigo em memória
 * (`/deps/react.js?v=<hash-antigo>`) e, ao abrir uma rota nova, baixa também
 * `/deps/react.js?v=<hash-novo>`.
 *
 * Resultado: DUAS cópias de React na mesma página. A que renderiza é uma, a que
 * executa o hook é outra — o hook roda com `ReactSharedInternals.H === null` e
 * estoura `Cannot read properties of null (reading 'useState')`. Em DEV a tela
 * "Instabilidade Detectada" (`RouteErrorBoundary`) mostra exatamente essa
 * mensagem. Um F5 costuma resolver; se o cache em disco estiver inconsistente
 * (ou o servidor foi morto no meio da escrita), só limpar resolve.
 *
 * O QUE ELE FAZ
 * -------------
 * Remove `node_modules/.vite` (e `node_modules/.vite-temp`, se existir). Nada
 * fora desses dois caminhos é tocado — cada alvo é validado contra a raiz do
 * repositório antes de qualquer remoção.
 *
 * O QUE ELE **NÃO** FAZ
 * ---------------------
 *  • Não apaga `node_modules`, lockfile, `dist` nem código-fonte;
 *  • Não derruba nem reinicia o dev server: pare-o antes (`Ctrl+C`), rode a
 *    limpeza e suba de novo — se ele estiver rodando, o Vite simplesmente
 *    recria o cache e o problema da aba antiga volta.
 *
 * Uso:
 *   npm run cache:limpar     # só limpa
 *   npm run dev:clean        # limpa e sobe o dev server
 *
 * Código de saída: 0 = OK · 1 = erro ao remover.
 * ============================================================================
 */
import { existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NM = join(RAIZ, 'node_modules');

const ALVOS = ['node_modules/.vite', 'node_modules/.vite-temp'].map((rel) => ({
  rotulo: rel,
  caminho: join(RAIZ, ...rel.split('/')),
}));

/** Só remove caminhos que estão comprovadamente dentro de `node_modules/.vite*`. */
function validarAlvo(caminho) {
  const normalizado = resolve(caminho);
  const dentroDoNodeModules = normalizado.startsWith(NM + sep);
  const dentroDoCache = normalizado === join(NM, '.vite') || normalizado.startsWith(join(NM, '.vite') + sep) ||
    normalizado === join(NM, '.vite-temp') || normalizado.startsWith(join(NM, '.vite-temp') + sep);
  return dentroDoNodeModules && dentroDoCache;
}

let removidos = 0;

for (const alvo of ALVOS) {
  if (!existsSync(alvo.caminho)) {
    console.log(`• ${alvo.rotulo}: ausente (nada a fazer)`);
    continue;
  }
  if (!validarAlvo(alvo.caminho)) {
    console.error(`✗ ${alvo.rotulo}: caminho fora de node_modules/.vite* — remoção abortada por segurança`);
    process.exit(1);
  }
  try {
    rmSync(alvo.caminho, { recursive: true, force: true });
    console.log(`✓ ${alvo.rotulo}: removido`);
    removidos++;
  } catch (erro) {
    console.error(`✗ ${alvo.rotulo}: falha ao remover — ${erro instanceof Error ? erro.message : String(erro)}`);
    console.error('  Dica: pare o dev server (Ctrl+C) e rode novamente.');
    process.exit(1);
  }
}

if (removidos === 0) {
  console.log('\nCache do Vite já estava limpo.');
} else {
  console.log(`\n${removidos} cache(s) removido(s).`);
}

console.log('Próximos passos: suba o dev server (`npm run dev` ou `npm run dev:clean`).');
console.log('Se houver aba aberta de antes da limpeza, recarregue-a (F5) — o React antigo continua em memória nela.');
