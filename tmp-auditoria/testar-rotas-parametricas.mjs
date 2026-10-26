import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const rotas = [
  '/assinar-contrato/token-inexistente-e2e',
  '/verificar-contrato/hash-inexistente-e2e',
  '/ciencia-medida/token-inexistente-e2e',
  '/colaboradores/editar/id-inexistente-e2e',
  '/colaboradores/id-inexistente-e2e',
  '/empresas/editar/id-inexistente-e2e',
  '/rota-inexistente-e2e',
];

const log = (...args) => console.error('[parametricas]', ...args);
const browser = await chromium.launch();
const results = [];

for (const path of rotas) {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

  const erros = [];
  const modulos = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('response', (r) => {
    const u = r.url();
    if ((u.includes('/src/') || u.includes('/node_modules/.vite/')) && r.status() >= 400) {
      modulos.push({ url: u, status: r.status() });
    }
  });

  let navError = null;
  try {
    await page.goto(`http://localhost:8080${path}`, { waitUntil: 'commit', timeout: 45000 });
    await page.waitForTimeout(2200);
  } catch (e) {
    navError = e.message;
  }

  const estado = await page
    .evaluate(() => ({
      url: location.href,
      instabilidade: document.body.innerText.includes('Instabilidade Detectada'),
    }))
    .catch(() => ({ url: page.url(), instabilidade: false }));

  const falha =
    estado.instabilidade ||
    modulos.length > 0 ||
    [...erros].some((t) =>
      /Failed to fetch dynamically imported module|Outdated Optimize Dep/i.test(t)
    );

  results.push({ path, estado, navError, falha, modulos, erros: erros.filter((t) => /Failed to fetch|Outdated|504/i.test(t)) });
  log(path, falha ? 'FALHOU' : 'ok', estado.url);
  await context.close();
}

writeFileSync('tmp-auditoria/parametricas.json', JSON.stringify(results, null, 2), 'utf8');
console.log(JSON.stringify({ total: results.length, falhas: results.filter((r) => r.falha).length, results }, null, 2));
await browser.close();
