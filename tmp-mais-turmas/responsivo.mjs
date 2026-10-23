/**
 * TEMPORÁRIO — responsividade do card “Mais turmas em breve”.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-mais-turmas');
mkdirSync(SAIDA, { recursive: true });
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));

for (const [w, h] of [
  [1440, 900],
  [1024, 768],
  [768, 1024],
  [390, 844],
]) {
  const browser = await chromium.launch();
  const contexto = await browser.newContext({ storageState: state, viewport: { width: w, height: h } });
  const page = await contexto.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor({ timeout: 30_000 });
  await page.getByRole('tab', { name: /Turmas \/ Instâncias/i }).click();
  await page.waitForTimeout(2200);

  const dados = await page.evaluate(() => {
    const compl = document.querySelector('[data-mais-turmas-em-breve]');
    const coluna = compl?.closest('[data-turmas-coluna]');
    const ret = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const ultimoCard = coluna?.querySelector('[data-turma-card]:last-of-type, [data-turma-card]');
    return {
      coluna: coluna?.getAttribute('data-turmas-coluna') ?? null,
      complementar: ret(compl),
      cardReferencia: ret(ultimoCard),
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      mainOverflow: (() => {
        const main = document.querySelector('main');
        return main ? main.scrollWidth - main.clientWidth : null;
      })(),
    };
  });
  console.log(JSON.stringify({ viewport: `${w}x${h}`, ...dados }));

  const compl = page.locator('[data-mais-turmas-em-breve]');
  await compl.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SAIDA, `card-${w}x${h}.png`) });

  await contexto.close();
  await browser.close();
}
