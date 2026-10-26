import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const CAPTURAR = async (minimo) => {
  await new Promise((resolve) => {
    const tick = () => {
      if (document.querySelectorAll('table tbody tr').length >= minimo) resolve();
      else requestAnimationFrame(tick);
    };
    tick();
  });
  const t0 = performance.now();
  const pontos = [];
  await new Promise((resolve) => {
    const loop = (t) => {
      const linha = document.querySelector('table tbody tr');
      const cs = getComputedStyle(linha);
      pontos.push({ t: Math.round(t - t0), o: Number(cs.opacity), tr: cs.transform });
      if (t - t0 < 1800) requestAnimationFrame(loop);
      else resolve();
    };
    requestAnimationFrame(loop);
  });
  return pontos;
};

const resumir = (pontos) => {
  const primeiro = pontos.find((p) => p.o > 0.01);
  const transformNaoNeutro = pontos.some((p) => p.tr !== 'none' && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(p.tr));
  return {
    inicioOpacidadeMs: primeiro?.t ?? null,
    opacidadeEm50ms: pontos.find((p) => p.t >= 50)?.o ?? null,
    opacidadeFinal: pontos.at(-1)?.o ?? null,
    transformNaoNeutro,
    amostraTransform: pontos.slice(0, 4).map((p) => p.tr),
  };
};

const browser = await chromium.launch();
async function abrir() {
  const c = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'off');
  });
  const p = await c.newPage();
  p.setDefaultTimeout(60000);
  return { c, p };
}

const ref = await abrir();
await ref.p.goto('http://localhost:8080/desligamentos', { waitUntil: 'domcontentloaded' });
await ref.p.getByText('Processos', { exact: false }).first().waitFor({ state: 'visible' });
const refPts = await ref.p.evaluate(CAPTURAR, 5);
await ref.c.close();

const dst = await abrir();
await dst.p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await dst.p.getByRole('tab', { name: 'Candidatos', exact: true }).click();
const dstPts = await dst.p.evaluate(CAPTURAR, 8);
await dst.c.close();

const saida = { referencia: resumir(refPts), destino: resumir(dstPts) };
writeFileSync('tmp-anim-candidatos/reduzido.json', JSON.stringify(saida, null, 2), 'utf8');
console.log(JSON.stringify(saida, null, 2));
await browser.close();
