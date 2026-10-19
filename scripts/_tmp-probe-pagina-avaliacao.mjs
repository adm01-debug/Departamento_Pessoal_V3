/** TEMPORÁRIO — probe: a página /avaliacao carrega? (erros de runtime) */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const browser = await chromium.launch();
const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1440, height: 950 } });
await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
);
await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
const page = await context.newPage();
const erros = [];
page.on('console', (m) => {
  if (m.type() === 'error') erros.push(['console', m.text().slice(0, 400)]);
});
page.on('pageerror', (e) => erros.push(['pageerror', String(e).slice(0, 600)]));

const saida = {};
try {
  await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  saida.temHeading = await page
    .getByRole('heading', { name: /Gestão de Desempenho/ })
    .isVisible()
    .catch(() => false);
  saida.overlayVite = await page.evaluate(() => Boolean(document.querySelector('vite-error-overlay')));
  saida.textoInicial = await page.evaluate(() => (document.body.innerText ?? '').slice(0, 400));
  saida.erros = erros;
  await page.screenshot({ path: 'tmp-encaminhamento-automatico/probe-pagina.png' });
} catch (erro) {
  saida.erro = String(erro?.message ?? erro).slice(0, 400);
} finally {
  await browser.close();
  writeFileSync('tmp-encaminhamento-automatico/probe-pagina.json', JSON.stringify(saida, null, 2));
  console.log(JSON.stringify(saida, null, 2));
}
