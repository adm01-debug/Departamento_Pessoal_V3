import { chromium } from '@playwright/test';
const b = await chromium.launch();
for (const width of [1024, 768, 1280]) {
  const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width, height: 900 } });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
  });
  const p = await c.newPage();
  await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
  await p.waitForTimeout(1400);
  const out = await p.evaluate(() => {
    const r = (el) => el.getBoundingClientRect();
    const grupo = document.querySelector('[aria-label="Filtrar vagas por status"]');
    const painel = grupo.closest('.rounded-xl');
    const inner = grupo.parentElement;
    const right = inner.lastElementChild;
    const vw = document.documentElement.clientWidth;
    const header = document.querySelector('header');
    const offenders = [...document.querySelectorAll('body *')]
      .map((el) => ({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 80), right: Math.round(r(el).right), w: Math.round(r(el).width) }))
      .filter((x) => x.right > vw + 1)
      .slice(0, 6);
    return {
      vw,
      docScrollW: document.documentElement.scrollWidth,
      headerW: header ? Math.round(r(header).width) : null,
      headerScrollW: header ? header.scrollWidth : null,
      painelW: Math.round(r(painel).width),
      innerW: Math.round(r(inner).width),
      grupoW: Math.round(r(grupo).width),
      rightW: Math.round(r(right).width),
      innerDisplay: getComputedStyle(inner).display,
      headerOffenders: offenders,
    };
  });
  console.log(JSON.stringify({ width, out }));
  await c.close();
}
await b.close();
