/**
 * TEMPORÁRIO — captura final (browser novo por viewport para evitar crash de
 * renderer em execuções longas de Playwright).
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-turmas-redesign');
mkdirSync(SAIDA, { recursive: true });
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const erros = [];

function medir() {
  const cards = Array.from(document.querySelectorAll('[data-turma-card]'));
  const ret = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const grid = document.querySelector('[data-turmas-grid]');
  const agenda = document.querySelector('[data-turmas-agenda]');
  const main = document.querySelector('main');
  return {
    cards: cards.map((el) => ({ id: el.getAttribute('data-turma-card'), ...ret(el) })),
    colunas: Array.from(document.querySelectorAll('[data-turmas-coluna]')).map((el) => ({
      nome: el.getAttribute('data-turmas-coluna'),
      ...ret(el),
    })),
    agenda: agenda ? ret(agenda) : null,
    gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    mainOverflow: main ? main.scrollWidth - main.clientWidth : null,
  };
}

async function entrar(browser, w, h) {
  const contexto = await browser.newContext({
    storageState: state,
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
  });
  const page = await contexto.newPage();
  page.on('pageerror', (err) => erros.push(`pageerror: ${err.message}`));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor({ timeout: 30_000 });
  await page.getByRole('tab', { name: /Turmas \/ Instâncias/i }).click();
  await page.waitForTimeout(1800);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const main = document.querySelector('main');
    if (main) main.scrollTo(0, 0);
  });
  return { contexto, page };
}

for (const [w, h] of [
  [1920, 1080],
  [1600, 900],
  [1440, 900],
  [1366, 768],
  [1280, 800],
  [1024, 768],
  [768, 1024],
  [390, 844],
]) {
  const browser = await chromium.launch();
  const { contexto, page } = await entrar(browser, w, h);
  const medidas = await page.evaluate(medir);
  console.log(JSON.stringify({ viewport: `${w}x${h}`, ...medidas }));
  await page.screenshot({ path: path.join(SAIDA, `turmas-${w}x${h}.png`) });
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo(0, main.scrollHeight);
    else window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SAIDA, `turmas-${w}x${h}-base.png`) });
  await contexto.close();
  await browser.close();
}
