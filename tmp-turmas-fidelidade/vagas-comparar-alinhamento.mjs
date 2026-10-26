import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
await p.goto('http://localhost:8080/tmp-turmas-fidelidade/vagas-harness.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
const bar = p.locator('[aria-label="Filtrar vagas por status"]').locator('..');
await bar.screenshot({ path: 'tmp-turmas-fidelidade/vagas-barra-center.png' });
await p.evaluate(() => {
  const g = document.querySelector('[aria-label="Filtrar vagas por status"]');
  g.parentElement.style.alignItems = 'flex-end';
});
await p.waitForTimeout(200);
await bar.screenshot({ path: 'tmp-turmas-fidelidade/vagas-barra-end.png' });
await b.close();
