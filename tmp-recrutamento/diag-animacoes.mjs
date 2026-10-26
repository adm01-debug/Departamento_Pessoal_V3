import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'off');
});
const page = await context.newPage();
await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(
  () => document.querySelectorAll('.kanban-column-visual.kanban-coluna-concluida').length >= 5,
  undefined,
  { timeout: 20000 }
);
await page.waitForTimeout(800);
console.log(
  'ANIMACOES',
  JSON.stringify(
    await page.evaluate(() =>
      document.getAnimations().map((a) => ({
        name: a.animationName ?? null,
        state: a.playState,
        alvo: (a.effect?.target)?.className?.toString?.().slice(0, 80) ?? null,
      }))
    ),
    null,
    2
  )
);
console.log(
  'CLASSES_FINAIS',
  JSON.stringify(
    await page.evaluate(() =>
      [...document.querySelectorAll('.kanban-column-visual')].map((el) => el.className)
    ),
    null,
    2
  )
);
await browser.close();
