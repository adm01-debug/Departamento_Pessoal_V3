import { chromium } from '@playwright/test';

const CAPTURAR = async () => {
  const esperarLinha = () =>
    new Promise((resolve) => {
      const tick = () => {
        if (document.querySelector('table tbody tr')) resolve();
        else requestAnimationFrame(tick);
      };
      tick();
    });
  await esperarLinha();
  const t0 = performance.now();
  const pontos = [];
  await new Promise((resolve) => {
    const loop = (t) => {
      const linha = document.querySelector('table tbody tr');
      const cs = getComputedStyle(linha);
      pontos.push({
        t: Math.round(t - t0),
        o: Number(cs.opacity),
        tr: cs.transform,
      });
      if (t - t0 < 2200) requestAnimationFrame(loop);
      else resolve();
    };
    requestAnimationFrame(loop);
  });
  return pontos;
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
const curvaRef = await ref.p.evaluate(CAPTURAR);
await ref.c.close();

const dst = await nova();
await dst.p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await dst.p.getByRole('tab', { name: 'Candidatos', exact: true }).click();
const curvaDst = await dst.p.evaluate(CAPTURAR);
await dst.c.close();

const resumir = (pontos) => {
  const primeiroVisivel = pontos.find((p) => p.o > 0.01);
  const primeiroReset = pontos.slice(1).find((p, i) => p.o < pontos[i].o - 0.05);
  return {
    total: pontos.length,
    inicioOpacidade: primeiroVisivel?.t ?? null,
    primeiroValorNaoZero: primeiroVisivel?.o ?? null,
    reset: primeiroReset ?? null,
    primeiros: pontos.filter((_, i) => i % 3 === 0).slice(0, 40),
  };
};

console.log(JSON.stringify({ referencia: resumir(curvaRef), destino: resumir(curvaDst) }, null, 2));
await browser.close();
