import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1650, height: 900 } });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
});
const p = await c.newPage();
await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
await p.waitForTimeout(1500);
const atual = await p.evaluate(() =>
  [...document.querySelectorAll('[data-vaga-card]')].map((el) => Math.round(el.getBoundingClientRect().height))
);
const antigo = await p.evaluate(() => {
  for (const row of document.querySelectorAll('[data-vaga-card] .mt-3.flex.flex-wrap')) {
    row.style.minHeight = '22px';
    for (const tag of row.children) {
      tag.style.height = 'auto';
      tag.style.padding = '4px 6px';
      tag.style.fontSize = '9px';
      tag.style.lineHeight = '1.25';
      tag.style.borderRadius = '6px';
    }
  }
  return [...document.querySelectorAll('[data-vaga-card]')].map((el) => Math.round(el.getBoundingClientRect().height));
});
console.log(JSON.stringify({ atual, antigo, delta: atual.map((h, i) => h - antigo[i]) }));
await b.close();
