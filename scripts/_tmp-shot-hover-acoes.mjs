/**
 * TEMPORÁRIO — evidência visual: card "Próximas ações" com cada item em hover,
 * recortado pelo retângulo REAL do card (lido no DOM).
 * Uso: node scripts/_tmp-shot-hover-acoes.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const SAIDA = 'tmp-hover-proximas-acoes';
mkdirSync(SAIDA, { recursive: true });

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1512, height: 1200 } });
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(4500);

const recorte = await page.evaluate(() => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const card = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Próximas ações')?.closest('section');
  const r = card.getBoundingClientRect();
  return { x: Math.round(r.x) - 8, y: Math.round(r.y) - 8, width: Math.round(r.width) + 16, height: Math.round(r.height) + 16 };
});
const itensCaixas = await page.evaluate(() => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const card = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Próximas ações')?.closest('section');
  return Array.from(card.querySelectorAll('button')).map((b) => {
    const r = b.getBoundingClientRect();
    return { cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2), rotulo: texto(b).slice(0, 30) };
  });
});
console.log('recorte do card:', JSON.stringify(recorte), '| itens:', JSON.stringify(itensCaixas));

await page.mouse.move(10, 10);
await page.evaluate(() => document.activeElement?.blur());
await page.waitForTimeout(500);
await page.screenshot({ path: `${SAIDA}/vis-normal.png`, clip: recorte });

for (let i = 0; i < itensCaixas.length; i += 1) {
  await page.mouse.move(itensCaixas[i].cx, itensCaixas[i].cy);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SAIDA}/vis-hover-${i + 1}.png`, clip: recorte });
  await page.mouse.move(10, 10);
  await page.waitForTimeout(400);
}
console.log('ok');
await contexto.close();
await browser.close();
