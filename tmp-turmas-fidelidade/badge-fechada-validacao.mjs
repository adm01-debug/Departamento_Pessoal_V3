/**
 * TEMPORÁRIO — valida a badge Fechada após o refinamento.
 */
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1650, height: 900 }, deviceScaleFactor: 2 });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
});
const p = await c.newPage();
const erros = [];
p.on('pageerror', (e) => erros.push(e.message));
await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1600);
await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
await p.waitForTimeout(1600);

const dados = await p.evaluate(() => {
  const cards = [...document.querySelectorAll('[data-vaga-card]')];
  const ler = (badge) => {
    const cs = getComputedStyle(badge);
    const before = getComputedStyle(badge, '::before');
    const after = getComputedStyle(badge, '::after');
    return {
      status: badge.textContent?.trim(),
      html: badge.innerHTML,
      color: cs.color,
      bg: cs.backgroundColor,
      border: cs.borderTopColor,
      borderWidth: cs.borderTopWidth,
      padding: cs.padding,
      h: Math.round(badge.getBoundingClientRect().height),
      w: Math.round(badge.getBoundingClientRect().width),
      radius: cs.borderRadius,
      weight: cs.fontWeight,
      justify: cs.justifyContent,
      shadow: cs.boxShadow,
      children: badge.children.length,
      before: before.content,
      after: after.content,
    };
  };
  return {
    cards: cards.map((card) => ({
      id: card.getAttribute('data-vaga-card'),
      h: Math.round(card.getBoundingClientRect().height),
      badge: ler(
        [...card.querySelectorAll('span')].find((el) => /^(Aberta|Fechada)$/.test(el.textContent?.trim() ?? ''))
      ),
    })),
  };
});

const fechada = p.locator('[data-vaga-card] span', { hasText: /^Fechada$/ }).first();
const caixa = await fechada.boundingBox();
await p.screenshot({
  path: 'tmp-turmas-fidelidade/badge-fechada-depois.png',
  clip: { x: caixa.x - 60, y: caixa.y - 24, width: caixa.width + 140, height: caixa.height + 48 },
});
await p.screenshot({ path: 'tmp-turmas-fidelidade/badge-fechada-pagina.png' });
console.log(JSON.stringify({ dados, erros }, null, 2));
await b.close();
