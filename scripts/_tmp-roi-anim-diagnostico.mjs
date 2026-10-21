/**
 * TEMPORÁRIO — diagnóstico REAL da animação das barras do Simulador ROI.
 * Mede variáveis CSS, transform computado e estado do controlador em cada fase.
 * Uso: node scripts/_tmp-roi-anim-diagnostico.mjs
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1600, height: 1000 },
});
const page = await context.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 300)));
page.on('console', (m) => {
  if (m.type() === 'error') erros.push(`console: ${m.text().slice(0, 200)}`);
});
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});

await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
await page.getByRole('tab', { name: /Simulador ROI/ }).click();
await page.getByText('1. Configure seu cenário').waitFor({ timeout: 15000 });
await page.waitForTimeout(1200);

const ler = () =>
  page.evaluate(() => {
    const wrap = document.querySelector('.roi-grafico');
    const payout = document.querySelector('[data-testid="roi-bar-payout"]');
    const economia = document.querySelector('[data-testid="roi-bar-economia"]');
    const status = document.querySelector('[data-testid="roi-anim-status"]');
    const sentinela = wrap?.querySelector('span[aria-hidden]');
    const s = (el) => (el ? getComputedStyle(el) : null);
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) };
    };
    return {
      rolagem: Math.round(window.scrollY),
      status: (status?.textContent ?? '').trim(),
      faseAttr: wrap?.getAttribute('data-fase') ?? null,
      vars: wrap
        ? {
            payout: s(wrap).getPropertyValue('--roi-payout-scale').trim(),
            economia: s(wrap).getPropertyValue('--roi-economia-scale').trim(),
            rotulos: s(wrap).getPropertyValue('--roi-rotulos-opacity').trim(),
          }
        : null,
      payout: payout ? { existe: true, transform: s(payout).transform, classe: payout.getAttribute('class'), rect: r(payout) } : null,
      economia: economia ? { existe: true, transform: s(economia).transform, rect: r(economia) } : null,
      svgBarras: document.querySelectorAll('.roi-grafico .recharts-bar-rectangle').length,
      sentinela: r(sentinela),
      grafico: r(wrap),
      viewport: { h: window.innerHeight },
    };
  });

console.log('INICIAL', JSON.stringify(await ler(), null, 2));

// Rolar até o gráfico e amostrar a animação automática.
await page.getByText('2. Visualize o impacto').scrollIntoViewIfNeeded();
const amostra = [];
for (let i = 0; i < 32; i += 1) {
  amostra.push({ t: i * 100, ...(await ler()) });
  await page.waitForTimeout(100);
}
console.log(
  'AUTOMATICO',
  JSON.stringify(
    amostra.map((a) => ({
      t: a.t,
      rolagem: a.rolagem,
      status: a.status,
      vars: a.vars,
      payoutTransform: a.payout?.transform,
      payoutH: a.payout?.rect?.h,
      sentinela: a.sentinela,
    })),
    null,
    2,
  ),
);

// Botão manual.
await page.getByTestId('reproduzir-animacao').click();
const manual = [];
for (let i = 0; i < 24; i += 1) {
  await page.waitForTimeout(80);
  const l = await ler();
  manual.push({
    t: i * 80,
    status: l.status,
    payout: l.vars?.payout,
    economia: l.vars?.economia,
    payoutTransform: l.payout?.transform,
    payoutH: l.payout?.rect?.h,
  });
}
console.log('MANUAL', JSON.stringify(manual, null, 2));

// Re-render comum (mexer em um slider) e observar se a animação é cancelada.
await page.getByTestId('reproduzir-animacao').click();
await page.waitForTimeout(300);
await page.getByRole('slider', { name: 'Colaboradores' }).focus();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(120);
const aposSlider = await ler();
await page.waitForTimeout(1800);
const aposSliderFim = await ler();
console.log('SLIDER_DURANTE', JSON.stringify({ status: aposSlider.status, vars: aposSlider.vars, payoutH: aposSlider.payout?.rect?.h }));
console.log('SLIDER_FIM', JSON.stringify({ status: aposSliderFim.status, vars: aposSliderFim.vars, payoutH: aposSliderFim.payout?.rect?.h }));

// Redimensionar durante a animação.
await page.getByTestId('reproduzir-animacao').click();
await page.waitForTimeout(250);
await page.setViewportSize({ width: 1200, height: 900 });
await page.waitForTimeout(1500);
const aposResize = await ler();
console.log('RESIZE_FIM', JSON.stringify({ status: aposResize.status, vars: aposResize.vars, payoutH: aposResize.payout?.rect?.h }));

// Três ciclos seguidos do botão.
const ciclos = [];
for (let c = 0; c < 3; c += 1) {
  await page.getByTestId('reproduzir-animacao').click();
  await page.waitForTimeout(120);
  const inicio = await ler();
  await page.waitForTimeout(800);
  const meio = await ler();
  await page.waitForTimeout(1100);
  const fim = await ler();
  ciclos.push({
    ciclo: c + 1,
    inicio: { status: inicio.status, payout: inicio.vars?.payout, economia: inicio.vars?.economia, h: inicio.payout?.rect?.h },
    meio: { status: meio.status, payout: meio.vars?.payout, economia: meio.vars?.economia, h: meio.payout?.rect?.h },
    fim: { status: fim.status, payout: fim.vars?.payout, economia: fim.vars?.economia, h: fim.payout?.rect?.h },
  });
}
console.log('CICLOS', JSON.stringify(ciclos, null, 2));
console.log('ERROS', JSON.stringify(erros.slice(0, 10), null, 2));

await page.screenshot({ path: 'tmp-roi-diagnostico.png', fullPage: false });
await context.close();
await browser.close();
