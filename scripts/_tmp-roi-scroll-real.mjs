/**
 * TEMPORÁRIO — reproduz a rolagem REAL do usuário (roda do mouse) até o gráfico
 * ROI e verifica se o disparo automático acontece.
 * Uso: node scripts/_tmp-roi-scroll-real.mjs
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1600, height: 1000 },
});
const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
await page.getByRole('tab', { name: /Simulador ROI/ }).click();
await page.getByText('1. Configure seu cenário').waitFor({ timeout: 15000 });
await page.waitForTimeout(1200);

// Instala observador de diagnóstico: registra baseVisivel real e scroll do container.
await page.evaluate(() => {
  const wrap = document.querySelector('.roi-grafico');
  const sentinela = wrap.querySelector('span[aria-hidden]');
  const scroller = (() => {
    let el = wrap.parentElement;
    while (el && el !== document.body) {
      const s = getComputedStyle(el);
      if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight) return el;
      el = el.parentElement;
    }
    return document.scrollingElement;
  })();
  window.__diag = { eventos: [], scrolls: 0, scroller: scroller === document.scrollingElement ? 'document' : scroller.className };
  document.addEventListener('scroll', () => (window.__diag.scrolls += 1), true);
  const io = new IntersectionObserver(
    (es) => {
      const e = es[0];
      window.__diag.eventos.push({
        t: Math.round(performance.now()),
        ratio: +e.intersectionRatio.toFixed(2),
        isIntersecting: e.isIntersecting,
        scrollTop: scroller === document.scrollingElement ? Math.round(window.scrollY) : Math.round(scroller.scrollTop),
        fase: wrap.getAttribute('data-fase'),
      });
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  );
  io.observe(sentinela);
});

const state = () =>
  page.evaluate(() => {
    const wrap = document.querySelector('.roi-grafico');
    return {
      status: (document.querySelector('[data-testid="roi-anim-status"]')?.textContent ?? '').trim(),
      fase: wrap.getAttribute('data-fase'),
      payout: getComputedStyle(wrap).getPropertyValue('--roi-payout-scale').trim(),
      economia: getComputedStyle(wrap).getPropertyValue('--roi-economia-scale').trim(),
      barraH: Math.round(document.querySelector('[data-testid="roi-bar-payout"]')?.getBoundingClientRect().height ?? 0),
    };
  });

// Rola com a roda do mouse em passos, como um usuário.
await page.mouse.move(800, 500);
const amostra = [];
for (let i = 0; i < 12; i += 1) {
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(120);
}
for (let i = 0; i < 30; i += 1) {
  amostra.push({ t: i * 100, ...(await state()) });
  await page.waitForTimeout(100);
}

const diag = await page.evaluate(() => window.__diag);
console.log('DIAG', JSON.stringify({ ...diag, eventos: diag.eventos.slice(-14) }, null, 2));
console.log('AMOSTRA', JSON.stringify(amostra, null, 2));
await page.screenshot({ path: 'tmp-roi-scroll-real.png' });
await context.close();
await browser.close();
