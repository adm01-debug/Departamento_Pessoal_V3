/**
 * TEMPORÁRIO — screenshot limpo (após a cascata de entrada) da aba Pagamentos
 * + checagem de sobreposição nos KPI cards.
 * Uso: node scripts/_tmp-shot-limpo.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const SAIDA = 'tmp-paginacao-6';
mkdirSync(SAIDA, { recursive: true });

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1456, height: 1000 } });
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(5000);

const sobreposicao = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('main section'));
  const caixas = cards.map((el) => ({ t: el.getBoundingClientRect().top, b: el.getBoundingClientRect().bottom, x: el.getBoundingClientRect().left, w: el.getBoundingClientRect().width }));
  const colisoes = [];
  for (let i = 0; i < caixas.length; i += 1) {
    for (let j = i + 1; j < caixas.length; j += 1) {
      const a = caixas[i];
      const b = caixas[j];
      const sobrepoeX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 4;
      const sobrepoeY = Math.min(a.b, b.b) - Math.max(a.t, b.t) > 4;
      if (sobrepoeX && sobrepoeY) colisoes.push([Math.round(a.t), Math.round(b.t)]);
    }
  }
  return colisoes;
});
console.log('colisoes:', JSON.stringify(sobreposicao));
await page.screenshot({ path: `${SAIDA}/desktop-limpo.png`, fullPage: true });
await contexto.close();
await browser.close();
