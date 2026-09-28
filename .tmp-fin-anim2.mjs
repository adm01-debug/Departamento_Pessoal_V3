import { chromium } from 'playwright';

const EMAIL = process.env.E2E_USER_EMAIL ?? 'admin@teste.local';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Admin@2026!';
const BASE = 'http://localhost:8080';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1050 }, colorScheme: 'dark' });

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

  // Poll computed opacity of the "Outras contas" section (delay 4*0.15=0.6s)
  // and the footer (delay 5*0.15=0.75s) every 50ms to see the ramp.
  for (let i = 0; i < 16; i++) {
    const info = await page.evaluate(() => {
      const heading = [...document.querySelectorAll('p')].find(p => p.textContent?.trim() === 'Outras contas');
      const el = heading?.closest('div')?.parentElement;
      const style = el ? getComputedStyle(el) : null;
      return { opacity: style?.opacity ?? 'n/a', transform: style?.transform ?? 'n/a' };
    });
    console.log(`t=${i * 50}ms outras-contas opacity=${info.opacity} transform=${info.transform}`);
    await page.waitForTimeout(50);
  }
} catch (err) {
  console.error('ERROR:', err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
