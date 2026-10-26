import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1650, height: 900 } });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
});
const p = await c.newPage();
await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1600);
await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
await p.waitForTimeout(1600);
const out = await p.evaluate(() => {
  const cards = [...document.querySelectorAll('[data-vaga-card]')];
  return cards.map((card) => {
    const badge = [...card.querySelectorAll('span')].find((el) => /^(Aberta|Fechada)$/.test(el.textContent?.trim() ?? ''));
    if (!badge) return { id: card.getAttribute('data-vaga-card'), badge: null };
    const cs = getComputedStyle(badge);
    const before = getComputedStyle(badge, '::before');
    const after = getComputedStyle(badge, '::after');
    return {
      id: card.getAttribute('data-vaga-card'),
      status: badge.textContent?.trim(),
      html: badge.innerHTML,
      className: badge.className,
      padding: cs.padding,
      h: Math.round(badge.getBoundingClientRect().height),
      w: Math.round(badge.getBoundingClientRect().width),
      gap: cs.columnGap,
      before: { content: before.content, w: before.width, h: before.height, bg: before.backgroundColor, display: before.display },
      after: { content: after.content, w: after.width, h: after.height, bg: after.backgroundColor, display: after.display },
      children: [...badge.children].map((el) => ({ tag: el.tagName, cls: el.className, w: Math.round(el.getBoundingClientRect().width) })),
    };
  });
});
console.log(JSON.stringify(out, null, 2));
await b.close();
