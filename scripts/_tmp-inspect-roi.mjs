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
await aba.click();
await page.waitForTimeout(3000);
const info = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('[data-testid="kpi-resultado"]')];
  return {
    cards: cards.map((c) => ({
      text: c.innerText.replace(/\s+/g, ' ').trim(),
      pNumerics: [...c.querySelectorAll('p.text-numeric')].map((p) => ({ text: p.textContent, cls: p.className })),
      html: c.outerHTML.slice(0, 500),
    })),
    allTextNumeric: [...document.querySelectorAll('p.text-numeric')].map((p) => p.textContent),
    countCards: cards.length,
  };
});
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: 'tmp-roi-dom.png', fullPage: false });
await browser.close();
