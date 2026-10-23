/** TEMPORÁRIO — confirmações (AlertDialog) de Treinamentos: animação e semântica. */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const browser = await chromium.launch();
const rel = {};

const escala = (t) => {
  if (!t || t === 'none') return { x: 1, y: 1 };
  const m = t.match(/matrix(?:3d)?\(([^)]+)\)/);
  if (!m) return { x: 1, y: 1 };
  const v = m[1].split(',').map(Number);
  return v.length === 6 ? { x: Math.hypot(v[0], v[1]), y: Math.hypot(v[2], v[3]) } : { x: Math.hypot(v[0], v[1]), y: Math.hypot(v[4], v[5]) };
};

async function abrirAlerta(page) {
  await page.goto(`${BASE}/treinamentos`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  await page.getByRole('tab', { name: 'Catálogo' }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /^Ações do curso / }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('menuitem', { name: /Excluir curso/ }).click();
  await page.waitForTimeout(1600);
}

try {
  // A) abertura medida
  {
    const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
    const page = await context.newPage();
    await page.goto(`${BASE}/treinamentos`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2600);
    await page.getByRole('tab', { name: 'Catálogo' }).click();
    await page.waitForTimeout(900);
    await page.getByRole('button', { name: /^Ações do curso / }).first().click();
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      window.__rec = { t0: 0, frames: [], raf: 0 };
      const tick = () => {
        const c = document.querySelector('[role="alertdialog"][data-state]');
        const agora = performance.now();
        if (!window.__rec.t0 && c) window.__rec.t0 = agora;
        if (window.__rec.t0) {
          const cs = c ? getComputedStyle(c) : null;
          window.__rec.frames.push({ t: Math.round(agora - window.__rec.t0), presente: !!c, transform: cs ? cs.transform : null });
        }
        window.__rec.raf = requestAnimationFrame(tick);
      };
      tick();
    });
    await page.getByRole('menuitem', { name: /Excluir curso/ }).click();
    await page.waitForTimeout(1600);
    const frames = await page.evaluate(() => {
      cancelAnimationFrame(window.__rec.raf);
      return window.__rec.frames;
    });
    const p = frames.filter((f) => f.presente);
    let abertoEm = null;
    for (let i = 0; i < p.length; i += 1) {
      if (p.slice(i).every((f) => { const s = escala(f.transform); return s.x >= 0.985 && s.y >= 0.985; })) { abertoEm = p[i].t; break; }
    }
    rel.abertoEmMs = abertoEm;
    rel.escalaInicial = escala(p[0]?.transform);
    rel.focoInicial = await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 30) ?? null);
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await page.waitForTimeout(2000);
    rel.focoAposCancelar = await page.evaluate(() => ({ aria: document.activeElement?.getAttribute('aria-label'), texto: document.activeElement?.textContent?.trim().slice(0, 30) }));
    rel.fechouPorCancelar = (await page.locator('[role="alertdialog"]').count()) === 0;
    await context.close();
  }

  // B) Escape
  {
    const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
    const page = await context.newPage();
    await abrirAlerta(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2000);
    rel.escapeFecha = (await page.locator('[role="alertdialog"]').count()) === 0;
    await context.close();
  }

  // C) clique no véu
  {
    const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
    const page = await context.newPage();
    await abrirAlerta(page);
    const alvo = await page.evaluate(() => {
      const el = document.elementFromPoint(8, 8);
      return el ? `${el.tagName}.${String(el.className).slice(0, 60)}` : null;
    });
    await page.mouse.click(8, 8);
    await page.waitForTimeout(2000);
    rel.backdrop = { elementoNoPonto: alvo, fechou: (await page.locator('[role="alertdialog"]').count()) === 0 };
    await context.close();
  }
} finally {
  await browser.close();
  writeFileSync('tmp-validacao-treinamentos/relatorio-alerta.json', JSON.stringify(rel, null, 2));
  console.log(JSON.stringify(rel, null, 2));
}
