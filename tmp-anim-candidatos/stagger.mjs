import { chromium } from '@playwright/test';

const CAPTURAR = async (minimo) => {
  await new Promise((resolve) => {
    const tick = () => {
      if (document.querySelectorAll('table tbody tr').length >= minimo) resolve();
      else requestAnimationFrame(tick);
    };
    tick();
  });
  const linhas = [...document.querySelectorAll('table tbody tr')];
  const t0 = performance.now();
  const inicios = linhas.map(() => null);
  const amostras = [];
  await new Promise((resolve) => {
    const loop = (t) => {
      linhas.forEach((linha, i) => {
        if (inicios[i] == null && Number(getComputedStyle(linha).opacity) > 0.01) {
          inicios[i] = Math.round(t - t0);
        }
      });
      amostras.push(t - t0);
      if (t - t0 < 1400) requestAnimationFrame(loop);
      else resolve();
    };
    requestAnimationFrame(loop);
  });
  return { inicios, intervalos: inicios.slice(1).map((v, i) => (v == null || inicios[i] == null ? null : v - inicios[i])) };
};

const browser = await chromium.launch();
async function nova() {
  const c = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1440, height: 900 },
  });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  const p = await c.newPage();
  p.setDefaultTimeout(60000);
  return { c, p };
}

const ref = await nova();
await ref.p.goto('http://localhost:8080/desligamentos', { waitUntil: 'domcontentloaded' });
await ref.p.getByText('Processos', { exact: false }).first().waitFor({ state: 'visible' });
const r = await ref.p.evaluate(CAPTURAR, 5);
await ref.c.close();

const dst = await nova();
await dst.p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await dst.p.getByRole('tab', { name: 'Candidatos', exact: true }).click();
const d = await dst.p.evaluate(CAPTURAR, 8);
await dst.c.close();

console.log(JSON.stringify({ referencia: r, destino: d }, null, 2));
await browser.close();
