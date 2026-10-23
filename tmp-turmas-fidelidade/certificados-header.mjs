import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1280, height: 900 } });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const p = await c.newPage();
await p.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1800);
await p.getByRole('tab', { name: 'Certificados' }).click();
await p.waitForTimeout(2200);
const dados = await p.evaluate(() => {
  const r = (el) => (el ? el.getBoundingClientRect() : null);
  return [...document.querySelectorAll('[data-certificado-card]')].map((card) => {
    const header = card.firstElementChild;
    const h3 = card.querySelector('h3');
    const right = header?.querySelector(':scope > div:last-child');
    const topRow = right?.firstElementChild;
    const cat = card.querySelector('h3 + p');
    const dl = card.querySelector('[data-certificado-metadados]');
    return {
      id: card.getAttribute('data-certificado-card'),
      cardW: Math.round(r(card).width),
      headerH: Math.round(r(header).height),
      rightH: Math.round(r(right).height),
      topRowH: Math.round(r(topRow).height),
      h3H: Math.round(r(h3).height),
      h3Min: getComputedStyle(h3).minHeight,
      h3Clamp: getComputedStyle(h3).webkitLineClamp,
      catH: Math.round(r(cat).height),
      metaTop: Math.round(r(dl).top),
      classes: h3.className,
    };
  });
});
console.log(JSON.stringify(dados, null, 2));
await b.close();
