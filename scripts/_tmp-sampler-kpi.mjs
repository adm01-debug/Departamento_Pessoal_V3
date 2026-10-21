import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 950 },
  storageState: 'e2e/.auth/user.json',
  reducedMotion: 'no-preference',
});
const page = await context.newPage();
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));
await page.reload({ waitUntil: 'domcontentloaded' });
const aba = page.getByRole('tab', { name: /Simulador ROI/i });
await aba.waitFor({ state: 'visible', timeout: 30_000 });
await page.evaluate(() => {
  window.__log = [];
  const t0 = performance.now();
  const id = setInterval(() => {
    const els = [...document.querySelectorAll('[data-testid="kpi-valor"]')];
    if (!els.length) return;
    const valores = els.map((e) => e.textContent?.trim() ?? '');
    const anterior = window.__log.at(-1)?.valores;
    if (!anterior || valores.some((v, i) => v !== anterior[i])) {
      window.__log.push({ t: Math.round(performance.now() - t0), valores });
    }
  }, 16);
  setTimeout(() => clearInterval(id), 4500);
});
await aba.click();
await page.waitForTimeout(4300);
const log = await page.evaluate(() => window.__log);
const final = await page.locator('[data-testid="kpi-valor"]').allTextContents();
console.log(JSON.stringify({ final, log }, null, 2));
await browser.close();
