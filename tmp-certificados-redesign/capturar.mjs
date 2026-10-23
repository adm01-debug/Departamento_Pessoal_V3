/** TEMPORÁRIO — captura e medições da aba Certificados. */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-certificados-redesign');
mkdirSync(SAIDA, { recursive: true });
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const erros = [];

async function abrir(browser, w, h, opcoes = {}) {
  const contexto = await browser.newContext({
    storageState: state,
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    ...opcoes,
  });
  const page = await contexto.newPage();
  page.on('pageerror', (err) => erros.push(`pageerror: ${err.message}`));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor({ timeout: 30_000 });
  await page.getByRole('tab', { name: /^Certificados$/ }).click();
  await page.waitForTimeout(2400);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelector('main')?.scrollTo(0, 0);
  });
  return { contexto, page };
}

function medir() {
  const cards = Array.from(document.querySelectorAll('[data-certificado-card]'));
  const ret = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const grid = document.querySelector('[data-certificados-grid]');
  const main = document.querySelector('main');
  const filtros = Array.from(
    document.querySelectorAll(
      'input[aria-label="Buscar certificados"], [aria-label="Situação"], [aria-label="Categoria"], [aria-label="Período de emissão"], [aria-label="Ordenar por"], [aria-label="Limpar filtros"]'
    )
  );
  return {
    cards: cards.map((c) => ({
      id: c.getAttribute('data-certificado-card'),
      ...ret(c),
      cortado: c.scrollWidth > c.clientWidth + 1,
    })),
    gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
    filtros: filtros.map((f) => ({ label: f.getAttribute('aria-label'), ...ret(f) })),
    filtrosMesmaLinha: new Set(filtros.map((f) => Math.round(f.getBoundingClientRect().y))).size === 1,
    overflowMain: main ? main.scrollWidth - main.clientWidth : null,
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    badges: Array.from(document.querySelectorAll('[data-situacao]')).map((b) => ({
      situacao: b.getAttribute('data-situacao'),
      ativa: b.getAttribute('aria-pressed'),
      texto: (b.textContent || '').replace(/\s+/g, ' ').trim(),
    })),
    paginacao: (document.body.textContent || '').includes('Mostrando') || (document.body.textContent || '').includes('certificados'),
  };
}

for (const [w, h] of [
  [1920, 1080],
  [1600, 900],
  [1440, 900],
  [1366, 768],
  [1280, 800],
  [1024, 768],
  [768, 1024],
  [390, 844],
]) {
  const browser = await chromium.launch();
  const { contexto, page } = await abrir(browser, w, h);
  console.log(JSON.stringify({ viewport: `${w}x${h}`, ...(await page.evaluate(medir)) }));
  await page.screenshot({ path: path.join(SAIDA, `certificados-${w}x${h}.png`) });
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo(0, main.scrollHeight);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SAIDA, `certificados-${w}x${h}-base.png`) });
  await contexto.close();
  await browser.close();
}

console.log('ERROS', JSON.stringify([...new Set(erros)]));

