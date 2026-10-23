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
await page.waitForTimeout(800);

const snapshot = () =>
  page.evaluate(() => {
    const dialogo = [...document.querySelectorAll('[role="dialog"]')].at(-1);
    return {
      dialogs: [...document.querySelectorAll('[role="dialog"]')].map((d) => ({
        titulo: d.querySelector('h2')?.textContent?.trim() ?? null,
        visivel: d.getBoundingClientRect().width > 0,
      })),
      mes: dialogo?.querySelector('[data-calendario-mes]')?.textContent?.trim() ?? null,
      chips: [...dialogo.querySelectorAll('[data-calendario-turma]')].map((chip) => {
        const dia = chip.closest('[data-calendario-dia]');
        return {
          id: chip.getAttribute('data-calendario-turma'),
          texto: chip.innerText.replace(/\n+/g, ' · ').trim(),
          dia: dia?.getAttribute('data-calendario-dia')?.slice(0, 10) ?? null,
          naListaMobile: Boolean(chip.closest('[data-calendario-lista-mes]')),
          visivel: chip.getBoundingClientRect().width > 0,
        };
      }),
    };
  });

console.log('SETEMBRO', JSON.stringify(await snapshot(), null, 2));

await page.locator('[data-calendario-turma="mock-inst-2"]').first().click();
await page.waitForTimeout(900);
console.log('DETALHE ABERTO', JSON.stringify(await snapshot(), null, 2));
await page.keyboard.press('Escape');
for (const espera of [300, 700, 1500]) {
  await page.waitForTimeout(espera);
  console.log(`APOS ESCAPE +${espera}`, JSON.stringify(await snapshot(), null, 2));
}

await page.getByRole('button', { name: 'Mês anterior' }).click();
await page.waitForTimeout(900);
console.log('AGOSTO', JSON.stringify(await snapshot(), null, 2));

await browser.close();
