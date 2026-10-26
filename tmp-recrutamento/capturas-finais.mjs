import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PASTA = resolve('tmp-recrutamento/padrao-admissao');
mkdirSync(PASTA, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1600, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'off');
});
const page = await context.newPage();
page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

async function irPara(url) {
  await page.goto(`http://localhost:8080${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  const temConteudo =
    (await page.locator('[data-pipeline-board]').count()) > 0 ||
    (await page.getByRole('tab', { name: 'Kanban' }).count()) > 0;
  if (temConteudo) return;
  // Sessão expirada/rotacionada: refaz o login pela UI (credenciais de teste).
  console.log('LOGIN FALLBACK em', url);
  await page.goto('http://localhost:8080/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.getByLabel(/e-?mail/i).first().fill('admin@teste.local');
  await page.getByLabel(/senha|password/i).first().fill('Admin@2026!');
  await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
  await page.waitForTimeout(5000);
  await page.goto(`http://localhost:8080${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
}

async function capturarPipeline(w, h) {
  await page.setViewportSize({ width: w, height: h });
  await irPara('/recrutamento');
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
    const board = document.querySelector('[data-pipeline-board]');
    if (board) board.scrollLeft = 0;
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const board = document.querySelector('[data-pipeline-board]');
    const main = document.querySelector('main');
    if (!board || !main) return;
    const r = board.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 8) {
      main.scrollTop += r.bottom - window.innerHeight + 24;
    }
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${PASTA}/final-recrutamento-${w}x${h}.jpg`, type: 'jpeg', quality: 60 });
  await page.locator('[data-pipeline-board]').screenshot({
    path: `${PASTA}/final-recrutamento-board-${w}x${h}.jpg`,
    type: 'jpeg',
    quality: 60,
  });
}

async function capturarAdmissao(w, h) {
  await page.setViewportSize({ width: w, height: h });
  await irPara('/admissoes');
  try {
    await page.getByRole('tab', { name: 'Kanban' }).click({ timeout: 10_000 });
  } catch {
    console.log(`ADMISSAO ${w}x${h}: aba indisponível`);
    return null;
  }
  await page.waitForTimeout(3500);
  const slot = page.locator('.kanban-lane-slot').first();
  if ((await slot.count()) === 0) return null;
  await page.evaluate(() => {
    const lane = document.querySelector('.kanban-lane-slot');
    const main = document.querySelector('main');
    if (!lane || !main) return;
    const r = lane.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 8) {
      main.scrollTop += r.bottom - window.innerHeight + 24;
    }
  });
  await page.waitForTimeout(250);
  const caixa = await slot.boundingBox();
  await page.screenshot({ path: `${PASTA}/final-admissao-${w}x${h}.jpg`, type: 'jpeg', quality: 60 });
  const board = slot.locator('..');
  await board.screenshot({ path: `${PASTA}/final-admissao-board-${w}x${h}.jpg`, type: 'jpeg', quality: 60 });
  return caixa ? { width: Math.round(caixa.width), height: Math.round(caixa.height) } : null;
}

const medidas = {};
for (const [w, h] of [
  [1920, 1080],
  [1600, 900],
  [1440, 900],
  [1366, 768],
  [390, 844],
]) {
  await capturarPipeline(w, h);
  if ([1600, 1440, 390].includes(w)) {
    medidas[`admissao-${w}x${h}`] = await capturarAdmissao(w, h);
  }
}

// 2x2: Admissão x Recrutamento em 1600 e 1440.
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#0b1220;color:#e5e7eb;font:600 20px/1.3 system-ui,sans-serif;padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:18px}
  figure{margin:0;min-width:0}
  figcaption{padding:4px 2px 10px}
  img{display:block;width:100%;border:1px solid #22304a;border-radius:10px}
</style></head><body>
  <figure><figcaption>ADMISSÃO — referência 1600×900</figcaption><img src="final-admissao-board-1600x900.jpg"></figure>
  <figure><figcaption>RECRUTAMENTO — padronizado 1600×900</figcaption><img src="final-recrutamento-board-1600x900.jpg"></figure>
  <figure><figcaption>ADMISSÃO — referência 1440×900</figcaption><img src="final-admissao-board-1440x900.jpg"></figure>
  <figure><figcaption>RECRUTAMENTO — padronizado 1440×900</figcaption><img src="final-recrutamento-board-1440x900.jpg"></figure>
</body></html>`;
writeFileSync(`${PASTA}/comparativo-final.html`, html);

const comparador = await context.newPage();
await comparador.setViewportSize({ width: 2560, height: 1500 });
await comparador.goto(`file:///${PASTA.replace(/\\/g, '/')}/comparativo-final.html`);
await comparador.waitForTimeout(900);
await comparador.screenshot({ path: `${PASTA}/comparativo-final.jpg`, type: 'jpeg', quality: 55 });

// Mobile lado a lado.
const htmlMobile = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#0b1220;color:#e5e7eb;font:600 16px/1.3 system-ui,sans-serif;padding:14px;display:flex;gap:14px}
  figure{margin:0;flex:1}figcaption{padding:4px 2px 8px}
  img{display:block;width:100%;border:1px solid #22304a;border-radius:10px}
</style></head><body>
  <figure><figcaption>ADMISSÃO 390×844</figcaption><img src="final-admissao-390x844.jpg"></figure>
  <figure><figcaption>RECRUTAMENTO 390×844</figcaption><img src="final-recrutamento-390x844.jpg"></figure>
</body></html>`;
writeFileSync(`${PASTA}/comparativo-mobile.html`, htmlMobile);
await comparador.setViewportSize({ width: 1000, height: 1100 });
await comparador.goto(`file:///${PASTA.replace(/\\/g, '/')}/comparativo-mobile.html`);
await comparador.waitForTimeout(700);
await comparador.screenshot({ path: `${PASTA}/comparativo-mobile.jpg`, type: 'jpeg', quality: 55 });

console.log('MEDIDAS_ADMISSAO', JSON.stringify(medidas));
await browser.close();
