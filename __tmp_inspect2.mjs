import { chromium } from '@playwright/test';

const BASE = 'http://localhost:8080';
const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Admin@2026!';
const OUT_DIR = 'C:/Users/artes03/AppData/Local/Temp/claude/c--Users-artes03-Desktop-departamento-pessoal-v2-main/7c09575b-d229-4246-a5da-9d30cd22cee6/scratchpad';

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

  const info = await page.evaluate(() => {
    const feriasTab = [...document.querySelectorAll('button,[role="tab"]')].find(
      (el) => el.textContent.trim() === 'Férias'
    );
    const scrollContainer = feriasTab.parentElement; // the sub tablist itself
    const root = scrollContainer.parentElement; // "space-y-4" root of FeriasResumoTab
    const containerRight = root.getBoundingClientRect().right;

    const offenders = [];
    const walk = (el, depth) => {
      if (depth > 12) return;
      const r = el.getBoundingClientRect();
      if (r.right > containerRight + 1 && r.width > 0) {
        offenders.push({
          tag: el.tagName,
          cls: (el.className && el.className.toString) ? el.className.toString().slice(0, 200) : '',
          right: r.right,
          overBy: +(r.right - containerRight).toFixed(1),
          width: +r.width.toFixed(1),
          text: el.textContent ? el.textContent.trim().slice(0, 40) : '',
        });
      }
      for (const child of el.children) walk(child, depth + 1);
    };
    walk(root, 0);
    // Only keep the deepest/most specific offenders (largest overBy first, limit)
    offenders.sort((a, b) => b.overBy - a.overBy);
    return { containerRight, count: offenders.length, top: offenders.slice(0, 15) };
  });
  console.log(JSON.stringify(info, null, 2));
} catch (err) {
  console.error('ERROR', err);
} finally {
  await browser.close();
}
