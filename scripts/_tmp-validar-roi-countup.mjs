import { chromium } from 'playwright';

const BASE = 'http://localhost:8080';
const STORAGE = 'e2e/.auth/user.json';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 950 },
  storageState: STORAGE,
  reducedMotion: 'no-preference',
});
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

async function abrirSimulador(p) {
  await p.goto(`${BASE}/premiacoes`, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => localStorage.setItem('dp-tour-completed', 'true'));
  await p.reload({ waitUntil: 'domcontentloaded' });
  const aba = p.getByRole('tab', { name: /Simulador ROI/i });
  await aba.waitFor({ state: 'visible', timeout: 30_000 });
  return aba;
}

const valoresKpi = () =>
  page.locator('[data-testid="kpi-valor"]').allTextContents();

const aba = await abrirSimulador(page);

// Instrumenta ANTES do clique na aba: valores dos KPIs e opacidade do 1º card.
await page.evaluate(() => {
  window.__kpiLog = [];
  window.__entradaLog = [];
  const t0 = performance.now();
  const kpiLoop = () => {
    const els = [...document.querySelectorAll('[data-testid="kpi-valor"]')];
    if (els.length) {
      const valores = els.map((e) => e.textContent?.trim() ?? '');
      const anterior = window.__kpiLog.at(-1)?.valores;
      if (!anterior || valores.some((v, i) => v !== anterior[i])) {
        window.__kpiLog.push({ t: Math.round(performance.now() - t0), valores });
      }
    }
    if (performance.now() - t0 < 4500) requestAnimationFrame(kpiLoop);
  };
  requestAnimationFrame(kpiLoop);
  const entradaId = setInterval(() => {
    const card = document.querySelector('[data-testid="kpi-resultado"]');
    if (!card) return;
    const s = getComputedStyle(card);
    const opacity = Number(parseFloat(s.opacity).toFixed(3));
    const anterior = window.__entradaLog.at(-1);
    if (!anterior || Math.abs(opacity - anterior.opacity) > 0.01) {
      window.__entradaLog.push({ t: Math.round(performance.now() - t0), opacity, transform: s.transform });
    }
  }, 16);
  setTimeout(() => {
    clearInterval(entradaId);
  }, 4500);
});

await aba.click();
await page.locator('[data-testid="kpi-valor"]').first().waitFor({ timeout: 15_000 });
await page.waitForTimeout(2600);
const kpiLog = await page.evaluate(() => window.__kpiLog);
const entradaLog = await page.evaluate(() => window.__entradaLog);
const kpiFinal = await valoresKpi();

// ── Scroll 5×: nenhuma contagem/entrada deve reiniciar ───────────────────────
const kpi = page.locator('[data-testid="kpi-resultado"]').first();
const scrollSamples = [];
for (let i = 0; i < 5; i++) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(180);
  await kpi.scrollIntoViewIfNeeded();
  await page.waitForTimeout(40);
  scrollSamples.push(await valoresKpi());
  const opacidade = await kpi.evaluate((el) => Number(getComputedStyle(el).opacity));
  scrollSamples.push([`opacidade=${opacidade}`]);
  await page.waitForTimeout(120);
}
const kpiPosScroll = await valoresKpi();

// ── Colaboradores: alteração deve atualizar direto, sem voltar a zero ───────
const antesSlider = await valoresKpi();
await page.evaluate(() => {
  window.__sliderLog = [];
  const id = setInterval(() => {
    const els = [...document.querySelectorAll('[data-testid="kpi-valor"]')];
    if (!els.length) return;
    const valores = els.map((e) => e.textContent?.trim() ?? '');
    const anterior = window.__sliderLog.at(-1)?.valores;
    if (!anterior || valores.some((v, i) => v !== anterior[i])) {
      window.__sliderLog.push({ t: Date.now(), valores });
    }
  }, 16);
  setTimeout(() => clearInterval(id), 1500);
});
const slider = page.getByRole('slider', { name: 'Colaboradores' }).first();
await slider.scrollIntoViewIfNeeded();
await slider.focus();
for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(500);
const sliderLog = await page.evaluate(() => window.__sliderLog);
const depoisSlider = await valoresKpi();
await kpi.scrollIntoViewIfNeeded();
const opacidadeDepoisSlider = await kpi.evaluate((el) => Number(getComputedStyle(el).opacity));

