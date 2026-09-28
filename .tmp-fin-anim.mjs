import { chromium } from 'playwright';

const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Admin@2026!';
const BASE = 'http://localhost:8080';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1050 }, colorScheme: 'dark' });
page.on('pageerror', (err) => console.log('[page error]', err.message));

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));
  if (!page.url().includes('/dashboard')) {
    const emailInput = page.getByLabel(/e-?mail/i).first();
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.fill(EMAIL);
    await page.getByLabel(/senha|password/i).first().fill(PASSWORD);
    await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
  }
  await page.goto(`${BASE}/colaboradores/novo`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  const tab = page.getByRole('tab', { name: /financeiro/i }).first();
  await tab.waitFor({ state: 'visible', timeout: 15000 });

  await tab.click();
  await page.waitForTimeout(80);
  await page.screenshot({ path: 'fin-anim-early.png' });
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'fin-anim-mid.png' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'fin-anim-settled.png' });

  console.log('Screenshots saved.');
} catch (err) {
  console.error('ERROR:', err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
