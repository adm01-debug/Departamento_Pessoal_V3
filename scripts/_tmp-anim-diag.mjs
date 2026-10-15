/**
 * TEMPORÁRIO — DIAGNÓSTICO DA AUSÊNCIA DE ANIMAÇÃO.
 *
 * Mede, quadro a quadro, opacity + transform do 1º cabeçalho e dos 3 primeiros
 * eventos em DOIS navegadores: um com `prefers-reduced-motion: no-preference` e
 * outro com `reduce`. Registra também o modo centralizado (`dp-force-motion`).
 * Uso: node scripts/_tmp-anim-diag.mjs
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();

async function medir(reducedMotion) {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1600, height: 1000 },
    reducedMotion,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
  await page.locator('[role="tablist"]').first().waitFor({ timeout: 25000 });

  const ambiente = await page.evaluate(() => ({
    reduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    classeForceMotion: document.documentElement.className,
    storageForceMotion: localStorage.getItem('dp-force-motion'),
  }));

  // Amostrador: roda por ~3s a partir do clique na aba.
  await page.evaluate(() => {
    window.__amostra = { t0: null, frames: [], parado: false };
    const ler = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      const m = s.transform.match(/matrix\(([^)]+)\)/);
      const ty = m ? +(Number(m[1].split(',')[5]) || 0).toFixed(1) : 0;
      return { o: +(+s.opacity).toFixed(3), ty };
    };
    const tick = () => {
      const cabecalho = document.querySelector('[data-cascata-cabecalho="0"]');
      const eventos = [...document.querySelectorAll('[data-cascata-evento="0"]')].slice(0, 3);
      const v = [ler(cabecalho), ...eventos.map(ler)];
      if (v[0]) {
        if (window.__amostra.t0 === null) window.__amostra.t0 = performance.now();
        window.__amostra.frames.push({ t: Math.round(performance.now() - window.__amostra.t0), v });
      }
      if (!window.__amostra.parado) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.getByRole('tab', { name: /Auditoria/i }).first().click();
  await page.waitForTimeout(3200);
  await page.evaluate(() => {
    window.__amostra.parado = true;
  });
  const frames = await page.evaluate(() => window.__amostra.frames);

  const resumo = [0, 1, 2, 3].map((i) => {
    const serie = frames.map((f) => f.v[i]).filter(Boolean);
    if (!serie.length) return { elemento: i < 1 ? 'cabeçalho Hoje' : `evento ${i}`, ausente: true };
    const visivelEm = serie.find((x) => x.o >= 0.99);
    const ini = serie.find((x) => x.o > 0.01);
    const minTy = Math.min(...serie.map((x) => x.ty));
    return {
      elemento: i < 1 ? 'cabeçalho Hoje' : `evento ${i}`,
      opacidadeInicial: serie[0].o,
      minTy,
      apareceuEmMs: ini ? frames.find((f) => f.v[i] === ini)?.t : null,
      visivelEmMs: visivelEm ? frames.find((f) => f.v[i] === visivelEm)?.t : null,
      opacidadeFinal: serie[serie.length - 1].o,
    };
  });

  await context.close();
  return { reducedMotion, ambiente, resumo };
}

console.log(JSON.stringify(await medir('no-preference'), null, 2));
console.log(JSON.stringify(await medir('reduce'), null, 2));
await browser.close();
