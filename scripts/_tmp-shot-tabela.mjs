/**
 * TEMPORÁRIO — recorte da tabela (e do rodapé) na viewport de referência, para
 * comparar tipografia/espaçamento com a imagem aprovada.
 * Uso: node scripts/_tmp-shot-tabela.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const SAIDA = 'tmp-tabela-ui';
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
await page.waitForTimeout(5000);

const card = await page.locator('table').first().locator('xpath=ancestor::section[1]');
await card.screenshot({ path: `${SAIDA}/tabela-final.png` });
await page.screenshot({ path: `${SAIDA}/pagina-final.png`, fullPage: true });

// Recorte do topo da tabela (cabeçalho + 3 linhas) em zoom para inspeção fina
const r = await card.boundingBox();
await page.screenshot({ path: `${SAIDA}/tabela-topo.png`, clip: { x: r.x, y: r.y, width: r.width, height: 240 } });

await page.setViewportSize({ width: 1280, height: 1200 });
await page.waitForTimeout(900);
await page.screenshot({ path: `${SAIDA}/tabela-1280.png`, fullPage: true });
console.log('ok');
await contexto.close();
await browser.close();
