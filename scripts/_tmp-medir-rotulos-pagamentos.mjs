/** TEMPORÁRIO — mede o corte visual dos rótulos de ação na tabela de Pagamentos. */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const contexto = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1456, height: 1000 },
});
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(2200);

const medidas = await page.evaluate(() => {
  const linhas = Array.from(document.querySelectorAll('tbody tr'));
  return linhas.map((tr) => {
    const botao = tr.querySelector('td:last-child button');
    const rotulo = botao?.querySelector('span');
    const celulaStatus = tr.querySelectorAll('td')[6];
    const badge = celulaStatus?.querySelector('span');
    return {
      linha: (tr.querySelector('td:nth-child(2)')?.textContent ?? '').trim().slice(0, 22),
      acao: (rotulo?.textContent ?? '').trim(),
      acaoTrunca: rotulo ? rotulo.scrollWidth > rotulo.clientWidth + 1 : null,
      badge: (badge?.textContent ?? '').trim(),
      badgeTrunca: badge ? badge.scrollWidth > badge.clientWidth + 1 : null,
    };
  });
});
console.log(JSON.stringify(medidas, null, 1));
await contexto.close();
await browser.close();
