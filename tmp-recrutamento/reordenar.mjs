import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'off');
});
const page = await context.newPage();
await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);

const ordem = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-pipeline-coluna="triagem"] [data-candidato-card]')].map((c) =>
      c.getAttribute('data-candidato-card')
    )
  );

const antes = await ordem();
const primeiro = page.locator('[data-pipeline-coluna="triagem"] [data-candidato-card]').first();
const segundo = page.locator('[data-pipeline-coluna="triagem"] [data-candidato-card]').nth(1);
const caixaPrimeiro = await primeiro.boundingBox();
const caixaSegundo = await segundo.boundingBox();

await page.mouse.move(caixaPrimeiro.x + 26, caixaPrimeiro.y + 32);
await page.mouse.down();
await page.mouse.move(caixaPrimeiro.x + 36, caixaPrimeiro.y + 44, { steps: 4 });
await page.waitForTimeout(150);
// Solta na metade inferior do segundo card -> posição seguinte a ele.
await page.mouse.move(caixaSegundo.x + caixaSegundo.width / 2, caixaSegundo.y + caixaSegundo.height - 12, {
  steps: 12,
});
await page.waitForTimeout(300);
console.log(
  'INDICADOR:',
  await page.evaluate(() => document.querySelectorAll('[data-pipeline-indicador]').length)
);
await page.mouse.up();
await page.waitForTimeout(1000);

const depois = await ordem();
console.log('REORDENAR', JSON.stringify({ antes, depois, mudou: antes.join('|') !== depois.join('|') }));
console.log(
  'SEM DUPLICATA:',
  await page.locator('[data-pipeline-board] [data-candidato-card]').count()
);
await page.screenshot({ path: 'tmp-recrutamento/dnd-final/12-reordenacao.png' });
await browser.close();
