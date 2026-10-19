/**
 * TEMPORÁRIO — sequência de quadros da entrada em cascata (Campanhas e
 * Pagamentos), tirada na MESMA resolução, para comparar com Desligamentos.
 * Uso: node scripts/_tmp-frames-animacao.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const SAIDA = 'tmp-animacao';
mkdirSync(SAIDA, { recursive: true });

const recorte = (page) => page.evaluate(() => {
  const t = document.querySelector('table');
  const r = t.querySelectorAll('tbody tr')[0].getBoundingClientRect();
  const ult = t.querySelectorAll('tbody tr');
  const b = ult[ult.length - 1].getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y) - 4, width: Math.round(r.width), height: Math.round(b.bottom - r.top) + 8 };
});

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1512, height: 1200 } });
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});

const sequencia = async (prefixo) => {
  for (const ms of [0, 250, 500, 800, 1300]) {
    if (ms > 0) await page.waitForTimeout(ms === 250 ? 250 : ms - [0, 250, 500, 800, 1300][[0, 250, 500, 800, 1300].indexOf(ms) - 1]);
    await page.screenshot({ path: `${SAIDA}/${prefixo}-${String(ms).padStart(4, '0')}ms.png`, clip: await recorte(page) });
  }
};

// Referência
await page.goto('http://localhost:8080/desligamentos', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3800);
await sequencia('desligamentos');

// Campanhas
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /^Campanhas/ }).click();
await page.waitForTimeout(5000);
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(2600);
await sequencia('pagamentos');

console.log('ok');
await contexto.close();
await browser.close();
