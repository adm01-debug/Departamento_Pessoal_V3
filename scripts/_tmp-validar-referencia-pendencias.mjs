/** TEMPORÁRIO — mede novamente a referência "Pendências" (colaborador com pendências). */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'no-preference',
});
await context.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
const page = await context.newPage();

const INSTALAR = () => {
  window.__rec = { t0: 0, frames: [], raf: 0 };
  const tick = () => {
    const c = document.querySelector('[role="dialog"][data-state]');
    const agora = performance.now();
    if (!window.__rec.t0 && c) window.__rec.t0 = agora;
    if (window.__rec.t0) {
      const cs = c ? getComputedStyle(c) : null;
      window.__rec.frames.push({ t: Math.round(agora - window.__rec.t0), presente: !!c, transform: cs ? cs.transform : null, opacity: cs ? +cs.opacity : null, oscila: 0 });
    }
    window.__rec.raf = requestAnimationFrame(tick);
  };
  tick();
};
const LER = () => {
  cancelAnimationFrame(window.__rec.raf);
  return window.__rec.frames;
};
const escala = (transform) => {
  if (!transform || transform === 'none') return { x: 1, y: 1 };
  const m = transform.match(/matrix(?:3d)?\(([^)]+)\)/);
  if (!m) return { x: 1, y: 1 };
  const v = m[1].split(',').map(Number);
  return v.length === 6
    ? { x: Math.hypot(v[0], v[1]), y: Math.hypot(v[2], v[3]) }
    : { x: Math.hypot(v[0], v[1]), y: Math.hypot(v[4], v[5]) };
};

try {
  await page.goto(`${BASE}/colaboradores`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  const linhas = await page.getByRole('row').count();
  let achou = false;
  for (let i = 1; i < Math.min(linhas, 12) && !achou; i += 1) {
    await page.getByRole('row').nth(i).click().catch(() => {});
    await page.waitForTimeout(1500);
    achou = await page.getByRole('button', { name: 'Ver todas' }).first().isVisible().catch(() => false);
    if (!achou) {
      await page.goto(`${BASE}/colaboradores`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1800);
    }
  }
  if (!achou) throw new Error('nenhum colaborador com pendências');
  await page.evaluate(INSTALAR);
  await page.getByRole('button', { name: 'Ver todas' }).first().click();
  await page.waitForTimeout(1900);
  const frames = await page.evaluate(LER);
  const p = frames.filter((f) => f.presente);
  let aberto = null;
  for (let i = 0; i < p.length; i += 1) {
    if (p.slice(i).every((f) => { const s = escala(f.transform); return s.x >= 0.985 && s.y >= 0.985; })) { aberto = p[i].t; break; }
  }
  const resumo = {
    titulo: await page.getByRole('dialog').last().innerText().then((t) => t.split('\n')[0]).catch(() => null),
    abertoEmMs: aberto,
    escalaInicial: escala(p[0].transform),
    frames: p.filter((_, i) => i % 4 === 0).map((f) => ({ t: f.t, ...escala(f.transform) })),
  };
  await page.evaluate(INSTALAR);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1800);
  const fc = await page.evaluate(LER);
  const presentes = fc.filter((f) => f.presente);
  const sumiu = fc.find((f, i) => !f.presente && i > 0 && fc[i - 1].presente);
  const encolheu = presentes.find((f) => { const s = escala(f.transform); return s.x < 0.97 || s.y < 0.97; });
  resumo.fechamento = { desmontouEmMs: sumiu ? sumiu.t : null, comecouEncolherMs: encolheu ? encolheu.t : null };
  writeFileSync('tmp-validacao-treinamentos/relatorio-referencia.json', JSON.stringify(resumo, null, 2));
  console.log(JSON.stringify(resumo, null, 2));
} finally {
  await browser.close();
}
