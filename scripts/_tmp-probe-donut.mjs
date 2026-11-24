/** TEMPORÁRIO — inspeciona a caixa do DonutChart dentro do card Resumo Financeiro. */
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
await page.waitForTimeout(2400);

const info = await page.evaluate(() => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const h3 = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Resumo Financeiro');
  const card = h3.closest('section');
  const svg = card.querySelector('svg');
  const div = svg.parentElement;
  const cx = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      x: Math.round(r.x),
      display: cs.display,
      flex: cs.flex,
      minWidth: cs.minWidth,
      overflow: cs.overflow,
      classe: String(el.className).slice(0, 110),
    };
  };
  return {
    card: cx(card),
    divDoGrafico: cx(div),
    svg: { ...cx(svg), attrW: svg.getAttribute('width'), attrH: svg.getAttribute('height'), viewBox: svg.getAttribute('viewBox') },
    cardInner: getComputedStyle(card).padding,
    legenda: cx(card.querySelector('div.mt-3.space-y-1\\.5')),
  };
});
console.log(JSON.stringify(info, null, 1));
await contexto.close();
await browser.close();
