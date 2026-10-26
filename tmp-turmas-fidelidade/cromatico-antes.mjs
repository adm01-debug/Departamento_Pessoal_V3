import { chromium } from '@playwright/test';

const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1600, height: 1000 } });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const p = await c.newPage();
await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1800);
await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
await p.waitForTimeout(4200);
await p.locator('[data-vagas-grid]').screenshot({ path: 'tmp-turmas-fidelidade/cromatico-antes-1600.png' });
console.log(
  JSON.stringify(
    await p.evaluate(() =>
      [...document.querySelectorAll('[data-vaga-card]')].map((card) => ({
        id: card.getAttribute('data-vaga-card'),
        fundo: getComputedStyle(card).backgroundImage,
        base: getComputedStyle(card).backgroundColor,
        borda: getComputedStyle(card).borderTopColor,
        icone: (() => {
          const icon = card.querySelector('span[aria-hidden="true"]');
          return icon
            ? {
                cor: getComputedStyle(icon).color,
                fundo: getComputedStyle(icon).backgroundColor,
                borda: getComputedStyle(icon).borderTopColor,
              }
            : null;
        })(),
      }))
    ),
    null,
    2
  )
);
await c.close();
await b.close();
