/**
 * TEMPORÁRIO — validação do fluxo REAL do usuário no Simulador ROI:
 *   1. carrega a aba;
 *   2. rola com a roda do mouse até o gráfico (disparo automático);
 *   3. clica em "Reproduzir animação" três vezes.
 * Uso: node scripts/_tmp-roi-validacao-usuario.mjs
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 300)));
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});

await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
await page.getByRole('tab', { name: /Simulador ROI/ }).click();
await page.getByText('1. Configure seu cenário').waitFor({ timeout: 15000 });
await page.waitForTimeout(1500);

const ler = () =>
  page.evaluate(() => {
    const wrap = document.querySelector('.roi-grafico');
    const payout = document.querySelector('[data-testid="roi-bar-payout"]');
    const status = document.querySelector('[data-testid="roi-anim-status"]');
    const caixa = wrap?.getBoundingClientRect();
    return {
      status: (status?.textContent ?? '').trim(),
      fase: wrap?.getAttribute('data-fase') ?? null,
      payout: Number(getComputedStyle(wrap).getPropertyValue('--roi-payout-scale') || 0),
      economia: Number(getComputedStyle(wrap).getPropertyValue('--roi-economia-scale') || 0),
      barraH: Math.round(payout?.getBoundingClientRect().height ?? 0),
      topo: Math.round(caixa?.top ?? 0),
      base: Math.round(caixa?.bottom ?? 0),
      viewport: window.innerHeight,
    };
  });

console.log('INICIAL', JSON.stringify(await ler()));

// 1 · rolagem real com a roda do mouse até a base do gráfico aparecer.
await page.mouse.move(720, 500);
for (let i = 0; i < 14; i += 1) {
  await page.mouse.wheel(0, 80);
  await page.waitForTimeout(90);
}

// 2 · amostra a animação automática.
const auto = [];
for (let i = 0; i < 34; i += 1) {
  auto.push({ t: i * 100, ...(await ler()) });
  await page.waitForTimeout(100);
}
console.log(
  'AUTOMATICO',
  JSON.stringify(
    auto.map((a) => ({ t: a.t, status: a.status, payout: a.payout, h: a.barraH, topo: a.topo, base: a.base })),
  ),
);

// 3 · três ciclos do botão manual.
const ciclos = [];
for (let c = 0; c < 3; c += 1) {
  await page.getByTestId('reproduzir-animacao').click();
  await page.waitForTimeout(130);
  const inicio = await ler();
  await page.waitForTimeout(700);
  const meio = await ler();
  await page.waitForTimeout(1200);
  const fim = await ler();
  ciclos.push({
    ciclo: c + 1,
    inicio: { status: inicio.status, payout: inicio.payout, h: inicio.barraH },
    meio: { status: meio.status, payout: meio.payout, h: meio.barraH },
    fim: { status: fim.status, payout: fim.payout, h: fim.barraH },
  });
}
console.log('CICLOS', JSON.stringify(ciclos));
console.log('ERROS', JSON.stringify(erros.slice(0, 5)));
await page.screenshot({ path: 'tmp-roi-validacao-usuario.png' });
await context.close();
await browser.close();
