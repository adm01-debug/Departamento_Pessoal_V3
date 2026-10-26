import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 390, height: 900 } });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
});
const p = await c.newPage();
await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1800);
await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
await p.waitForTimeout(1800);
const out = await p.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const offenders = [...document.querySelectorAll('body *')]
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 120),
        right: Math.round(r.right),
        w: Math.round(r.width),
        scrollW: el.scrollWidth,
        clientW: el.clientWidth,
      };
    })
    .filter((x) => x.right > vw + 1 || (x.scrollW > x.clientW + 1 && x.clientW > 0))
    .slice(0, 25);
  const grupo = document.querySelector('[aria-label="Filtrar vagas por status"]');
  const row = grupo?.parentElement;
  return {
    vw,
    docScrollW: document.documentElement.scrollWidth,
    bodyScrollW: document.body.scrollWidth,
    grupo: grupo ? { ...grupo.getBoundingClientRect().toJSON(), scrollW: grupo.scrollWidth } : null,
    row: row ? { ...row.getBoundingClientRect().toJSON(), scrollW: row.scrollWidth } : null,
    offenders,
  };
});
console.log(JSON.stringify(out, null, 2));
await b.close();
