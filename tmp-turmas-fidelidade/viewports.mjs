import { chromium } from '@playwright/test';
const b = await chromium.launch();
const viewports = [
  [1920, 1080],
  [1600, 900],
  [1440, 900],
  [1366, 768],
  [1280, 800],
  [1024, 768],
  [768, 1024],
  [390, 844],
];
const resultado = [];
for (const [width, height] of viewports) {
  const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width, height } });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  const p = await c.newPage();
  await p.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  await p.getByRole('tab', { name: 'Turmas' }).click();
  await p.waitForTimeout(2000);
  const dados = await p.evaluate(() => {
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const grid = document.querySelector('[data-turmas-grid]');
    const agenda = document.querySelector('[data-turmas-agenda]');
    const card = document.querySelector('[data-turma-card]');
    const meta = card?.querySelector('[data-turma-meta]');
    return {
      overflowDoc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      cols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
      cardW: r(card)?.width,
      cardH: r(card)?.height,
      metaOverflow: meta ? meta.scrollWidth - meta.clientWidth : null,
      agenda: r(agenda)
        ? {
            w: Math.round(r(agenda).width),
            h: Math.round(r(agenda).height),
            top: Math.round(r(agenda).top),
            ladoACards: Math.abs(r(agenda).top - r(card).top) < 80,
          }
        : null,
      maisTurmasH: r(document.querySelector('[data-mais-turmas-em-breve]'))?.height,
      botoes: [...document.querySelectorAll('[data-turma-rodape] button:first-child')].map((b) => ({
        w: Math.round(r(b).width),
        h: Math.round(r(b).height),
      })),
    };
  });
  resultado.push({ width, height, ...dados });
  await p.screenshot({ path: `tmp-turmas-fidelidade/vp-${width}x${height}.png`, fullPage: true });
  await c.close();
}
console.log(JSON.stringify(resultado, null, 2));
await b.close();
