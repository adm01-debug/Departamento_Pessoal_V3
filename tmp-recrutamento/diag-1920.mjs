import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1920, height: 1080 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
});
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 200));
});
await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
console.log('URL:', page.url());
console.log('BOARD:', await page.locator('[data-pipeline-board]').count());
console.log('COLUNAS:', await page.locator('[data-pipeline-coluna]').count());
console.log('TEXTO:', (await page.locator('body').innerText()).slice(0, 260).replace(/\n+/g, ' | '));
console.log(
  'TAMANHO:',
  await page.evaluate(() => {
    const board = document.querySelector('[data-pipeline-board]');
    if (!board) return null;
    const r = board.getBoundingClientRect();
    return { w: r.width, h: r.height, top: r.top, display: getComputedStyle(board).display };
  })
);
await browser.close();
