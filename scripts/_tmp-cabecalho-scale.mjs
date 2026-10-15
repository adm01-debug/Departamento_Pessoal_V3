/**
 * TEMPORÁRIO — prova a FASE 1 da coreografia: o cabeçalho do dia entra com
 * scale 0.96 → 1 e opacity 0 → 1 em ~350ms, ANTES de qualquer evento aparecer.
 * Uso: node scripts/_tmp-cabecalho-scale.mjs
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1600, height: 1000 },
  reducedMotion: 'no-preference',
});
const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
await page.locator('[role="tablist"]').first().waitFor({ timeout: 25000 });

await page.evaluate(() => {
  window.__cab = { frames: [], parado: false };
  const tick = () => {
    const el = document.querySelector('[data-cascata-cabecalho="0"]');
    if (el) {
      const s = getComputedStyle(el);
      const m = s.transform.match(/matrix\(([^)]+)\)/);
      const partes = m ? m[1].split(',').map((v) => Number(v)) : null;
      // matrix(a, b, c, d, tx, ty) — `a` é o scale em X.
      const escalas = [];
      if (partes) {
        escalas.push(partes[0], partes[3]);
      }
      window.__cab.frames.push({
        t: Math.round(performance.now()),
        escala: partes ? +((partes[0] + partes[3]) / 2).toFixed(4) : 1,
        ty: partes ? +partes[5].toFixed(2) : 0,
        o: +(+s.opacity).toFixed(3),
        eventosVisiveis: [...document.querySelectorAll('[data-cascata-evento="0"]')].filter(
          (e) => Number(getComputedStyle(e).opacity) > 0.01
        ).length,
      });
    }
    if (!window.__cab.parado) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await page.getByRole('tab', { name: /Auditoria/i }).first().click();
await page.waitForTimeout(1200);
await page.evaluate(() => (window.__cab.parado = true));
const frames = await page.evaluate(() => window.__cab.frames);
const t0 = frames.length ? frames[0].t : 0;
const amostra = frames
  .map((f) => ({ ms: f.t - t0, escala: f.escala, ty: f.ty, o: f.o, eventosVisiveis: f.eventosVisiveis }))
  .filter((_, i) => i % 3 === 0)
  .slice(0, 32);

console.log(
  JSON.stringify(
    {
      escalaMinima: Math.min(...frames.map((f) => f.escala)),
      escalaFinal: frames.length ? frames[frames.length - 1].escala : null,
      eventosVisiveisDuranteAEscala: frames.filter((f) => f.escala < 0.999 && f.eventosVisiveis > 0).length,
      conclusaoDoCabecalhoMs: frames.find((f) => f.o >= 0.99 && f.escala > 0.999)?.t - t0 ?? null,
      primeiroEventoVisivelMs: frames.find((f) => f.eventosVisiveis > 0)?.t - t0 ?? null,
      amostra,
    },
    null,
    2
  )
);
await browser.close();
