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
await page.getByRole('tab', { name: 'Candidatos', exact: true }).click();
await page.locator('table tbody tr').first().waitFor({ state: 'attached' });

const tabelas = await page.evaluate(() =>
  [...document.querySelectorAll('table')].map((t, i) => {
    const r = t.getBoundingClientRect();
    return {
      i,
      caption: t.querySelector('caption')?.textContent?.trim() ?? null,
      headers: [...t.querySelectorAll('thead th')].map((th) => th.textContent?.trim()).slice(0, 4),
      linhas: t.querySelectorAll('tbody tr').length,
      visivel: !!(r.width && r.height) && getComputedStyle(t).visibility !== 'hidden',
      display: getComputedStyle(t).display,
      rect: { w: Math.round(r.width), h: Math.round(r.height) },
      paiDisplay: getComputedStyle(t.closest('[hidden], [data-state]') ?? t.parentElement).display,
    };
  })
);
console.log(JSON.stringify(tabelas, null, 2));
await browser.close();
