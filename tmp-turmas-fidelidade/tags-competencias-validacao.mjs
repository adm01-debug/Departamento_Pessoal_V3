/**
 * TEMPORÁRIO — valida as tags de competências coloridas do card de vaga.
 */
import { chromium } from '@playwright/test';

const b = await chromium.launch();
const larguras = [1650, 1600, 390];
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
  await p.waitForTimeout(1800);

  const ui = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-vaga-card]')];
    const lerTag = (el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        texto: el.textContent?.trim(),
        h: Math.round(r.height),
        w: Math.round(r.width),
        raio: cs.borderRadius,
        paddingX: `${cs.paddingLeft}/${cs.paddingRight}`,
        fonte: cs.fontSize,
        textoCor: cs.color,
        fundo: cs.backgroundColor,
        borda: cs.borderTopColor,
        sombra: cs.boxShadow,
      };
    };
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      cards: cards.map((card) => {
        const tagsRow = card.querySelector('.mt-2\\.5.flex.flex-wrap');
        const tags = tagsRow ? [...tagsRow.children].map(lerTag) : [];
        return {
          id: card.getAttribute('data-vaga-card'),
          h: Math.round(card.getBoundingClientRect().height),
          clipping: card.scrollHeight - card.clientHeight,
          tags,
        };
      }),
    };
  });

  if (width === 1650) {
    await p.screenshot({ path: 'tmp-turmas-fidelidade/tags-competencias-1650.png' });
    const primeira = p.locator('[data-vaga-card]').first();
    await primeira.screenshot({ path: 'tmp-turmas-fidelidade/tags-competencias-card.png' });
  } else {
    await p.screenshot({ path: `tmp-turmas-fidelidade/tags-competencias-${width}.png` });
  }

  saida.push({ width, ui, erros });
  await c.close();
}

console.log(JSON.stringify(saida, null, 2));
await b.close();
