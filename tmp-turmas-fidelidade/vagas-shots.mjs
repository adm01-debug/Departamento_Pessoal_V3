import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1600, height: 900 } });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const p = await c.newPage();
await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1800);
await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
await p.waitForTimeout(2200);
await p.waitForTimeout(1500);
await p.locator('[data-vagas-grid]').screenshot({ path: 'tmp-turmas-fidelidade/vagas-grid-1600.png' });
await p.locator('[data-vaga-card]').first().screenshot({ path: 'tmp-turmas-fidelidade/vaga-card-1600.png' });
await c.close();
const c2 = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 390, height: 844 } });
await c2.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const p2 = await c2.newPage();
await p2.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await p2.waitForTimeout(1800);
await p2.getByRole('tab', { name: 'Vagas', exact: true }).click();
await p2.waitForTimeout(2200);
await p2.waitForTimeout(1500);
await p2.locator('[data-vaga-card]').first().screenshot({ path: 'tmp-turmas-fidelidade/vaga-card-390.png' });
await c2.close();
await b.close();

