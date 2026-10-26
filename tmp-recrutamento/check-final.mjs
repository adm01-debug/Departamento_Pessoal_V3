import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const page = await context.newPage();
await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);

const medir = () =>
  page.evaluate(() => {
    const rect = (el) => (el ? el.getBoundingClientRect() : null);
    const board = document.querySelector('[data-pipeline-board]');
    const colunas = [...document.querySelectorAll('[data-pipeline-coluna]')];
    const listas = [...document.querySelectorAll('[data-pipeline-lista]')];
    const rodapes = [...document.querySelectorAll('[data-pipeline-rodape]')];
    return {
      boardH: Math.round(rect(board).height),
      colunas: colunas.map((coluna, i) => ({
        id: coluna.getAttribute('data-pipeline-coluna'),
        top: Math.round(rect(coluna).top),
        bottom: Math.round(rect(coluna).bottom),
        h: Math.round(rect(coluna).height),
        rodape: Math.round(rect(rodapes[i]).bottom),
        scroll: listas[i].scrollHeight > listas[i].clientHeight,
        client: listas[i].clientHeight,
        scrollH: listas[i].scrollHeight,
      })),
      cards: [...document.querySelectorAll('[data-candidato-card]')].map((c) => Math.round(rect(c).height)),
    };
  });

for (const [width, height] of [
  [1440, 900],
  [1366, 768],
  [390, 844],
]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(800);
  console.log(`${width}x${height}`, JSON.stringify(await medir(), null, 2));
  await page.screenshot({ path: `tmp-recrutamento/final-${width}.jpg`, type: 'jpeg', quality: 55 });
}

await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(500);
await page.getByLabel('Buscar candidatos').fill('React');
await page.waitForTimeout(700);
await page.screenshot({ path: 'tmp-recrutamento/final-busca.jpg', type: 'jpeg', quality: 55 });
console.log(
  'BUSCA',
  await page.evaluate(() => ({
    cards: document.querySelectorAll('[data-candidato-card]').length,
    alturas: [...document.querySelectorAll('[data-pipeline-coluna]')].map((c) => Math.round(c.getBoundingClientRect().height)),
  }))
);

await browser.close();
