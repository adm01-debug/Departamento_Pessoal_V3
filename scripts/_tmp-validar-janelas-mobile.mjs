/** TEMPORÁRIO — responsividade das janelas de Premiações (390 px). */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8080';
const OUT = 'tmp-janelas-premiacoes';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 390, height: 844 } });
await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
);
await context.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
const page = await context.newPage();
await page.goto(`${BASE}/premiacoes`, { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
await page.waitForTimeout(2400);

const medir = () =>
  page.getByRole('dialog').last().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      largura: Math.round(r.width),
      altura: Math.round(r.height),
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      viewport: { w: window.innerWidth, h: window.innerHeight },
      cabeNaHorizontal: r.left >= -1 && r.right <= window.innerWidth + 1,
      cabeNaVertical: r.top >= -1 && r.bottom <= window.innerHeight + 1,
      rolagemPagina: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });

await page.getByRole('button', { name: /Nova Campanha/ }).click();
await page.getByRole('dialog').last().waitFor({ timeout: 15000 });
await page.waitForTimeout(1500);
console.log('nova-campanha-390', JSON.stringify(await medir()));
await page.screenshot({ path: `${OUT}/mobile-nova-campanha.png` });
await page.keyboard.press('Escape');
await page.waitForTimeout(1800);

await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.getByRole('textbox', { name: 'Buscar pagamentos' }).waitFor({ timeout: 15000 });
await page.waitForTimeout(2400);
await page.locator('button[aria-label^="Mais ações para"]').first().click();
await page.getByRole('menuitem', { name: /Ver detalhes/ }).click();
await page.getByRole('dialog').last().waitFor({ timeout: 15000 });
await page.waitForTimeout(1500);
console.log('detalhes-pagamento-390', JSON.stringify(await medir()));
await page.screenshot({ path: `${OUT}/mobile-detalhes-pagamento.png` });

await context.close();
await browser.close();
