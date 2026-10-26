/**
 * TEMPORÁRIO — valida os degradês na página real em todas as larguras.
 */
import { chromium } from '@playwright/test';

const larguras = [1920, 1600, 1440, 1366, 1024, 390];
const b = await chromium.launch();
const saida = [];

for (const width of larguras) {
  const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width, height: 900 } });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  const p = await c.newPage();
  const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1600);
  await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
  await p.waitForTimeout(2000);

  const ui = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-vaga-card]')];
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      cards: cards.map((card) => {
        const cs = getComputedStyle(card);
        const r = card.getBoundingClientRect();
        return {
          id: card.getAttribute('data-vaga-card'),
          w: Math.round(r.width),
          h: Math.round(r.height),
          camadas: (cs.backgroundImage.match(/gradient\(/g) ?? []).length,
          temUrl: cs.backgroundImage.includes('url('),
          borda: cs.borderTopColor,
          sombra: cs.boxShadow,
          clip: card.scrollHeight - card.clientHeight,
        };
      }),
    };
  });

  const interacoes = {};
  if (width === 1600) {
    const card = p.locator('[data-vaga-card]').first();
    const antes = await card.evaluate((el) => getComputedStyle(el).borderTopColor);
    await card.hover();
    await p.waitForTimeout(300);
    const depois = await card.evaluate((el) => getComputedStyle(el).borderTopColor);
    interacoes.hoverBorda = { antes, depois };
  }

  await p.screenshot({ path: `tmp-turmas-fidelidade/gradientes-resp-${width}.png` });
  saida.push({ width, ui, interacoes, erros });
  await c.close();
}

console.log(JSON.stringify(saida, null, 2));
await b.close();
