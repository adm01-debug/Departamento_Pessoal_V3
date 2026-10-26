import { chromium } from '@playwright/test';
const b = await chromium.launch();
for (const [width, height] of [[1650, 900], [768, 1024], [390, 844]]) {
  const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width, height } });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  const p = await c.newPage();
  await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.getByRole('tab', { name: 'Candidatos', exact: true }).click();
  await p.waitForTimeout(1600);
  const pag = p.locator('p', { hasText: 'Mostrando' }).first();
  const rodape = pag.locator('xpath=ancestor::div[contains(@class,"border-t")][1]');
  await rodape.scrollIntoViewIfNeeded();
  await p.waitForTimeout(250);
  await rodape.screenshot({ path: `tmp-turmas-fidelidade/candidatos-rodape-${width}.png` });
  await c.close();
}
await b.close();
