/** TEMPORÁRIO — captura da seção Tipografia do Design System. */
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
await page.goto('http://localhost:8080/design-system', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2600);
const titulo = page.getByText('Tipografia', { exact: true }).first();
await titulo.scrollIntoViewIfNeeded();
await page.waitForTimeout(700);
await page.screenshot({ path: 'tmp-tipografia/design-system-tipografia.png' });

const amostras = await page.evaluate(() => {
  const pegar = (sel) =>
    [...document.querySelectorAll(sel)].slice(0, 1).map((el) => ({
      classe: String(el.className),
      familia: getComputedStyle(el).fontFamily.replace(/["']/g, ''),
      tamanho: getComputedStyle(el).fontSize,
      peso: getComputedStyle(el).fontWeight,
      altura: getComputedStyle(el).lineHeight,
      espacamento: getComputedStyle(el).letterSpacing,
      numerico: getComputedStyle(el).fontVariantNumeric,
    }));
  return {
    display: pegar('.text-display'),
    h1: pegar('.text-h1'),
    body: pegar('.text-body'),
    label: pegar('.text-label'),
    numeric: pegar('.text-numeric'),
    badge: pegar('.text-badge'),
  };
});
console.log(JSON.stringify(amostras, null, 2));
await browser.close();
