/**
 * TEMPORÁRIO — antes/depois e medições dos botões de CRIAÇÃO do cabeçalho de
 * Treinamentos. O estado "antes" é reconstruído trocando apenas as classes dos
 * CTAs no arquivo da página (restaurado byte-a-byte no fim).
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const PAGINA = path.join(RAIZ, 'src/pages/TreinamentosPage.tsx');
const SAIDA = path.join(RAIZ, 'tmp-botoes-cabecalho');
mkdirSync(SAIDA, { recursive: true });

const original = readFileSync(PAGINA, 'utf8');
copyFileSync(PAGINA, path.join(SAIDA, 'TreinamentosPage.depois.backup.tsx'));

const ANTES = original
  .replace(
    /const ACAO_CABECALHO_CLASS =\s*\n\s*'h-11 w-auto shrink-0 gap-2 rounded-\[10px\] px-4 text-sm font-semibold shadow-sm transition-shadow hover:shadow-md sm:h-10';/,
    `const ACAO_CABECALHO_CLASS =\n  'h-[46px] gap-2 rounded-xl px-5 text-sm font-semibold shadow-sm transition-shadow hover:shadow-md';`,
  )
  .replace(
    /className=\{`\$\{ACAO_CABECALHO_CLASS\}\$\{\s*tab === 'catalogo'\s*\?\s*'[^']*'\s*:\s*''\s*\}`\}/s,
    'className="h-[46px] gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition-shadow hover:shadow-md"',
  )
  .replace(/justify-end gap-2\.5 xl:shrink-0/, 'justify-end gap-2 xl:shrink-0');

if (ANTES === original) {
  throw new Error('Substituição do estado "antes" não aplicou — abortando.');
}

const browser = await chromium.launch();

async function entrar() {
  const contexto = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await contexto.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto('http://localhost:8080/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/e-?mail/i).first().fill('admin@teste.local');
  await page.getByLabel(/senha|password/i).first().fill('Admin@2026!');
  await page.getByRole('button', { name: /entrar|login|acessar/i }).first().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
  await page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith('sb-')), undefined, {
    timeout: 15_000,
  });
  const state = await contexto.storageState();
  await contexto.close();
  return state;
}

function medir() {
  const botoes = Array.from(document.querySelectorAll('button')).filter((b) =>
    /^(Novo Treinamento|Novo Curso|Nova Trilha)$/.test((b.textContent ?? '').trim()),
  );
  return botoes.map((b) => {
    const r = b.getBoundingClientRect();
    const cs = getComputedStyle(b);
    const svg = b.querySelector('svg');
    const sr = svg?.getBoundingClientRect();
    return {
      texto: (b.textContent ?? '').trim(),
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fonte: cs.fontSize,
      peso: cs.fontWeight,
      padding: `${cs.paddingLeft} / ${cs.paddingRight}`,
      raio: cs.borderRadius,
      gap: cs.columnGap,
      icone: sr ? `${Math.round(sr.width)}x${Math.round(sr.height)}` : null,
      fundo: cs.backgroundColor,
      borda: cs.borderColor,
      cor: cs.color,
    };
  });
}

let state = await entrar();
const erros = [];

async function capturar(fase) {
  for (const [w, h] of [
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [1024, 768],
    [390, 844],
  ]) {
    const contexto = await browser.newContext({
      storageState: state,
      viewport: { width: w, height: h },
      deviceScaleFactor: 1,
    });
    const page = await contexto.newPage();
    page.on('pageerror', (err) => erros.push(`pageerror: ${err.message}`));
    await page.addInitScript(() => {
      localStorage.setItem('ui-theme', 'dark');
      localStorage.setItem('dp-tour-completed', 'true');
    });
    await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1800);

    const treinamentos = await page.evaluate(medir);
    await page.screenshot({ path: path.join(SAIDA, `${fase}-treinamentos-${w}x${h}.png`) });

    await page.getByRole('tab', { name: /Catálogo/i }).click();
    await page.waitForTimeout(900);
    const catalogo = await page.evaluate(medir);
    const overflowCatalogo = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      main: document.querySelector('main')
        ? document.querySelector('main').scrollWidth - document.querySelector('main').clientWidth
        : null,
    }));
    await page.screenshot({ path: path.join(SAIDA, `${fase}-catalogo-${w}x${h}.png`) });

    await page.getByRole('tab', { name: /Trilhas/i }).click();
    await page.waitForTimeout(900);
    const trilhas = await page.evaluate(medir);
    await page.screenshot({ path: path.join(SAIDA, `${fase}-trilhas-${w}x${h}.png`) });

    console.log(
      JSON.stringify({ fase, viewport: `${w}x${h}`, treinamentos, catalogo, trilhas, overflowCatalogo }),
    );

    state = await contexto.storageState();
    await contexto.close();
  }
}

writeFileSync(PAGINA, ANTES, 'utf8');
await new Promise((r) => setTimeout(r, 2500));
try {
  await capturar('antes');
} finally {
  writeFileSync(PAGINA, original, 'utf8');
  await new Promise((r) => setTimeout(r, 2500));
}

await capturar('depois');

console.log('ERROS', JSON.stringify([...new Set(erros)]));
await browser.close();
