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

await page.locator('[data-pipeline-board]').scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await page.screenshot({ path: 'tmp-recrutamento/pipeline-completo.png' });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(700);
await page.locator('[data-pipeline-board]').scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await page.screenshot({ path: 'tmp-recrutamento/pipeline-mobile.png' });

await browser.close();
