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
    const root = feriasTab.parentElement.parentElement;
    const content = [...root.children][1]; // TabsContent(resumo)
    const containerRight = root.getBoundingClientRect().right;

    const all = content.querySelectorAll('*');
    const list = [];
    all.forEach((el) => {
      const r = el.getBoundingClientRect();
      list.push({
        tag: el.tagName,
        cls: (el.className && el.className.toString) ? el.className.toString().slice(0, 120) : '',
        right: +r.right.toFixed(1),
        width: +r.width.toFixed(1),
        overBy: +(r.right - containerRight).toFixed(1),
      });
    });
    list.sort((a, b) => b.right - a.right);
    return { containerRight: +containerRight.toFixed(1), top10: list.slice(0, 10) };
  });
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error('ERROR', err);
} finally {
  await browser.close();
}
