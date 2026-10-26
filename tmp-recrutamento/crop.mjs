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
await page.screenshot({
  path: 'tmp-recrutamento/recorte.jpg',
  type: 'jpeg',
  quality: 45,
  clip: { x: 280, y: 300, width: 720, height: 600 },
});
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
await page.screenshot({ path: 'tmp-recrutamento/mobile-corte.jpg', type: 'jpeg', quality: 45 });
await browser.close();
