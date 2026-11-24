/** TEMPORÁRIO — diálogo aninhado (Adicionar Curso) e confirmações de Treinamentos/Trilhas. */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const browser = await chromium.launch();
const rel = {};
const novoContexto = async () => {
  const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
  return context;
};

try {
  // A) Nested: Trilha > Adicionar Curso
  {
    const context = await novoContexto();
    const page = await context.newPage();
    await page.goto(`${BASE}/treinamentos`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2600);
    await page.getByRole('tab', { name: 'Trilhas' }).click();
    await page.waitForTimeout(900);
    await page.getByRole('button', { name: 'Explorar trilha', exact: true }).first().click();
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.__rec = { t0: 0, frames: [], raf: 0 };
      const tick = () => {
        const todos = document.querySelectorAll('[role="dialog"][data-state]');
        const c = todos[todos.length - 1] ?? null;
        const agora = performance.now();
        if (!window.__rec.t0 && todos.length === 2) window.__rec.t0 = agora;
        if (window.__rec.t0) {
          const cs = c ? getComputedStyle(c) : null;
          window.__rec.frames.push({ t: Math.round(agora - window.__rec.t0), presentes: todos.length, transform: cs ? cs.transform : null });
        }
        window.__rec.raf = requestAnimationFrame(tick);
      };
      tick();
    });
    await page.getByRole('button', { name: 'Adicionar Curso', exact: true }).click();
    await page.waitForTimeout(1500);
    const frames = await page.evaluate(() => {
      cancelAnimationFrame(window.__rec.raf);
      return window.__rec.frames;
    });
    const escala = (t) => {
      if (!t || t === 'none') return 1;
      const m = t.match(/matrix(?:3d)?\(([^)]+)\)/);
      if (!m) return 1;
      const v = m[1].split(',').map(Number);
      return v.length === 6 ? Math.hypot(v[0], v[1]) : Math.hypot(v[0], v[1]);
    };
    const p = frames.filter((f) => f.presentes === 2);
    let abertoEm = null;
    for (let i = 0; i < p.length; i += 1) {
      if (p.slice(i).every((f) => escala(f.transform) >= 0.985)) { abertoEm = p[i].t; break; }
    }
    rel.aninhado = {
      abertoEmMs: abertoEm,
      escalaInicial: escala(p[0]?.transform),
      dialogosDurante: await page.locator('[role="dialog"]').count(),
      foco: await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 30) ?? null),
    };
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1800);
    rel.aninhado.aposEscape = await page.locator('[role="dialog"]').count();
    rel.aninhado.focoAposEscape = await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 30) ?? null);
    await context.close();
  }

  // B) Confirmação Excluir Treinamento
  {
    const context = await novoContexto();
    const page = await context.newPage();
    await page.goto(`${BASE}/treinamentos`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2600);
    await page.getByRole('button', { name: /^Ações de / }).first().click();
    await page.waitForTimeout(400);
    await page.getByRole('menuitem', { name: /Excluir treinamento/ }).click();
    await page.waitForTimeout(1400);
    rel.excluirTreinamento = { alerta: await page.locator('[role="alertdialog"]').count() };
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await page.waitForTimeout(1800);
    rel.excluirTreinamento.fechou = (await page.locator('[role="alertdialog"]').count()) === 0;
    await context.close();
  }

  // C) Confirmação Excluir Trilha
  {
    const context = await novoContexto();
    const page = await context.newPage();
    await page.goto(`${BASE}/treinamentos`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2600);
    await page.getByRole('tab', { name: 'Trilhas' }).click();
    await page.waitForTimeout(900);
    await page.getByRole('button', { name: /^Ações de / }).first().click();
    await page.waitForTimeout(400);
    await page.getByRole('menuitem', { name: /Excluir trilha/ }).click();
    await page.waitForTimeout(1400);
    rel.excluirTrilha = { alerta: await page.locator('[role="alertdialog"]').count() };
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await page.waitForTimeout(1800);
    rel.excluirTrilha.fechou = (await page.locator('[role="alertdialog"]').count()) === 0;
    await context.close();
  }
} finally {
  await browser.close();
  writeFileSync('tmp-validacao-treinamentos/relatorio-aninhado.json', JSON.stringify(rel, null, 2));
  console.log(JSON.stringify(rel, null, 2));
}
