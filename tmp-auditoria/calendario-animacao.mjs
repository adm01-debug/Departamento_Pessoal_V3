import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const page = await context.newPage();
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);
await page.getByRole('tab', { name: /Turmas/ }).click();
await page.waitForTimeout(1600);
await page.getByRole('button', { name: /Ver calendário completo/i }).click();

for (const espera of [300, 600, 1200, 2500]) {
  await page.waitForTimeout(espera);
  const estado = await page.evaluate(() => {
    const dialogo = [...document.querySelectorAll('[role="dialog"]')].at(-1);
    const item = dialogo?.querySelector('[data-calendario-mes]');
    return {
      mes: item?.textContent?.trim() ?? null,
      opacidadeMes: item ? getComputedStyle(item).opacity : null,
      itensVisiveis: [...(dialogo?.querySelectorAll('[style]') ?? [])].filter(
        (el) => Number(getComputedStyle(el).opacity) > 0.9
      ).length,
      gridVisivel: Boolean(dialogo?.querySelector('[data-calendario-dia]')),
    };
  });
  console.log(`+${espera}ms`, JSON.stringify(estado));
}

await page.screenshot({ path: 'tmp-auditoria/calendario-setembro-final.png' });
await browser.close();
