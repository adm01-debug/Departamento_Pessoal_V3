/** TEMPORÁRIO — screenshots finais (1366/1024 e seleção ativa). */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const SAIDA = 'tmp-pagamentos-grid';
mkdirSync(SAIDA, { recursive: true });
const browser = await chromium.launch();
const contexto = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  storageState: 'e2e/.auth/user.json',
});
await contexto.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
const page = await contexto.newPage();
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: /^Pagamentos$/ }).click();
await page.getByRole('table', { name: 'Pagamentos' }).waitFor({ timeout: 30000 });
await page.waitForTimeout(2400);
await page.screenshot({ path: `${SAIDA}/depois-1366.png` });

await page.setViewportSize({ width: 1024, height: 768 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${SAIDA}/depois-1024.png` });

await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(800);
await page.getByRole('checkbox', { name: /Selecionar pagamento de/ }).first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${SAIDA}/depois-selecao-1440.png` });

await browser.close();
