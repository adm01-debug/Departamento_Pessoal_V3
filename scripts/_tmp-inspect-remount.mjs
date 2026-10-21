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
  window.__eventos = [];
  const vistos = new WeakSet();
  const t0 = performance.now();
  const obs = new MutationObserver(() => {
    for (const c of document.querySelectorAll('[data-testid="kpi-resultado"]')) {
      if (!vistos.has(c)) {
        vistos.add(c);
        window.__eventos.push({ t: Math.round(performance.now() - t0), evento: 'card-adicionado', texto: c.innerText.slice(0, 30) });
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  const id = setInterval(() => {
    const cards = [...document.querySelectorAll('[data-testid="kpi-resultado"]')];
    window.__eventos.push({ t: Math.round(performance.now() - t0), evento: 'poll', cards: cards.length, primeiro: cards[0]?.innerText.slice(0, 20) });
  }, 250);
  setTimeout(() => { clearInterval(id); obs.disconnect(); }, 4000);
});
await aba.click();
await page.waitForTimeout(4200);
console.log(JSON.stringify(await page.evaluate(() => window.__eventos), null, 2));
await browser.close();
