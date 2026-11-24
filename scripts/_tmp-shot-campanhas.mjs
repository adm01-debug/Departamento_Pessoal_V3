/**
 * TEMPORÁRIO — screenshots do módulo Campanhas em várias larguras.
 * Uso: node scripts/_tmp-shot-campanhas.mjs
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const larguras = process.argv.slice(2).map(Number);
for (const largura of larguras.length ? larguras : [1440]) {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: largura, height: 1040 },
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `tmp-campanhas-${largura}.png`, fullPage: false });
  await context.close();
}
console.log('ok');
await browser.close();
