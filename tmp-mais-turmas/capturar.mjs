/**
 * TEMPORÁRIO — captura e medição do card “Mais turmas em breve”.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-mais-turmas');
mkdirSync(SAIDA, { recursive: true });
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));

function medir() {
  const ret = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const coluna = document.querySelector('[data-turmas-coluna="andamento"]');
  const compl = document.querySelector('[data-mais-turmas-em-breve]');
  const cards = Array.from(coluna?.querySelectorAll('[data-turma-card]') ?? []);
  const contador = coluna?.querySelector('header span[title$="turma(s)"]');
  return {
    coluna: ret(coluna),
    cards: cards.map((el) => ({ id: el.getAttribute('data-turma-card'), ...ret(el) })),
    complementar: ret(compl),
    contador: contador?.textContent ?? null,
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    mainOverflow: (() => {
      const main = document.querySelector('main');
      return main ? main.scrollWidth - main.clientWidth : null;
    })(),
    ordemColuna: Array.from(coluna?.querySelectorAll('[data-turma-card], [data-mais-turmas-em-breve]') ?? []).map((el) =>
      el.hasAttribute('data-mais-turmas-em-breve') ? 'complementar' : el.getAttribute('data-turma-card')
    ),
    estilos: compl
      ? {
          borderStyle: getComputedStyle(compl).borderTopStyle,
          radius: getComputedStyle(compl).borderTopLeftRadius,
          height: getComputedStyle(compl).height,
          width: getComputedStyle(compl).width,
        }
      : null,
    botao: !!document.querySelector('[data-mais-turmas-em-breve] button'),
  };
}

const browser = await chromium.launch();
const contexto = await browser.newContext({
  storageState: state,
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 1,
});
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Turmas \/ Instâncias/i }).click();
await page.waitForTimeout(2200);
await page.evaluate(() => {
  window.scrollTo(0, 0);
  const main = document.querySelector('main');
  if (main) main.scrollTo(0, 0);
});
console.log(JSON.stringify(await page.evaluate(medir), null, 2));
await page.screenshot({ path: path.join(SAIDA, 'turmas-1600.png') });

const caixa = await page.locator('[data-mais-turmas-em-breve]').boundingBox();
if (caixa) {
  await page.evaluate((y) => {
    const main = document.querySelector('main');
    if (main) main.scrollTo(0, y - 240);
    else window.scrollTo(0, y - 240);
  }, caixa.y);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SAIDA, 'turmas-rolado-1600.png') });
  const caixa2 = await page.locator('[data-mais-turmas-em-breve]').boundingBox();
  if (caixa2) {
    await page.screenshot({
      path: path.join(SAIDA, 'card-1600.png'),
      clip: {
        x: Math.max(0, caixa2.x - 200),
        y: Math.max(0, caixa2.y - 60),
        width: 760,
        height: Math.min(640, 900 - Math.max(0, caixa2.y - 60)),
      },
    });
  }
}

await contexto.close();
await browser.close();
