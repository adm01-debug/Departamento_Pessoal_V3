/** TEMPORÁRIO — confirma o carregamento das famílias oficiais (sem fallback). */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1600, height: 1000 } });
await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
);
await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
const page = await context.newPage();
await page.goto('http://localhost:8080/dashboard', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

const fontes = await page.evaluate(async () => {
  await document.fonts.ready;
  const faces = [...document.fonts].map((f) => ({ familia: f.family, peso: f.weight, status: f.status }));
  return {
    status: document.fonts.status,
    faces,
    familiaBody: getComputedStyle(document.body).fontFamily,
    layoutEstavel: document.documentElement.scrollWidth <= window.innerWidth + 1,
  };
});
console.log(JSON.stringify(fontes, null, 2));
await browser.close();
