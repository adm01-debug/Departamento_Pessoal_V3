import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const PASTA = 'tmp-recrutamento/padrao-admissao';
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
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text().slice(0, 160));
});

const medirPipeline = () =>
  page.evaluate(() => {
    const rect = (el) => (el ? el.getBoundingClientRect() : null);
    const main = document.querySelector('main');
    const board = document.querySelector('[data-pipeline-board]');
    return {
      main: main ? { scrollTop: main.scrollTop, scroll: main.scrollHeight, client: main.clientHeight } : null,
      board: board
        ? {
            w: Math.round(rect(board).width),
            h: Math.round(rect(board).height),
            clientX: board.clientWidth,
            scrollX: board.scrollWidth,
            clientY: board.clientHeight,
            scrollY: board.scrollHeight,
          }
        : null,
      colunas: [...document.querySelectorAll('[data-pipeline-coluna]')].map((coluna) => {
        const r = rect(coluna);
        const lista = coluna.querySelector('[data-pipeline-lista]');
        const rodape = coluna.querySelector('footer');
        const card = coluna.querySelector('[data-candidato-card]');
        const visual = card?.firstElementChild;
        return {
          id: coluna.getAttribute('data-pipeline-coluna'),
          width: Math.round(r.width),
          height: Math.round(r.height),
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          rodapeBottom: rodape ? Math.round(rect(rodape).bottom) : null,
          listaClient: lista?.clientHeight,
          listaScroll: lista?.scrollHeight,
          listaOverflowY: lista ? getComputedStyle(lista).overflowY : null,
          listaOverscroll: lista ? getComputedStyle(lista).overscrollBehaviorY : null,
          cards: coluna.querySelectorAll('[data-candidato-card]').length,
          cardBg: visual ? getComputedStyle(visual).backgroundColor : null,
          cardRadius: visual ? getComputedStyle(visual).borderRadius : null,
          cardPadding: visual ? getComputedStyle(visual).padding : null,
          vazio: Boolean(coluna.querySelector('[data-pipeline-vazio]')),
        };
      }),
    };
  });

async function abrirPipeline() {
  await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  if ((await page.locator('[data-pipeline-board]').count()) === 0) {
    throw new Error(`Pipeline não abriu: ${page.url()}`);
  }
}

await abrirPipeline();

const resumo = {};
for (const [w, h] of [
  [1920, 1080],
  [1600, 900],
  [1440, 900],
  [1366, 768],
  [390, 844],
]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
    const board = document.querySelector('[data-pipeline-board]');
    if (board) board.scrollLeft = 0;
  });
  await page.waitForTimeout(250);
  const dados = await medirPipeline();
  resumo[`${w}x${h}`] = {
    board: dados.board,
    colunas: dados.colunas.map((c) => ({
      id: c.id,
      width: c.width,
      height: c.height,
      top: c.top,
      rodapeBottom: c.rodapeBottom,
      lista: `${c.listaClient}/${c.listaScroll}/${c.listaOverflowY}/${c.listaOverscroll}`,
      cards: c.cards,
      vazio: c.vazio,
    })),
    card: {
      bg: dados.colunas.find((c) => c.cards > 0)?.cardBg,
      radius: dados.colunas.find((c) => c.cards > 0)?.cardRadius,
      padding: dados.colunas.find((c) => c.cards > 0)?.cardPadding,
    },
  };
  await page.screenshot({ path: `${PASTA}/recrutamento-${w}x${h}.png` });
  await page.locator('[data-pipeline-board]').screenshot({ path: `${PASTA}/recrutamento-board-${w}x${h}.png` });
}

// ── Admissão como referência, no MESMO viewport (1600x900) ──────────────────
await page.setViewportSize({ width: 1600, height: 900 });
await page.goto('http://localhost:8080/admissoes', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const aba = page.getByRole('tab', { name: 'Kanban' });
let admissao = null;
try {
  await aba.click({ timeout: 10_000 });
  await page.waitForTimeout(3500);
  admissao = await page.evaluate(() => {
    const slots = [...document.querySelectorAll('.kanban-lane-slot')];
    const primeira = slots[0];
    const r = primeira?.getBoundingClientRect();
    return {
      slots: slots.length,
      width: r ? Math.round(r.width) : null,
      height: r ? Math.round(r.height) : null,
      visual: primeira
        ? {
            height: Math.round(primeira.firstElementChild.getBoundingClientRect().height),
            radius: getComputedStyle(primeira.firstElementChild).borderRadius,
            classes: primeira.firstElementChild.className,
          }
        : null,
    };
  });
  await page.screenshot({ path: `${PASTA}/admissao-kanban-1600x900.png` });
  const board = page.locator('.kanban-lane-slot').first().locator('..');
  await board.screenshot({ path: `${PASTA}/admissao-board-1600x900.png` });
} catch (erro) {
  console.log('ADMISSAO_INDISPONIVEL', erro.message);
}

console.log('RESUMO', JSON.stringify(resumo, null, 2));
console.log('ADMISSAO', JSON.stringify(admissao));

await browser.close();
