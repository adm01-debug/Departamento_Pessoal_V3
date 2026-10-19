/**
 * Ajuste das âncoras do card canônico depois da linha de ações própria.
 * Uso: node _tmp-atualizar-baseline.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const p = 'docs/protegido/desempenho-layout.baseline.json';
const b = JSON.parse(readFileSync(p, 'utf8'));
const a = b.arquivos.find((x) => x.caminho.endsWith('CartaoFeedbackCanonico.tsx'));

const set = (id, trecho) => {
  const an = a.ancoras.find((x) => x.id === id);
  if (an) an.trecho = trecho;
  else a.ancoras.push({ id, trecho });
};

// O Prettier quebra o parágrafo em várias linhas; a âncora usa o texto do
// rótulo (estável) em vez de depender da quebra de linha.
set('rotulo-avaliado-por', 'Avaliado por');

writeFileSync(p, `${JSON.stringify(b, null, 2)}\n`);
console.log('ok');
