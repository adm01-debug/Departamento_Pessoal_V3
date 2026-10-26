import { chromium } from '@playwright/test';

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
page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 300));
});
await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
console.log('URL:', page.url());
console.log('BOARD:', await page.locator('[data-pipeline-board]').count());
console.log('CONCLUIDAS:', await page.locator('.kanban-coluna-concluida').count());
console.log('TEXTO:', (await page.locator('body').innerText()).slice(0, 400).replace(/\n+/g, ' | '));
console.log('HTML MAIN:', (await page.locator('#main-content').innerHTML().catch(() => 'SEM MAIN')).slice(0, 400));
await browser.close();
