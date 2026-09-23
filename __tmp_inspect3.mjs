import { chromium } from '@playwright/test';

const BASE = 'http://localhost:8080';
const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Admin@2026!';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  if (!page.url().includes('/dashboard')) {
    const emailInput = page.getByLabel(/e-?mail/i).first();
    await emailInput.waitFor({ timeout: 15000 });
    await emailInput.fill(EMAIL);
    await page.getByLabel(/senha|password/i).first().fill(PASSWORD);
    await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
  }
  await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));

  await page.goto(`${BASE}/colaboradores`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const row = page.locator('tr', { hasText: 'Carlos Eduardo Lima' }).first();
  await row.waitFor({ timeout: 15000 });
  await row.locator('button, a').first().click();
  await page.waitForTimeout(1500);
  await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  await page.getByRole('tab', { name: /Férias & Afastamentos/i }).first().click();
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const feriasTab = [...document.querySelectorAll('button,[role="tab"]')].find(
      (el) => el.textContent.trim() === 'Férias'
    );
    const root = feriasTab.parentElement.parentElement; // "space-y-4" root
    const rows = [...root.children]; // the 3 grid rows (row1 KPIs, row2, row3)
    const measure = () => root.scrollWidth - root.clientWidth;

    const out = { baseline: measure(), rows: [] };
    rows.forEach((r, i) => {
      const prevDisplay = r.style.display;
      r.style.display = 'none';
      out.rows.push({ index: i, cls: r.className.slice(0, 60), diffWithoutThisRow: measure() });
      r.style.display = prevDisplay;
    });
    return out;
  });
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error('ERROR', err);
} finally {
  await browser.close();
}
