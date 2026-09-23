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
    const content = [...root.children][1];
    const dataState = content.getAttribute('data-state');
    const rootRect = root.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();

    // Binary-search inside `content`'s direct child chain by scrollWidth.
    const path = [];
    let node = content;
    while (node && node.children && node.children.length) {
      const kids = [...node.children];
      const diffs = kids.map((k) => ({
        tag: k.tagName, cls: (k.className||'').toString().slice(0,80),
        scrollWidth: k.scrollWidth, clientWidth: k.clientWidth,
        rectRight: +k.getBoundingClientRect().right.toFixed(1),
        rectLeft: +k.getBoundingClientRect().left.toFixed(1),
      }));
      path.push({ nodeTag: node.tagName, nodeCls: (node.className||'').toString().slice(0,60), nodeScrollWidth: node.scrollWidth, nodeClientWidth: node.clientWidth, kids: diffs });
      // descend into the child with the largest scrollWidth-clientWidth gap, or first if none
      const withGap = kids.filter(k => k.scrollWidth - k.clientWidth > 1);
      node = withGap.length ? withGap[0] : (kids.length === 1 ? kids[0] : null);
      if (path.length > 15) break;
    }

    return {
      dataState,
      rootRect: { left: +rootRect.left.toFixed(1), right: +rootRect.right.toFixed(1), width: +rootRect.width.toFixed(1) },
      contentRect: { left: +contentRect.left.toFixed(1), right: +contentRect.right.toFixed(1), width: +contentRect.width.toFixed(1) },
      contentScrollWidth: content.scrollWidth,
      contentClientWidth: content.clientWidth,
      path,
    };
  });
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error('ERROR', err);
} finally {
  await browser.close();
}
