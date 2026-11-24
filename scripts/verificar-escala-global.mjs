#!/usr/bin/env node
/**
 * Verificador da ESCALA GLOBAL do Design System.
 *
 * A densidade do produto é definida em UMA régua: a base rem do `<html>`
 * (125% em `src/index.css`) + a conversão px→rem das utilities com `px`
 * arbitrário (`scripts/postcss-escala-rem.mjs`, ligado no `postcss.config.js`)
 * + o conteúdo usando a largura toda (`PAGE_WIDTH` em `PageLayout.tsx`).
 *
 * Quebrar qualquer um dos três faz o sistema voltar a renderizar menor que a
 * referência aprovada (o sintoma original: tudo pequeno com sobra de espaço
 * morto nas laterais em monitores largos). Este script falha se algum dos três
 * for removido.
 *
 * Uso: node scripts/verificar-escala-global.mjs   (npm run verificar:escala)
 */
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import escalaRemArbitraria from './postcss-escala-rem.mjs';

const falhas = [];
const oks = [];

const ler = (caminho) => readFileSync(caminho, 'utf8');

/**
 * Remove comentários antes de casar padrões: os próprios arquivos explicam no
 * comentário o que foi removido (ex.: "antes existia um teto `max-w-[1400px]`"),
 * e casar com o texto explicativo daria falso positivo.
 */
const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

// ── 1. Base rem do <html> ────────────────────────────────────────────────────
const indexCss = ler('src/index.css');
const blocoHtml = indexCss.match(/html\s*\{[^}]*\}/s)?.[0] ?? '';
if (/font-size:\s*125%/.test(blocoHtml)) {
  oks.push('src/index.css — base do <html> em 125% (20px)');
} else {
  falhas.push('src/index.css — não encontrei `html { font-size: 125% }`. Sem isso todo o `rem` volta a 16px.');
}
if (/(^|[^-\w])zoom\s*:/m.test(indexCss)) {
  falhas.push('src/index.css — `zoom:` encontrado. A escala é feita por base rem, não por zoom.');
}

// ── 2. Largura do conteúdo (sem teto em px) ─────────────────────────────────
const pageLayout = semComentarios(ler('src/components/layout/PageLayout.tsx'));
if (/max-w-\[1400px\]/.test(pageLayout)) {
  falhas.push('PageLayout.tsx — voltou o teto `max-w-[1400px]` (espaço morto nas laterais em telas largas).');
} else {
  oks.push('PageLayout.tsx — sem teto de largura em px');
}
if (/PAGE_WIDTH\s*=\s*'[^']*w-full'/.test(pageLayout)) {
  oks.push('PageLayout.tsx — PAGE_WIDTH usa a largura toda (w-full)');
} else {
  falhas.push('PageLayout.tsx — `PAGE_WIDTH` não está com `w-full`; o conteúdo volta a ficar estreito.');
}

// ── 3. Cadeia PostCSS (px arbitrário → rem) ─────────────────────────────────
const postcssConfig = semComentarios(ler('postcss.config.js'));
const posTailwind = postcssConfig.indexOf('tailwindcss()');
const posEscala = postcssConfig.indexOf('escalaRemArbitraria()');
if (posTailwind === -1 || posEscala === -1) {
  falhas.push('postcss.config.js — a cadeia precisa ser `[tailwindcss(), escalaRemArbitraria()]`.');
} else if (posEscala < posTailwind) {
  falhas.push('postcss.config.js — `escalaRemArbitraria()` deve vir DEPOIS de `tailwindcss()` (senão não existe CSS para converter).');
} else {
  oks.push('postcss.config.js — escala px→rem ligada depois do Tailwind');
}

// ── 4. Autoteste do plugin (sem Tailwind: rápido e determinístico) ──────────
const amostra = `.w-\\[150px\\]{width:150px}.text-\\[11px\\]{font-size:11px}.w-\\[1px\\]{width:1px}`;
const convertido = (
  await postcss([escalaRemArbitraria()]).process(amostra, { from: undefined })
).css;
if (/width:9\.375rem/.test(convertido) && /font-size:0\.6875rem/.test(convertido) && /width:1px\b/.test(convertido)) {
  oks.push('scripts/postcss-escala-rem.mjs — 150px→9.375rem, 11px→0.6875rem, hairline de 1px preservado');
} else {
  falhas.push(`scripts/postcss-escala-rem.mjs — conversão inesperada: ${convertido}`);
}

// ── Resultado ───────────────────────────────────────────────────────────────
console.log('\n── VERIFICADOR DE ESCALA GLOBAL ──\n');
for (const ok of oks) console.log(`✔ ${ok}`);
for (const falha of falhas) console.log(`✘ ${falha}`);
console.log('');

if (falhas.length > 0) {
  console.log(`RESULTADO: FALHOU — ${falhas.length} regra(s) de escala quebrada(s).\n`);
  process.exit(1);
}
console.log('RESULTADO: OK — a régua de densidade do sistema está íntegra.\n');
