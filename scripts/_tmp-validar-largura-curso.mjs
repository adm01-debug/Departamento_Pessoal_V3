/** TEMPORÁRIO — confirma a largura REAL e a ausência de elementos que a forcem. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const OUT = 'tmp-redesign-curso';
mkdirSync(OUT, { recursive: true });
const rel = { viewports: [], animacao: null };
const browser = await chromium.launch({ args: ['--disable-frame-rate-limit'] });

async function abrir(page) {
  await page.goto(`${BASE}/treinamentos`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2700);
  await page.getByRole('tab', { name: 'Catálogo' }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /^Ver curso/ }).first().click();
  await page.waitForTimeout(2000);
}

try {
  for (const [w, h] of [[1920, 1080], [1440, 900], [1366, 768], [1024, 768], [768, 1024], [390, 844]]) {
    const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: w, height: h } });
    await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
    const page = await context.newPage();
    await abrir(page);
    const med = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      const cs = getComputedStyle(d);
      const r = d.getBoundingClientRect();
      const interno = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const dl = d.querySelector('dl');
      const secao = dl?.parentElement?.nextElementSibling;
      const painel = secao?.querySelector('div.rounded-xl');
      const largos = Array.from(d.querySelectorAll('*'))
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter((x) => x.r.width > interno + 1)
        .map((x) => `${x.el.tagName}.${String(x.el.className).slice(0, 50)} ${Math.round(x.r.width)}`);
      return {
        larguraReal: +r.width.toFixed(2),
        cssWidth: cs.width,
        cssMaxWidth: cs.maxWidth,
        cssMinWidth: cs.minWidth,
        altura: +r.height.toFixed(2),
        proporcao: +(r.width / r.height).toFixed(2),
        padding: cs.padding,
        gapSecoes: cs.rowGap,
        gapMetadados: dl ? getComputedStyle(dl).gap : null,
        gapIconeTexto: d.querySelector('dd') ? getComputedStyle(d.querySelector('dd')).gap : null,
        paddingInscritos: painel ? getComputedStyle(painel).padding : null,
        top: +r.top.toFixed(1),
        bottom: +r.bottom.toFixed(1),
        left: +r.left.toFixed(1),
        right: +r.right.toFixed(1),
        centralizado: Math.abs(r.left - (innerWidth - r.right)) <= 1,
        dentroViewport: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
        maxHeightRespeitado: r.height <= innerHeight * 0.9 + 1,
        overflowInternoX: d.scrollWidth > d.clientWidth + 1,
        largos,
      };
    });
    rel.viewports.push({ viewport: `${w}x${h}`, ...med });
    await page.screenshot({ path: `${OUT}/final-440-${w}x${h}.png` });
    await context.close();
  }

  // animação preservada
  {
    const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
    const page = await context.newPage();
    await page.goto(`${BASE}/treinamentos`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2700);
    await page.getByRole('tab', { name: 'Catálogo' }).click();
    await page.waitForTimeout(900);
    await page.evaluate(() => {
      window.__rec = { t0: 0, frames: [], raf: 0 };
      const tick = () => {
        const c = document.querySelector('[role="dialog"][data-state]');
        const ov = Array.from(document.querySelectorAll('.backdrop-blur-sm')).find(
          (el) => getComputedStyle(el).position === 'fixed' && String(el.className).includes('inset-0')
        );
        const agora = performance.now();
        if (!window.__rec.t0 && c) window.__rec.t0 = agora;
        if (window.__rec.t0) {
          const itens = c
            ? Array.from(c.querySelectorAll('*'))
                .filter((el) => el.getAttribute('style')?.includes('opacity'))
                .map((el) => +getComputedStyle(el).opacity)
            : [];
          const cs = c ? getComputedStyle(c) : null;
          window.__rec.frames.push({
            t: Math.round(agora - window.__rec.t0),
            transform: cs ? cs.transform : null,
            overlay: ov ? +getComputedStyle(ov).opacity : null,
            itens,
          });
        }
        window.__rec.raf = requestAnimationFrame(tick);
      };
      tick();
    });
    await page.getByRole('button', { name: /^Ver curso/ }).first().click();
    await page.waitForTimeout(2500);
    const frames = await page.evaluate(() => {
      cancelAnimationFrame(window.__rec.raf);
      return window.__rec.frames;
    });
    const esc = (t) => {
      if (!t || t === 'none') return { x: 1, y: 1 };
      const m = t.match(/matrix(?:3d)?\(([^)]+)\)/);
      if (!m) return { x: 1, y: 1 };
      const v = m[1].split(',').map(Number);
      return v.length === 6
        ? { x: Math.hypot(v[0], v[1]), y: Math.hypot(v[2], v[3]) }
        : { x: Math.hypot(v[0], v[1]), y: Math.hypot(v[4], v[5]) };
    };
    let aberto = null;
    for (let i = 0; i < frames.length; i += 1) {
      if (frames.slice(i).every((f) => { const s = esc(f.transform); return s.x >= 0.985 && s.y >= 0.985; })) {
        aberto = frames[i].t;
        break;
      }
    }
    let overlay = null;
    for (let i = 0; i < frames.length; i += 1) {
      if (frames.slice(i).every((f) => (f.overlay ?? 1) >= 0.975)) {
        overlay = frames[i].t;
        break;
      }
    }
    const primeiros = frames.find((f) => f.itens.length)?.itens ?? [];
    const inicios = primeiros.map((_, idx) => {
      const f = frames.find((x) => (x.itens[idx] ?? 0) > 0.03);
      return f ? f.t : null;
    });
    rel.animacao = { abertoEmMs: aberto, overlayEmMs: overlay, inicios };
    await context.close();
  }
} catch (erro) {
  rel.erro = String(erro?.stack ?? erro).slice(0, 1200);
} finally {
  await browser.close();
  writeFileSync(`${OUT}/relatorio-440.json`, JSON.stringify(rel, null, 2));
  console.log(JSON.stringify(rel, null, 2).slice(0, 14000));
}
