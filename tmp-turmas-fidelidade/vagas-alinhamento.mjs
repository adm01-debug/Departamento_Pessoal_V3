import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
await p.goto('http://localhost:8080/tmp-turmas-fidelidade/vagas-harness.html', { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
const out = await p.evaluate(() => {
  const g = document.querySelector('[aria-label="Filtrar vagas por status"]');
  const row = g.parentElement;
  const right = row.lastElementChild;
  return {
    rowClass: row.className,
    align: getComputedStyle(row).alignItems,
    rowRect: row.getBoundingClientRect().toJSON(),
    gRect: g.getBoundingClientRect().toJSON(),
    rightRect: right.getBoundingClientRect().toJSON(),
    wrapClass: g.children[0].className,
    wrapRect: g.children[0].getBoundingClientRect().toJSON(),
  };
});
console.log(JSON.stringify(out, null, 2));
await b.close();
