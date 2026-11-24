/** TEMPORÁRIO — capturas comparativas das rotas para a auditoria tipográfica. */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8080';
const OUT = 'tmp-tipografia';
mkdirSync(OUT, { recursive: true });

const ROTAS = [
  ['dashboard', '/dashboard'],
  ['colaboradores', '/colaboradores'],
  ['avaliacao', '/avaliacao'],
  ['premiacoes-pagamentos', '/premiacoes#pagamentos'],
  ['banco-horas', '/banco-horas'],
  ['ponto', '/ponto'],
  ['provisoes', '/provisoes'],
  ['design-system', '/design-system'],
];

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

for (const [nome, rota] of ROTAS) {
  await page.goto(`${BASE}${rota.split('#')[0]}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  if (rota.includes('#pagamentos')) {
    await page.getByRole('tab', { name: /Pagamentos/ }).click();
    await page.getByRole('textbox', { name: 'Buscar pagamentos' }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(2400);
  }
  await page.screenshot({ path: `${OUT}/rota-${nome}.png` });
  console.log(nome, 'ok');
}

await browser.close();
