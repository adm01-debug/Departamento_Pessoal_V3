import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1650, height: 900 }, deviceScaleFactor: 2 });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
});
const p = await c.newPage();
await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1600);
await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
await p.waitForTimeout(1600);
const badge = p.locator('[data-vaga-card] span', { hasText: /^Fechada$/ }).first();
const caixa = await badge.boundingBox();
await p.screenshot({
  path: 'tmp-turmas-fidelidade/badge-fechada-antes.png',
  clip: { x: caixa.x - 60, y: caixa.y - 24, width: caixa.width + 140, height: caixa.height + 48 },
});
const info = await badge.evaluate((el) => {
  const cs = getComputedStyle(el);
  return {
    texto: cs.color,
    fundo: cs.backgroundColor,
    borda: cs.borderTopColor,
    padding: cs.padding,
    h: Math.round(el.getBoundingClientRect().height),
    w: Math.round(el.getBoundingClientRect().width),
    html: el.innerHTML,
    fonte: cs.fontWeight,
  };
});
console.log(JSON.stringify({ caixa, info }));
await b.close();
