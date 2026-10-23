import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto('http://localhost:8080/colaboradores/mock-1', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.getByRole('button', { name: 'Ver todas' }).first().click();
await page.waitForTimeout(80);
const entrada = await page.evaluate(() => {
  const d = document.querySelector('[role="dialog"]');
  const overlay = [...document.querySelectorAll('div')].find(
    (x) => String(x.className).includes('fixed inset-0 z-50') && String(x.className).includes('backdrop-blur-sm')
  );
  return d
    ? {
        transform: getComputedStyle(d).transform,
        opacity: getComputedStyle(d).opacity,
        overlay: overlay ? getComputedStyle(overlay).opacity : null,
      }
    : null;
});
await page.screenshot({ path: 'tmp-animacao-modais/referencia-pendencias.png' });
await page.waitForTimeout(1200);
const final = await page.evaluate(() => {
  const d = document.querySelector('[role="dialog"]');
  return d ? { transform: getComputedStyle(d).transform, opacity: getComputedStyle(d).opacity } : null;
});
await page.keyboard.press('Escape');
await page.waitForTimeout(40);
const durante = await page.locator('[role="dialog"]').count();
await page.waitForTimeout(1200);
const depois = await page.locator('[role="dialog"]').count();
console.log(JSON.stringify({ entrada, final, durante, depois }, null, 2));
await context.close();
await browser.close();