// ── Os outros quatro parâmetros também atualizam sem reiniciar nada ─────────
const outrosSliders = [];
for (const nome of ['Salário médio', '% Bônus-alvo', 'Atingimento de meta', 'Redução de turnover']) {
  const s = page.getByRole('slider', { name: nome }).first();
  await s.scrollIntoViewIfNeeded();
  await s.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(120);
  outrosSliders.push({ nome, valores: await valoresKpi() });
}
const depoisTodosSliders = await valoresKpi();

// ── Sair e voltar à aba: nova contagem permitida ───────────────────────────
const abaCampanhas = page.getByRole('tab', { name: /Campanhas/i });
await abaCampanhas.click();
await page.waitForTimeout(500);
await page.evaluate(() => {
  window.__retornoLog = [];
  const id = setInterval(() => {
    const els = [...document.querySelectorAll('[data-testid="kpi-valor"]')];
    if (!els.length) return;
    const valores = els.map((e) => e.textContent?.trim() ?? '');
    const anterior = window.__retornoLog.at(-1)?.valores;
    if (!anterior || valores.some((v, i) => v !== anterior[i])) {
      window.__retornoLog.push({ t: Date.now(), valores });
    }
  }, 16);
  setTimeout(() => clearInterval(id), 1800);
});
await aba.click();
await page.locator('[data-testid="kpi-valor"]').first().waitFor({ timeout: 15_000 });
await page.waitForTimeout(1600);
const retornoLog = await page.evaluate(() => window.__retornoLog);
const kpiRetorno = await valoresKpi();

// ── Movimento reduzido: valor final imediato, sem contagem ─────────────────
const contextReduzido = await browser.newContext({
  viewport: { width: 1440, height: 950 },
  storageState: STORAGE,
  reducedMotion: 'reduce',
});
await contextReduzido.addInitScript(() => localStorage.setItem('dp-force-motion', 'off'));
const pageReduzido = await contextReduzido.newPage();
const abaReduzido = await abrirSimulador(pageReduzido);
await pageReduzido.evaluate(() => {
  window.__reduzidoLog = [];
  const id = setInterval(() => {
    const els = [...document.querySelectorAll('[data-testid="kpi-valor"]')];
    if (!els.length) return;
    const valores = els.map((e) => e.textContent?.trim() ?? '');
    const anterior = window.__reduzidoLog.at(-1)?.valores;
    if (!anterior || valores.some((v, i) => v !== anterior[i])) {
      window.__reduzidoLog.push({ t: Date.now(), valores });
    }
  }, 16);
  setTimeout(() => clearInterval(id), 1500);
});
await abaReduzido.click();
await pageReduzido.locator('[data-testid="kpi-valor"]').first().waitFor({ timeout: 15_000 });
await pageReduzido.waitForTimeout(700);
const reduzidoLog = await pageReduzido.evaluate(() => window.__reduzidoLog);
const kpiReduzido = await pageReduzido
  .locator('[data-testid="kpi-valor"]')
  .allTextContents();

console.log(JSON.stringify({
  kpiFinal,
  kpiLog,
  entradaLog,
  scrollSamples,
  kpiPosScroll,
  antesSlider,
  depoisSlider,
  sliderLog,
  opacidadeDepoisSlider,
  outrosSliders,
  depoisTodosSliders,
  retornoLog,
  kpiRetorno,
  kpiReduzido,
  reduzidoLog,
  pageErrors,
}, null, 2));

await contextReduzido.close();
await context.close();
await browser.close();
