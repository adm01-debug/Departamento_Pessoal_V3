import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.addInitScript(() => localStorage.setItem('ui-theme', 'dark'));
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: 'Treinamentos' }).waitFor({ timeout: 30_000 });
await page.waitForTimeout(2200);

// Captura do indicador no meio do deslocamento (recorte da barra).
await page.evaluate(() => {
  const alvo = [...document.querySelectorAll('[data-treinamentos-tablist] [role=tab]')].find((a) => a.textContent.includes('Certificados'));
  alvo.focus();
});
await page.waitForTimeout(90);
await page.screenshot({
  path: 'tmp-tabs-treinamentos/animacao-meio-clip-1440.png',
  clip: { x: 275, y: 252, width: 1145, height: 70 },
});
await page.waitForTimeout(700);

await page.getByRole('tab', { name: 'Treinamentos' }).click();
await page.waitForTimeout(700);

const trajetoriaTreinamentos = await page.evaluate(async () => {
  const alvo = [...document.querySelectorAll('[data-treinamentos-tablist] [role=tab]')].find((a) => a.textContent.includes('Certificados'));
  const ind = () => document.querySelector('[data-aba-indicador]');
  const amostras = [];
  const inicio = performance.now();
  alvo.focus();
  await new Promise((resolve) => {
    const tick = () => {
      const el = ind();
      if (el) {
        const r = el.getBoundingClientRect();
        amostras.push({ t: Math.round(performance.now() - inicio), x: +r.x.toFixed(2), w: +r.width.toFixed(2), o: +getComputedStyle(el).opacity });
      }
      if (performance.now() - inicio < 750) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  return amostras;
});
writeFileSync('tmp-tabs-treinamentos/trajetoria-treinamentos.json', JSON.stringify(trajetoriaTreinamentos, null, 2));

function resumo(nome, arr) {
  const inicio = arr[0];
  const fim = arr[arr.length - 1];
  const primeiro = arr.find((a) => Math.abs(a.x - inicio.x) > 0.5);
  const assentou = arr.find((a) => Math.abs(a.x - fim.x) <= 1 && a.t > (primeiro?.t ?? 0));
  return {
    nome,
    quadros: arr.length,
    inicioX: inicio.x,
    fimX: fim.x,
    deslocamento: +Math.abs(fim.x - inicio.x).toFixed(2),
    primeiroMovimentoMs: primeiro?.t ?? null,
    assentouMs: assentou?.t ?? null,
    opacidadeMin: Math.min(...arr.map((a) => a.o)),
    opacidadeMax: Math.max(...arr.map((a) => a.o)),
    larguraMin: Math.min(...arr.map((a) => a.w)),
    larguraMax: Math.max(...arr.map((a) => a.w)),
  };
}
console.log(JSON.stringify(resumo('Treinamentos', trajetoriaTreinamentos)));

// Dashboard: mesma mola (500/40), para comparação.
await page.goto('http://localhost:8080/dashboard-executivo', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab').first().waitFor({ timeout: 30_000 });
await page.waitForTimeout(1500);
const trajetoriaDashboard = await page.evaluate(async () => {
  const abas = [...document.querySelectorAll('[role=tab]')];
  const alvo = abas[abas.length - 1];
  const ind = () => document.querySelector('[role=tablist] .absolute.bg-primary');
  const amostras = [];
  const inicio = performance.now();
  alvo.click();
  await new Promise((resolve) => {
    const tick = () => {
      const el = ind();
      if (el) {
        const r = el.getBoundingClientRect();
        amostras.push({ t: Math.round(performance.now() - inicio), x: +r.x.toFixed(2), w: +r.width.toFixed(2), o: +getComputedStyle(el).opacity });
      }
      if (performance.now() - inicio < 900) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  return amostras;
});
writeFileSync('tmp-tabs-treinamentos/trajetoria-dashboard.json', JSON.stringify(trajetoriaDashboard, null, 2));
console.log(JSON.stringify(resumo('Dashboard', trajetoriaDashboard)));

await context.close();
await browser.close();
