/** TEMPORÁRIO — probe: a janela "Pendências" é alcançável? */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'tmp-probe-pendencias';
mkdirSync(OUT, { recursive: true });
const relat = [];
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1440, height: 950 } });
await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
);
await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
const page = await context.newPage();

try {
  await page.goto('http://localhost:8080/colaboradores', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const linhas = await page.getByRole('row').count();
  relat.push({ passo: 'linhas-na-listagem', linhas });

  let navegou = false;
  for (let i = 1; i < Math.min(linhas, 6) && !navegou; i += 1) {
    await page
      .getByRole('row')
      .nth(i)
      .click()
      .catch(() => {});
    await page.waitForTimeout(2200);
    navegou = /\/colaboradores\/([0-9a-f-]{8}|mock-\d+)/i.test(page.url());
    relat.push({ passo: `clique-linha-${i}`, url: page.url().replace('http://localhost:8080', ''), navegou });
  }
  const href = navegou ? page.url().replace('http://localhost:8080', '') : null;
  if (href) {
    await page.goto(`http://localhost:8080${href}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const verTodas = page.getByRole('button', { name: 'Ver todas' }).first();
    const achou = await verTodas.isVisible().catch(() => false);
    relat.push({ passo: 'botao-Ver-todas', achou });
    if (achou) {
      await verTodas.click();
      await page.waitForTimeout(2600);
      relat.push({
        passo: 'popup',
        quantos: await page.locator('[role="dialog"]').count(),
        titulo: await page
          .getByRole('dialog')
          .last()
          .innerText()
          .then((t) => t.replace(/\s+/g, ' ').slice(0, 80))
          .catch(() => null),
      });
      await page.screenshot({ path: `${OUT}/pendencias.png` });
    }
  }
} catch (erro) {
  relat.push({ passo: 'erro', detalhe: String(erro?.message ?? erro).slice(0, 300) });
} finally {
  await browser.close();
  writeFileSync(`${OUT}/relatorio.json`, JSON.stringify(relat, null, 2));
  console.log(JSON.stringify(relat, null, 2));
}
