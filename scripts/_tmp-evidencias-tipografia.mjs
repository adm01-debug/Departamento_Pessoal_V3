/** TEMPORÁRIO — evidência visual: tabela de Pagamentos + janela de Detalhes. */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1600, height: 1000 } });
await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
);
await context.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
const page = await context.newPage();
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.getByRole('textbox', { name: 'Buscar pagamentos' }).waitFor({ timeout: 15000 });
await page.waitForTimeout(2600);
await page.screenshot({ path: 'tmp-tipografia/pagamentos-tabela.png' });

await page.locator('button[aria-label^="Mais ações para"]').first().click();
await page.getByRole('menuitem', { name: /Ver detalhes/ }).click();
await page.getByRole('dialog').last().waitFor({ timeout: 15000 });
await page.waitForTimeout(1800);
await page.screenshot({ path: 'tmp-tipografia/detalhes-pagamento.png' });

const corte = await page.getByRole('dialog').last().evaluate((el) => {
  const estourados = [...el.querySelectorAll('dd, dt')]
    .map((n) => ({ texto: (n.textContent || '').trim().slice(0, 30), corte: n.scrollWidth > n.clientWidth + 1 }))
    .filter((n) => n.corte);
  return { estourados, familia: getComputedStyle(el.querySelector('dd')).fontFamily, numerico: getComputedStyle(el.querySelector('dd')).fontVariantNumeric };
});
console.log('DETALHE:', JSON.stringify(corte));

await browser.close();
