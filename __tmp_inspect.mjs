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

  await page.screenshot({ path: `${OUT_DIR}/inspect-full.png`, fullPage: false });

  // Find the "Férias" sub-tab text node and walk up ancestors, reporting
  // each one's tag/class/scrollWidth vs clientWidth (to spot the overflow).
  const info = await page.evaluate(() => {
    const feriasTab = [...document.querySelectorAll('button,[role="tab"]')].find(
      (el) => el.textContent.trim() === 'Férias'
    );
    if (!feriasTab) return { error: 'not found' };
    const chain = [];
    let node = feriasTab;
    for (let i = 0; i < 8 && node; i++) {
      chain.push({
        tag: node.tagName,
        cls: node.className && node.className.toString().slice(0, 160),
        scrollWidth: node.scrollWidth,
        clientWidth: node.clientWidth,
        overflowX: getComputedStyle(node).overflowX,
        rect: node.getBoundingClientRect(),
      });
      node = node.parentElement;
    }
    return { chain };
  });
  console.log(JSON.stringify(info, null, 2));
} catch (err) {
  console.error('ERROR', err);
  await page.screenshot({ path: `${OUT_DIR}/inspect-error.png` }).catch(() => {});
} finally {
  await browser.close();
}
