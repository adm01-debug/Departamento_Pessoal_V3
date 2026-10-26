import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const SAIDA = 'tmp-auditoria';
mkdirSync(SAIDA, { recursive: true });

const log = (...args) => console.error('[premiacoes]', ...args);
const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
});

const page = await context.newPage();
page.setDefaultTimeout(60000);
const pageErrors = [];
const consoleErrors = [];
const falhas = [];
const modulos = [];

page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('requestfailed', (request) => {
  falhas.push({
    url: request.url(),
    metodo: request.method(),
    erro: request.failure()?.errorText ?? 'desconhecido',
    tipo: request.resourceType(),
  });
});
page.on('response', (response) => {
  const url = response.url();
  if (url.includes('/src/') || url.includes('/node_modules/.vite/')) {
    if (response.status() >= 400) {
      modulos.push({ url, status: response.status() });
    }
  }
});

log('goto');
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'commit', timeout: 60000 });
log('commit');
await page.waitForTimeout(6000);

const estado = await page.evaluate(() => ({
  url: location.href,
  titulo: document.title,
  instabilidade: document.body.innerText.includes('Instabilidade Detectada'),
  login: document.body.innerText.includes('Entrar') || location.pathname === '/login',
  textoInicial: document.body.innerText.slice(0, 400),
}));

await page.screenshot({ path: `${SAIDA}/premiacoes-reproducao.png`, fullPage: false });

const resultado = { estado, pageErrors, consoleErrors, falhas, modulosNao200: modulos };
writeFileSync(`${SAIDA}/premiacoes-reproducao.json`, JSON.stringify(resultado, null, 2), 'utf8');
log(JSON.stringify(resultado, null, 2));

await context.close();
await browser.close();
