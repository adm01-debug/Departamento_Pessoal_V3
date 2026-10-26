import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const PASTA = 'tmp-recrutamento/dnd-final';
mkdirSync(PASTA, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices['Pixel 5'],
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 390, height: 844 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'off');
});
const page = await context.newPage();
page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
const cdp = await context.newCDPSession(page);

await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4500);

const medir = () =>
  page.evaluate(() => {
    const main = document.querySelector('main');
    const alca = document.querySelector('[data-pipeline-alca]');
    return {
      scrollTop: main?.scrollTop,
      ponteiroCoarse: matchMedia('(pointer: coarse)').matches,
      alcaDisplay: alca ? getComputedStyle(alca).display : 'sem-alca',
      cardTriagem: document.querySelectorAll('[data-pipeline-coluna="triagem"] [data-candidato-card]').length,
      cardEntrevista: document.querySelectorAll('[data-pipeline-coluna="entrevista"] [data-candidato-card]').length,
    };
  });

console.log('INICIAL', JSON.stringify(await medir()));

async function toque(x, y) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
}
async function moverToque(x, y) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
}
async function soltarToque() {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

// Teste J1 — swipe vertical sobre o card rola a PÁGINA (não o board).
const card = await page.locator('[data-pipeline-coluna="triagem"] [data-candidato-card]').first().boundingBox();
await page.evaluate(() => {
  const main = document.querySelector('main');
  if (main) main.scrollTop = 0;
});
await page.waitForTimeout(250);
const xSwipe = card.x + 40;
const ySwipe = card.y + 40;
await toque(xSwipe, ySwipe);
for (let i = 1; i <= 8; i += 1) {
  await moverToque(xSwipe, ySwipe - i * 25);
  await page.waitForTimeout(16);
}
await soltarToque();
await page.waitForTimeout(500);
console.log('SWIPE VERTICAL', JSON.stringify(await medir()));
await page.screenshot({ path: `${PASTA}/10-mobile-swipe.png` });

// Teste J2 — arraste por toque na alça (touch-action:none só nela).
await page.evaluate(() => {
  const main = document.querySelector('main');
  if (main) main.scrollTop = 0;
});
await page.waitForTimeout(300);
const cardAntes = await page.locator('[data-pipeline-coluna="triagem"] [data-candidato-card]').first().boundingBox();
const id = await page
  .locator('[data-pipeline-coluna="triagem"] [data-candidato-card]')
  .first()
  .getAttribute('data-candidato-card');
const alca = await page
  .locator('[data-pipeline-coluna="triagem"] [data-candidato-card]')
  .first()
  .locator('[data-pipeline-alca]')
  .boundingBox();
const destino = await page.locator('[data-pipeline-coluna="entrevista"] [data-pipeline-lista]').boundingBox();
console.log('ALCA TOQUE', JSON.stringify(alca), 'CARD', JSON.stringify(cardAntes), 'ID', id, 'DESTINO', JSON.stringify(destino));
if (alca) {
  const larguraViewport = page.viewportSize().width;
  const alvoX = Math.min(destino.x + 24, larguraViewport - 12);
  const alvoY = Math.min(destino.y + 60, page.viewportSize().height - 40);
  await toque(alca.x + alca.width / 2, alca.y + alca.height / 2);
  for (let i = 1; i <= 14; i += 1) {
    const x = alca.x + alca.width / 2 + ((alvoX - (alca.x + alca.width / 2)) * i) / 14;
    const y = alca.y + alca.height / 2 + ((alvoY - (alca.y + alca.height / 2)) * i) / 14;
    await moverToque(x, y);
    await page.waitForTimeout(24);
  }
  await page.waitForTimeout(300);
  console.log('DURANTE TOQUE', JSON.stringify(await page.evaluate(() => ({
    overlay: document.querySelectorAll('[data-pipeline-arrastado]').length,
    drop: document.querySelectorAll('[data-pipeline-drop="true"]').length,
    scrollTop: document.querySelector('main')?.scrollTop,
  }))));
  await soltarToque();
  await page.waitForTimeout(1300);
}
const depois = await page.evaluate((cardId) => {
  const main = document.querySelector('main');
  return {
    scrollTop: main?.scrollTop,
    destino: document.querySelectorAll(`[data-pipeline-coluna="entrevista"] [data-candidato-card="${cardId}"]`).length,
    origem: document.querySelectorAll(`[data-pipeline-coluna="triagem"] [data-candidato-card="${cardId}"]`).length,
    total: document.querySelectorAll('[data-pipeline-board] [data-candidato-card]').length,
    overlay: document.querySelectorAll('[data-pipeline-arrastado]').length,
  };
}, id);
console.log('TOUCH DRAG', JSON.stringify(depois));
await page.screenshot({ path: `${PASTA}/11-mobile-touch-drag.png` });

await browser.close();
