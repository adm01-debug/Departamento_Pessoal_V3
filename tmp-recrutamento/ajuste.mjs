import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const page = await context.newPage();
await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);

const medir = () =>
  page.evaluate(() => {
    const tablist = document.querySelector('[role="tablist"]');
    const board = document.querySelector('[data-pipeline-board]');
    const colunas = [...document.querySelectorAll('[data-pipeline-coluna]')];
    const cards = [...document.querySelectorAll('[data-candidato-card]')];
    const rect = (el) => (el ? el.getBoundingClientRect() : null);
    return {
      gapTabsBoard: tablist && board ? Math.round(rect(board).top - rect(tablist).bottom) : null,
      board: board ? { h: Math.round(rect(board).height), client: board.clientWidth, scroll: board.scrollWidth } : null,
      colunas: colunas.map((coluna) => ({
        id: coluna.getAttribute('data-pipeline-coluna'),
        h: Math.round(rect(coluna).height),
        w: Math.round(rect(coluna).width),
        n: coluna.querySelectorAll('[data-candidato-card]').length,
      })),
      cards: cards.map((card) => Math.round(rect(card).height)),
      cardTexto: cards[0]?.innerText.replace(/\n+/g, ' · ').trim(),
      footerTop: Math.round(rect(document.querySelector('[data-pipeline-footer]')).top),
    };
  });

console.log('DESKTOP', JSON.stringify(await medir(), null, 2));
await page.screenshot({ path: 'tmp-recrutamento/ajuste-desktop.jpg', type: 'jpeg', quality: 72 });
await page.locator('[data-pipeline-board]').screenshot({ path: 'tmp-recrutamento/ajuste-board.png' });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(700);
console.log('MOBILE', JSON.stringify(await medir(), null, 2));
await page.screenshot({ path: 'tmp-recrutamento/ajuste-mobile.jpg', type: 'jpeg', quality: 72 });

await browser.close();
