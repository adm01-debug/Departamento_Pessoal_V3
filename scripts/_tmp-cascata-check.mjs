/**
 * TEMPORÁRIO — mede a cascata de entrada da timeline (opacity + translateY por
 * quadro) para provar que os itens entram de cima para baixo, em sequência.
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
await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
await page.locator('[role="tablist"]').first().waitFor({ timeout: 25000 });

// Amostrador: registra opacidade/translateY do cabeçalho e das 5 primeiras
// linhas a partir do 1º quadro em que a timeline aparece.
await page.evaluate(() => {
  const cabecalhos = () =>
    [...document.querySelectorAll('button[aria-expanded]')].filter((b) => /\d+ eventos?/.test(b.textContent || ''));
  const linhas = () =>
    [...document.querySelectorAll('div[style]')].filter((d) => {
      const s = d.getAttribute('style') || '';
      if (!/opacity|translate/.test(s)) return false;
      const inner = d.firstElementChild;
      return inner && typeof inner.className === 'string' && inner.className.includes('grid');
    });
  const ty = (el) => {
    const t = getComputedStyle(el).transform;
    if (!t || t === 'none') return 0;
    const m = t.match(/matrix\(([^)]+)\)/);
    if (!m) return 0;
    const p = m[1].split(',').map(Number);
    return +(p[5] ?? 0).toFixed(1);
  };
  const fmt = (el) => ({ o: +(+(getComputedStyle(el).opacity || 1)).toFixed(2), y: ty(el) });

  window.__cascade = { started: null, frames: [], stop: false };
  const tick = () => {
    const hs = cabecalhos();
    const ls = linhas();
    if (hs.length && ls.length) {
      if (window.__cascade.started === null) window.__cascade.started = performance.now();
      window.__cascade.frames.push({
        t: Math.round(performance.now() - window.__cascade.started),
        h: hs.slice(0, 3).map(fmt),
        l: ls.slice(0, 5).map(fmt),
      });
    }
    if (!window.__cascade.stop) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await page.getByRole('tab', { name: /Auditoria/i }).first().click();
await page.waitForTimeout(1800);
await page.evaluate(() => {
  window.__cascade.stop = true;
});

const frames = await page.evaluate(() => window.__cascade.frames);
// Amostra a cada ~80ms para o log ficar legível.
const amostra = [];
let ultimo = -999;
for (const f of frames) {
  if (f.t - ultimo >= 80) {
    amostra.push(f);
    ultimo = f.t;
  }
}

// Layout final: confere que os elementos terminaram no lugar exato.
const final = await page.evaluate(() => {
  const linhas = [...document.querySelectorAll('div[style]')].filter((d) => {
    const inner = d.firstElementChild;
    return inner && typeof inner.className === 'string' && inner.className.includes('grid');
  });
  const alturas = linhas.map((l) => Math.round(l.getBoundingClientRect().height));
  return {
    linhas: linhas.length,
    alturasIguais: new Set(alturas).size === 1,
    alturaLinha: alturas[0] ?? null,
    transformFinal: linhas.map((l) => getComputedStyle(l).transform).every((t) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)'),
  };
});

await page.screenshot({ path: 'tmp-cascata-final.png', fullPage: false });
console.log(JSON.stringify({ amostra, final }, null, 2));
await browser.close();
