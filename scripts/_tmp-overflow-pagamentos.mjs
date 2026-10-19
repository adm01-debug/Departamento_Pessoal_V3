/** TEMPORÁRIO — quem provoca o scroll horizontal da página em telas estreitas. */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
for (const largura of [390, 1024]) {
  const contexto = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: largura, height: 900 },
  });
  const page = await contexto.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);

  const medir = () =>
    page.evaluate(() => {
      const vw = window.innerWidth;
      const culpados = Array.from(document.querySelectorAll('body *'))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.right > vw + 1;
        })
        .slice(0, 6)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return `${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')} right=${Math.round(r.right)} w=${Math.round(r.width)}`;
        });
      return { vw, scrollWidth: document.documentElement.scrollWidth, culpados };
    });

  const campanhas = await medir();
  await page.getByRole('tab', { name: /Pagamentos/ }).click();
  await page.waitForTimeout(1800);
  const pagamentos = await medir();

  console.log(`\n=== ${largura}px ===`);
  console.log('ABA CAMPANHAS:', JSON.stringify(campanhas, null, 1));
  console.log('ABA PAGAMENTOS:', JSON.stringify(pagamentos, null, 1));
  await contexto.close();
}
await browser.close();
