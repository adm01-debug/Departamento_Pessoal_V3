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
await page.goto('http://localhost:8080/admissoes', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const aba = page.getByRole('tab', { name: 'Kanban' });
console.log('VISIVEL ANTES:', await aba.isVisible());
await aba.click();
for (let i = 0; i < 12; i += 1) {
  await page.waitForTimeout(1000);
  const slots = await page.locator('.kanban-lane-slot').count();
  console.log(`T+${i + 1}s slots=${slots}`);
  if (slots > 0) break;
}
console.log('SLOTS FINAL:', await page.locator('.kanban-lane-slot').count());
console.log('TEXTO:', (await page.locator('body').innerText()).slice(0, 260).replace(/\n+/g, ' | '));
await browser.close();
