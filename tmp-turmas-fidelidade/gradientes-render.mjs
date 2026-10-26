/**
 * TEMPORÁRIO — render + amostragem dos degradês dos cards de vaga.
 * Saída: screenshot da grade, crops por card e JSON com background/borda e
 * cores médias em pontos de fundo (sem textos/ícones).
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const sufixo = process.argv[2] ?? 'r1';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1650, height: 900 } });
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
await p.waitForTimeout(2200);

const info = await p.evaluate(() => {
  const cards = [...document.querySelectorAll('[data-vaga-card]')];
  return cards.map((card) => {
    const cs = getComputedStyle(card);
    const r = card.getBoundingClientRect();
    return {
      id: card.getAttribute('data-vaga-card'),
      titulo: card.querySelector('h3')?.textContent?.trim(),
      status: card.getAttribute('data-vaga-status'),
      w: Math.round(r.width),
      h: Math.round(r.height),
      backgroundImage: cs.backgroundImage,
      backgroundBase: cs.backgroundColor,
      border: cs.borderTopColor,
      shadow: cs.boxShadow,
    };
  });
});

await p.locator('[data-vagas-grid]').screenshot({ path: `tmp-turmas-fidelidade/gradientes-${sufixo}-grid.png` });
await p.screenshot({ path: `tmp-turmas-fidelidade/gradientes-${sufixo}-pagina.png` });
for (let i = 0; i < info.length; i += 1) {
  const card = p.locator('[data-vaga-card]').nth(i);
  await card.screenshot({ path: `tmp-turmas-fidelidade/gradientes-${sufixo}-card-${i}.png` });
}
fs.writeFileSync(
  `tmp-turmas-fidelidade/gradientes-${sufixo}.json`,
  JSON.stringify({ info, erros }, null, 2),
  'utf8'
);
console.log(JSON.stringify({ info, erros }, null, 2));
await b.close();
