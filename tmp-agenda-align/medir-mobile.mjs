import { chromium } from '@playwright/test';

/**
 * Mede a agenda em telas estreitas redimensionando a MESMA página já aberta
 * (evita recarregar a rota no mobile, onde o clique na aba é instável).
 * Uso: node tmp-agenda-align/medir-mobile.mjs
 */
const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1024, height: 768 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const page = await context.newPage();
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.getByRole('tab', { name: /Turmas/ }).click();
await page.waitForTimeout(2000);

const medir = () =>
  page.evaluate(() => {
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const painel = document.querySelector('[data-turmas-agenda]');
    const dias = [...document.querySelectorAll('[data-agenda-dia]')];
    const alturas = dias.map((dia) => Math.round(r(dia).height));
    const ultimo = dias.at(-1);
    return {
      largura: window.innerWidth,
      painel: r(painel) && Math.round(r(painel).height),
      linhas: `${Math.min(...alturas)}..${Math.max(...alturas)}`,
      overflowLinhas: dias.reduce((soma, dia) => soma + Math.max(0, dia.scrollHeight - dia.clientHeight), 0),
      sobraAbaixoDoUltimoDia: ultimo ? Math.round(r(painel).bottom - r(ultimo).bottom) : null,
      overflowPainel: painel ? painel.scrollHeight - painel.clientHeight : null,
      overflowDocumento: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

const saida = [{ ...(await medir()), nota: '1024 (referência)' }];

for (const [width, height] of [
  [768, 1024],
  [390, 844],
]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(900);
  saida.push(await medir());
  await page.screenshot({ path: `tmp-agenda-align/mobile-${width}x${height}.png`, fullPage: true });
}

console.log(JSON.stringify(saida, null, 2));
await browser.close();
