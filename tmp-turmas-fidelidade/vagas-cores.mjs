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
await p.waitForTimeout(2600);
for (const [id, nome] of [
  ['mock-vaga-4', 'verde'],
  ['mock-vaga-3', 'ambar'],
  ['mock-vaga-2', 'roxo'],
]) {
  await p.locator(`[data-vaga-card="${id}"]`).screenshot({ path: `tmp-turmas-fidelidade/vaga-${nome}.png` });
}
await c.close();
await b.close();
