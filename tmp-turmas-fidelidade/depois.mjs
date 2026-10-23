import { chromium } from '@playwright/test';
const largura = Number(process.argv[2] ?? 1600);
const altura = Number(process.argv[3] ?? 1000);
const sufixo = process.argv[4] ?? `${largura}`;
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: largura, height: altura } });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const p = await c.newPage();
await p.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2200);
await p.getByRole('tab', { name: 'Turmas' }).click();
await p.waitForTimeout(2600);
await p.screenshot({ path: `tmp-turmas-fidelidade/depois-${sufixo}.png`, fullPage: true });
const dados = await p.evaluate(() => {
  const r = (el) => (el ? el.getBoundingClientRect() : null);
  return {
    cards: [...document.querySelectorAll('[data-turma-card]')].map((c) => ({
      id: c.getAttribute('data-turma-card'),
      texto: c.innerText,
      cover: c.querySelector('[data-training-cover]')?.getAttribute('data-training-cover-estado'),
      headerH: r(c.querySelector('[data-turma-header]'))?.height,
      cardH: r(c)?.height,
      cardW: r(c)?.width,
      overflowX: c.scrollWidth - c.clientWidth,
    })),
    maisTurmasH: r(document.querySelector('[data-mais-turmas-em-breve]'))?.height,
    agenda: document.querySelector('[data-turmas-agenda]')?.innerText,
    agendaH: r(document.querySelector('[data-turmas-agenda]'))?.height,
    gridCols: getComputedStyle(document.querySelector('[data-turmas-grid]')).gridTemplateColumns,
    overflowDocumento: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});
console.log(JSON.stringify(dados, null, 2));
await b.close();
