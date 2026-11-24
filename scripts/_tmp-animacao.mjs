/**
 * TEMPORÁRIO — a animação em cascata está REALMENTE rodando no navegador?
 * Mede, quadro a quadro, opacity/transform do 1º cabeçalho e dos 3 primeiros
 * eventos, verifica o estado inicial (hidden) e captura estágios da cascata.
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1600, height: 1000 },
  // Garante que o navegador de teste NÃO esteja em movimento reduzido.
  reducedMotion: 'no-preference',
});
const page = await context.newPage();
const erros = [];
page.on('console', (m) => {
  if (m.type() === 'error') erros.push(m.text().slice(0, 120));
});
page.on('pageerror', (e) => erros.push('pageerror: ' + e.message.slice(0, 120)));

await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
await page.locator('[role="tablist"]').first().waitFor({ timeout: 25000 });

const ambiente = await page.evaluate(() => ({
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
}));

// Amostrador: roda por ~3s a partir do clique na aba.
await page.evaluate(() => {
  window.__amostra = { t0: null, frames: [], parado: false };
  const alvos = () => {
    const cabecalho = document.querySelector('[data-cascata-cabecalho="0"]');
    const eventos = [...document.querySelectorAll('[data-cascata-evento="0"]')].slice(0, 3);
    return [cabecalho, ...eventos].filter(Boolean);
  };
  const ler = (el) => {
    const s = getComputedStyle(el);
    const m = s.transform.match(/matrix\(([^)]+)\)/);
    const ty = m ? +(Number(m[1].split(',')[5]) || 0).toFixed(1) : 0;
    return { o: +(+s.opacity).toFixed(3), ty };
  };
  const tick = () => {
    const els = alvos();
    if (els.length) {
      if (window.__amostra.t0 === null) window.__amostra.t0 = performance.now();
      window.__amostra.frames.push({
        t: Math.round(performance.now() - window.__amostra.t0),
        v: els.slice(0, 4).map(ler),
      });
    }
    if (!window.__amostra.parado) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await page.getByRole('tab', { name: /Auditoria/i }).first().click();

const capturas = [];
let anterior = 0;
for (const marco of [100, 400, 750, 1200, 1800, 6500]) {
  await page.waitForTimeout(Math.max(0, marco - anterior));
  anterior = marco;
  await page.screenshot({ path: `tmp-fase-${marco}.png`, clip: { x: 280, y: 300, width: 1300, height: 620 } });
  capturas.push(`tmp-fase-${marco}.png`);
}

await page.evaluate(() => {
  window.__amostra.parado = true;
});
const frames = await page.evaluate(() => window.__amostra.frames);

// Resumo por elemento: menor opacity, se houve deslocamento, quando ficou visível.
const resumo = [0, 1, 2, 3].map((i) => {
  const serie = frames.map((f) => f.v[i]).filter(Boolean);
  const menorOpacidade = serie.length ? Math.min(...serie.map((x) => x.o)) : null;
  const maiorDeslocamento = serie.length ? Math.min(...serie.map((x) => x.ty)) : null;
  const visivelEm = serie.find((x) => x.o >= 0.99);
  const quadroVisivel = visivelEm ? frames.find((f) => f.v[i] === visivelEm) : null;
  return {
    elemento: i < 1 ? 'cabeçalho Hoje' : `evento ${i}`,
    menorOpacidade,
    maiorDeslocamentoPx: maiorDeslocamento,
    ficouVisivelEmMs: quadroVisivel ? quadroVisivel.t : null,
  };
});

console.log(JSON.stringify({ ambiente, resumo, capturas, erros: erros.slice(0, 6) }, null, 2));
await browser.close();
