/** TEMPORÁRIO — captura a página inteira (para conferir a base alinhada). */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1456, height: 1000 } });
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(2600);
await page.screenshot({ path: 'tmp-painel-lateral/pagina-inteira.png', fullPage: true });
// Recorte da base: tabela + lateral (para comparar as bordas inferiores).
const caixa = await page.evaluate(() => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const tabela = document.querySelector('table')?.closest('section');
  const ativ = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Atividade recente')?.closest('section');
  const a = tabela.getBoundingClientRect();
  const b = ativ.getBoundingClientRect();
  const alturaPagina = document.documentElement.scrollHeight;
  const y = Math.max(0, Math.round(Math.min(a.bottom, b.bottom) - 250));
  return { x: Math.max(0, Math.round(a.x) - 8), y, width: Math.round(Math.min(b.right, window.innerWidth) - a.x) + 8, height: Math.max(40, alturaPagina - y) };
});
await page.screenshot({ path: 'tmp-painel-lateral/base-alinhada.png', clip: caixa, fullPage: true });
console.log(JSON.stringify(caixa));
await contexto.close();
await browser.close();
