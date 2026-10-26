import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 390, height: 844 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
});
const page = await context.newPage();
await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(
  () => document.querySelectorAll('.kanban-column-visual.kanban-coluna-concluida').length >= 5,
  undefined,
  { timeout: 20000 }
);
console.log(
  'OVERFLOW',
  JSON.stringify(
    await page.evaluate(() => {
      const largura = window.innerWidth;
      return {
        doc: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        largura,
        culpados: [...document.querySelectorAll('body *')]
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { tag: el.tagName, cls: el.className?.toString?.().slice(0, 110), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) };
          })
          .filter((x) => x.right > largura + 1 && x.w > 0)
          .slice(0, 12),
      };
    }),
    null,
    2
  )
);
await browser.close();
