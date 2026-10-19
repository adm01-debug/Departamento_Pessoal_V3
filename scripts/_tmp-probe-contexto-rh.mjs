/** TEMPORÁRIO — probe do contexto RH: decisão local presente? versão? */
import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'tmp-encaminhamento-automatico/perfil-admin.json',
  viewport: { width: 1440, height: 950 },
});
await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['rh']) })
);
await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
const page = await context.newPage();
const out = {};
await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Gestão de Desempenho/ }).waitFor({ timeout: 30000 });
await page.getByRole('tab', { name: /Feedbacks/i }).click();
await page.waitForTimeout(1600);
await page
  .getByRole('group', { name: 'Segmentar por tipo de feedback' })
  .getByRole('button', { name: /Aguardando gestor/ })
  .first()
  .click();
await page.waitForTimeout(2200);
out.store = await page.evaluate(() =>
  Object.keys(localStorage)
    .filter((k) => k.startsWith('dp-desempenho'))
    .map((k) => k + ' => ' + (localStorage.getItem(k) ?? '').slice(0, 160))
);
out.rows = await page.evaluate(() =>
  Array.from(document.querySelectorAll('div[class*="rounded-xl"]'))
    .filter((el) => /gestor responsável/i.test(el.innerText ?? ''))
    .map((el) => ({
      nome: (el.querySelector('h3')?.textContent ?? '').trim(),
      selo: (el.querySelector('[role="status"]')?.textContent ?? '').trim(),
      titulo: (el.querySelector('[role="status"]')?.parentElement?.getAttribute('title') ?? '').slice(0, 200),
      botoes: Array.from(el.querySelectorAll('button')).map((b) => (b.textContent ?? '').trim()),
    }))
);
console.log(JSON.stringify(out, null, 2).slice(0, 4000));
await browser.close();
