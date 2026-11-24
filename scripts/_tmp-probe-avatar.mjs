/** TEMPORÁRIO — o que o UserAvatar renderiza de fato na tabela de Pagamentos. */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1512, height: 1200 } });
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(4500);

const dados = await page.evaluate(() => {
  const avatares = Array.from(document.querySelectorAll('tbody tr td:nth-child(2) span[class*="rounded-full"]')).slice(0, 6);
  return avatares.map((el) => {
    const cs = getComputedStyle(el);
    return {
      iniciais: (el.textContent ?? '').trim(),
      classes: (el.className || '').toString().slice(0, 90),
      imagemDeFundo: cs.backgroundImage.slice(0, 70),
      corDeFundo: cs.backgroundColor,
      cor: cs.color,
    };
  });
});
console.log(JSON.stringify(dados, null, 2));
await contexto.close();
await browser.close();
