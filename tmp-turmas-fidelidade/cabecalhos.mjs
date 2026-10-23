import { chromium } from '@playwright/test';
const larguras = process.argv.slice(2).map(Number);
const alvos = larguras.length ? larguras : [1600, 1440, 1280, 1024, 390];
const b = await chromium.launch();
const saida = [];
for (const width of alvos) {
  const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width, height: 900 } });
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
    const cols = [...document.querySelectorAll('[data-turmas-coluna]')];
    return {
      overflowDoc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      cabecalhos: cols.map((col) => {
        const h = col.querySelector('[data-turmas-cabecalho]');
        const tile = h.querySelector('span');
        const titulo = h.querySelector('h2');
        const badge = h.querySelector('span[title$="turma(s)"]');
        const sub = h.querySelector('p');
        const card = col.querySelector('[data-turma-card]');
        return {
          coluna: col.getAttribute('data-turmas-coluna'),
          headerH: Math.round(r(h).height),
          headerTop: Math.round(r(h).top),
          headerW: Math.round(r(h).width),
          tile: { x: Math.round(r(tile).x), y: Math.round(r(tile).y), w: Math.round(r(tile).width), h: Math.round(r(tile).height) },
          titulo: { x: Math.round(r(titulo).x), y: Math.round(r(titulo).y), right: Math.round(r(titulo).right) },
          badge: { x: Math.round(r(badge).x), right: Math.round(r(badge).right) },
          sub: { x: Math.round(r(sub).x), y: Math.round(r(sub).y) },
          gapIconeTexto: Math.round(r(titulo).x - r(tile).right),
          gapTituloBadge: Math.round(r(badge).x - r(titulo).right),
          gapTituloSub: Math.round(r(sub).y - r(titulo).bottom),
          gapAteCard: card ? Math.round(r(card).y - r(h).bottom) : null,
          badgeOverflow: badge.scrollWidth - badge.clientWidth,
          tituloTruncado: titulo.scrollWidth > titulo.clientWidth,
          subTruncado: sub.scrollWidth > sub.clientWidth,
        };
      }),
    };
  });
  saida.push({ width, ...dados });
  await p.screenshot({ path: `tmp-turmas-fidelidade/cabecalhos-${width}.png`, fullPage: true });
  await c.close();
}
console.log(JSON.stringify(saida, null, 2));
await b.close();
