import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const SAIDA = 'tmp-auditoria';
mkdirSync(SAIDA, { recursive: true });
const log = (...args) => console.error('[rotas]', ...args);

const app = readFileSync('src/App.tsx', 'utf8');

// 1 · componentes lazy → arquivo da página
const lazyMap = new Map();
for (const m of app.matchAll(/const\s+(\w+)\s*=\s*(?:import\.meta\.env\.DEV\s*\?\s*)?lazy\(\(\)\s*=>\s*import\('@\/pages\/([^']+)'\)\)/g)) {
  lazyMap.set(m[1], m[2]);
}

// 2 · rotas → componente
const rotas = [];
const blocos = app.matchAll(/<Route\s+path="([^"]+)"([\s\S]*?)(?=\n\s*<Route\b|<\/Route>)/g);
for (const b of blocos) {
  const path = b[1];
  const componente = b[2].match(/Component=\{(\w+)\}/)?.[1] ?? null;
  if (!componente) continue;
  rotas.push({ path, componente, arquivo: lazyMap.get(componente) ?? null });
}

const testaveis = rotas.filter((r) => !r.path.includes(':') && !r.path.includes('*'));
log('rotas mapeadas:', rotas.length, 'testáveis:', testaveis.length);

writeFileSync(
  `${SAIDA}/inventario-rotas.json`,
  JSON.stringify({ totalRotas: rotas.length, testaveis, todas: rotas }, null, 2),
  'utf8'
);

const browser = await chromium.launch();
const results = [];

for (const rota of testaveis) {
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
  await page.route('**/*', (route) => route.continue());
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

  const consoleErrors = [];
  const pageErrors = [];
  const modulosNao200 = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('response', (res) => {
    const url = res.url();
    if ((url.includes('/src/') || url.includes('/node_modules/.vite/')) && res.status() >= 400) {
      modulosNao200.push({ url, status: res.status() });
    }
  });

  const url = `http://localhost:8080/${rota.path.replace(/^\//, '')}`;
  let navError = null;
  try {
    await page.goto(url, { waitUntil: 'commit', timeout: 45000 });
    await page.waitForTimeout(2200);
  } catch (e) {
    navError = e.message;
  }

  const estado = await page.evaluate(() => ({
    url: location.href,
    instabilidade: document.body.innerText.includes('Instabilidade Detectada'),
    erro400: document.body.innerText.includes('403') || document.body.innerText.includes('Acesso negado'),
  })).catch(() => ({ url: page.url(), instabilidade: false, erro400: false }));

  const falhaModulo =
    modulosNao200.length > 0 ||
    estado.instabilidade ||
    [...consoleErrors, ...pageErrors].some((t) =>
      /Failed to fetch dynamically imported module|Outdated Optimize Dep|error loading dynamically imported module/i.test(t)
    );

  if (falhaModulo) {
    await page.screenshot({ path: `${SAIDA}/falha-${rota.path.replace(/[\\/]/g, '_')}.png` }).catch(() => {});
  }

  results.push({
    path: rota.path,
    componente: rota.componente,
    arquivo: rota.arquivo,
    url,
    estado,
    navError,
    falhaModulo,
    modulosNao200,
    consoleErrors: consoleErrors.filter((t) =>
      /Failed to fetch|Outdated|import|504|500|Failed to load resource/i.test(t)
    ),
    pageErrors,
  });

  log(
    rota.path,
    falhaModulo ? 'FALHOU' : 'ok',
    estado.instabilidade ? '(instabilidade)' : '',
    modulosNao200.map((m) => `${m.status} ${m.url}`).join(' | ')
  );

  await context.close();
}

const falhas = results.filter((r) => r.falhaModulo);
writeFileSync(`${SAIDA}/auditoria-rotas.json`, JSON.stringify({ total: results.length, falhas: falhas.length, results }, null, 2), 'utf8');
log('TOTAL', results.length, 'FALHAS', falhas.length);
console.log(JSON.stringify({ total: results.length, falhas: falhas.map((f) => ({ path: f.path, modulosNao200: f.modulosNao200, estado: f.estado })) }, null, 2));

await browser.close();
