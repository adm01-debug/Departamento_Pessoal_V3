import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const PASTA = 'tmp-recrutamento/dnd-final';
mkdirSync(PASTA, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1600, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'off');
});
const page = await context.newPage();
page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4500);
if ((await page.locator('[data-pipeline-board]').count()) === 0) {
  throw new Error(`Pipeline não abriu. URL: ${page.url()}`);
}

const medir = () =>
  page.evaluate(() => {
    const rect = (el) => (el ? el.getBoundingClientRect() : null);
    const main = document.querySelector('main');
    const board = document.querySelector('[data-pipeline-board]');
    const colunas = [...document.querySelectorAll('[data-pipeline-coluna]')];
    return {
      main: main
        ? { overflowY: getComputedStyle(main).overflowY, scroll: main.scrollHeight, client: main.clientHeight }
        : null,
      board: board
        ? {
            h: Math.round(rect(board).height),
            clientY: board.clientHeight,
            scrollY: board.scrollHeight,
            clientX: board.clientWidth,
            scrollX: board.scrollWidth,
            overflowY: getComputedStyle(board).overflowY,
          }
        : null,
      colunas: colunas.map((coluna) => {
        const r = rect(coluna);
        const lista = coluna.querySelector('[data-pipeline-lista]');
        const rodape = coluna.querySelector('[data-pipeline-rodape]');
        const cards = [...coluna.querySelectorAll('[data-candidato-card]')].map((card) =>
          Math.round(rect(card).height)
        );
        return {
          id: coluna.getAttribute('data-pipeline-coluna'),
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          h: Math.round(r.height),
          rodapeBottom: rodape ? Math.round(rect(rodape).bottom) : null,
          listaClient: lista?.clientHeight ?? null,
          listaScroll: lista?.scrollHeight ?? null,
          listaOverflowY: lista ? getComputedStyle(lista).overflowY : null,
          cards,
        };
      }),
    };
  });

function conferir(nome, dados) {
  const ids = dados.colunas.map((c) => c.id);
  const alturas = dados.colunas.map((c) => c.h);
  const topos = dados.colunas.map((c) => c.top);
  const rodapes = dados.colunas.map((c) => c.rodapeBottom);
  const amplitude = (valores) => Math.max(...valores) - Math.min(...valores);
  const problemas = [];

  if (ids.join(',') !== 'triagem,entrevista,teste,proposta,contratado') {
    problemas.push(`colunas inesperadas: ${ids.join(',')}`);
  }
  if (amplitude(alturas) > 1) problemas.push(`alturas diferentes: ${alturas}`);
  if (amplitude(topos) > 1) problemas.push(`topos desalinhados: ${topos}`);
  if (amplitude(rodapes) > 1) problemas.push(`rodapés desalinhados: ${rodapes}`);
  dados.colunas.forEach((c) => {
    if (c.listaOverflowY === 'auto' || c.listaOverflowY === 'scroll') {
      problemas.push(`${c.id}: scroll vertical aninhado (${c.listaOverflowY})`);
    }
    if (c.listaScroll > c.listaClient + 1) {
      problemas.push(`${c.id}: conteúdo cortado (${c.listaScroll} > ${c.listaClient})`);
    }
  });
  if (dados.board && dados.board.scrollY > dados.board.clientY + 1) {
    problemas.push(`board com scroll vertical (${dados.board.scrollY} > ${dados.board.clientY})`);
  }
  if (dados.main?.overflowY !== 'auto') problemas.push(`main sem overflow auto (${dados.main?.overflowY})`);

  console.log(
    nome,
    JSON.stringify({
      boardAltura: dados.board?.h,
      alturas,
      topos,
      rodapes,
      lista: dados.colunas.map((c) => `${c.id}:${c.listaClient}/${c.listaScroll}/${c.listaOverflowY}`),
      cards: dados.colunas.map((c) => `${c.id}:${c.cards.join('|')}`),
      boardY: `${dados.board?.clientY}/${dados.board?.scrollY}`,
      boardX: `${dados.board?.clientX}/${dados.board?.scrollX}`,
      problemas,
    })
  );
  if (problemas.length > 0) throw new Error(`${nome}: ${problemas.join(' | ')}`);
}

for (const [width, height] of [
  [1600, 900],
  [1440, 900],
  [1366, 768],
  [390, 844],
]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  });
  conferir(`${width}x${height}`, await medir());
  await page.screenshot({ path: `${PASTA}/layout-${width}x${height}.png`, fullPage: false });
  await page.screenshot({ path: `${PASTA}/layout-${width}x${height}-completo.png`, fullPage: true });
  await page.locator('[data-pipeline-board]').screenshot({ path: `${PASTA}/board-${width}x${height}.png` });
}

await browser.close();
console.log('LAYOUT OK');
