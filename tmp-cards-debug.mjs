/** DEBUG TEMPORÁRIO (apagar no fim): o que a tela /admissoes mostra de fato. */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = 'http://localhost:8080';
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1100 },
  storageState: fs.existsSync('e2e/.auth/user.json') ? 'e2e/.auth/user.json' : undefined,
});
await ctx.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
const page = await ctx.newPage();
page.on('console', (m) => console.log(`[${m.type()}]`, m.text().slice(0, 200)));
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await page.goto(`${BASE}/admissoes`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

console.log('URL:', page.url());
console.log('TITULO:', await page.title());
console.log('H1/H2:', (await page.locator('h1,h2').allInnerTexts()).slice(0, 6));
console.log('BOTOES:', (await page.getByRole('button').allInnerTexts()).slice(0, 25));
console.log('TABS:', (await page.getByRole('tab').allInnerTexts()).slice(0, 25));
console.log('TEXTO "Cards" em algum lugar?', await page.getByText('Cards', { exact: true }).count());
console.log('BODY (600 chars):', (await page.locator('body').innerText()).slice(0, 600).replace(/\n+/g, ' | '));
fs.writeFileSync('tmp-debug-admissoes.png', await page.screenshot({ fullPage: false }));
await browser.close();
