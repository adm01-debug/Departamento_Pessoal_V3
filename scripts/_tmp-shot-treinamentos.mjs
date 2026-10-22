/**
 * TEMPORÁRIO — screenshots e medições do Hub de Treinamentos.
 *
 * Cada largura roda em um CONTEXTO próprio (viewport fixo): o app usa um
 * fingerprint de sessão que inclui `screen.width/height`, então redimensionar
 * a janela no mesmo contexto dispara `session_anomaly`. O estado de auth é
 * atualizado a cada contexto para não reutilizar refresh token já rotacionado.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const SAIDA = 'tmp-treinamentos-redesign';
mkdirSync(SAIDA, { recursive: true });

const browser = await chromium.launch();

async function entrar() {
  const contexto = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await contexto.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto('http://localhost:8080/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/e-?mail/i).first().fill('admin@teste.local');
  await page.getByLabel(/senha|password/i).first().fill('Admin@2026!');
  await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
  await page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith('sb-')), undefined, {
    timeout: 15_000,
  });
  const state = await contexto.storageState();
  await contexto.close();
  return state;
}

const erros = [];
let state = await entrar();

for (const [w, h, nome] of [
  [1920, 1080, 'treinamentos-1920'],
  [1600, 900, 'treinamentos-1600'],
  [1440, 900, 'treinamentos-1440'],
  [1366, 768, 'treinamentos-1366'],
  [1280, 800, 'treinamentos-1280'],
  [1024, 768, 'treinamentos-1024'],
  [390, 844, 'treinamentos-390'],
]) {
  const contexto = await browser.newContext({ storageState: state, viewport: { width: w, height: h } });
  const page = await contexto.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') erros.push(msg.text());
  });
  page.on('pageerror', (err) => erros.push(`pageerror: ${err.message}`));
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });

  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(2200);

  const medidas = await page.evaluate(() => {
    const kpis = Array.from(document.querySelectorAll('[data-kpi]')).map((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });
    const list = document.querySelector('[role="tablist"]');
    const lr = list?.getBoundingClientRect();
    const aba = list?.querySelector('[role="tab"]');
    const ar = aba?.getBoundingClientRect();
    const main = document.querySelector('main');
    return {
      kpis,
      tablist: lr ? { w: Math.round(lr.width), h: Math.round(lr.height) } : null,
      aba: ar ? { w: Math.round(ar.width), h: Math.round(ar.height) } : null,
      doc: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth },
      main: main ? { scrollWidth: main.scrollWidth, clientWidth: main.clientWidth } : null,
    };
  });
  console.log(nome, JSON.stringify(medidas));
  await page.screenshot({ path: `${SAIDA}/${nome}.png` });

  state = await contexto.storageState();
  await contexto.close();
}

console.log('ERROS', JSON.stringify([...new Set(erros)]));
await browser.close();
