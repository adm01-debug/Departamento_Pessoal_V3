import { chromium } from '@playwright/test';

/**
 * Experimento: quem define a altura da linha da grade de Turmas?
 * Uso: node tmp-agenda-align/experimento-altura.mjs
 */
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
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.getByRole('tab', { name: 'Turmas' }).click();
await page.waitForTimeout(2200);

const resultado = await page.evaluate(() => {
  const grid = document.querySelector('[data-turmas-grid]');
  const painel = document.querySelector('[data-turmas-agenda]');
  const wrapper = painel.parentElement;
  const colunas = [...document.querySelectorAll('[data-turmas-coluna]')];

  const medir = (rotulo) => ({
    rotulo,
    gridH: Math.round(grid.getBoundingClientRect().height),
    row: getComputedStyle(grid).gridTemplateRows,
    painelH: Math.round(painel.getBoundingClientRect().height),
    colunas: colunas.map((c) => Math.round(c.getBoundingClientRect().height)),
    scrolls: colunas.map((c) => Math.round(c.scrollHeight)),
  });

  const snaps = [medir('base')];

  wrapper.style.display = 'none';
  snaps.push(medir('agenda display:none'));

  wrapper.style.display = '';
  painel.style.flex = '0 0 auto';
  snaps.push(medir('painel sem flex-1'));

  painel.style.flex = '';
  wrapper.style.height = '1px';
  snaps.push(medir('wrapper height:1px'));

  wrapper.style.height = '';
  wrapper.style.alignSelf = 'start';
  snaps.push(medir('wrapper align-self:start'));

  return snaps;
});

console.log(JSON.stringify(resultado, null, 2));
await browser.close();
