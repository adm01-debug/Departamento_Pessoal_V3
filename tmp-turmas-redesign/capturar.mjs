/**
 * TEMPORÁRIO — screenshots e medições da aba Turmas / Instâncias.
 * Cada largura roda em um CONTEXTO próprio: o app usa fingerprint de sessão
 * (screen.width/height), então redimensionar a janela no mesmo contexto
 * dispararia `session_anomaly`.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-turmas-redesign');
mkdirSync(SAIDA, { recursive: true });
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));

const browser = await chromium.launch();
const erros = [];

async function abrir(w, h) {
  const contexto = await browser.newContext({
    storageState: state,
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
  });
  const page = await contexto.newPage();
  page.on('pageerror', (err) => erros.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') erros.push(msg.text());
  });
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor({ timeout: 30_000 });
  await page.getByRole('tab', { name: /Turmas \/ Instâncias/i }).click();
  await page.waitForTimeout(1800);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const main = document.querySelector('main');
    if (main) main.scrollTo(0, 0);
  });
  return { contexto, page };
}

function medir() {
  const cards = Array.from(document.querySelectorAll('[data-turma-card]'));
  const ret = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const grid = document.querySelector('[data-turmas-grid]');
  const agenda = document.querySelector('[data-turmas-agenda]');
  const cols = Array.from(document.querySelectorAll('[data-turmas-coluna]')).map((el) => ({
    nome: el.getAttribute('data-turmas-coluna'),
    ...ret(el),
  }));
  const main = document.querySelector('main');
  return {
    cards: cards.map((el) => ({ id: el.getAttribute('data-turma-card'), ...ret(el) })),
    colunas: cols,
    agenda: agenda ? ret(agenda) : null,
    gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    mainOverflow: main ? main.scrollWidth - main.clientWidth : null,
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
  const { contexto, page } = await abrir(w, h);
  const medidas = await page.evaluate(medir);
  console.log(JSON.stringify({ viewport: `${w}x${h}`, ...medidas }));
  await page.screenshot({ path: path.join(SAIDA, `turmas-${w}x${h}.png`) });
  await page.screenshot({
    path: path.join(SAIDA, `revisao-${w}x${h}.jpg`),
    type: 'jpeg',
    quality: 72,
  });
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo(0, main.scrollHeight);
    else window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SAIDA, `turmas-${w}x${h}-base.png`) });
  await page.screenshot({
    path: path.join(SAIDA, `revisao-${w}x${h}-base.jpg`),
    type: 'jpeg',
    quality: 72,
  });
  await contexto.close();
}

// Interações em 1440
{
  const { contexto, page } = await abrir(1440, 900);
  await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 0));
  const card = page.locator('[data-turma-card]').first();
  await card.hover();
  await page.waitForTimeout(300);
  await card.screenshot({ path: path.join(SAIDA, 'estado-hover-card-1440.png') });

  await page.getByRole('button', { name: /Ações da turma/i }).first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SAIDA, 'menu-contextual-1440.png') });
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: /^Ver turma/i }).first().click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(SAIDA, 'modal-turma-1440.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  await page.getByLabel('Status').click();
  await page.getByRole('option', { name: 'Planejado' }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(SAIDA, 'filtro-status-1440.png') });
  const filtro = await page.evaluate(() => ({
    cards: document.querySelectorAll('[data-turma-card]').length,
    contadores: Array.from(document.querySelectorAll('[data-turmas-coluna]')).map((c) =>
      (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90)
    ),
    limparClasse: document.querySelector('[aria-label="Limpar filtros"]')?.className,
  }));

  await page.getByRole('button', { name: /Limpar filtros/i }).first().click();
  await page.waitForTimeout(500);
  const depoisLimpar = await page.evaluate(() => ({
    cards: document.querySelectorAll('[data-turma-card]').length,
    limparClasse: document.querySelector('[aria-label="Limpar filtros"]')?.className,
  }));

  await page.getByLabel('Buscar turmas').fill('Integração');
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 250));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SAIDA, 'estado-colunas-vazias-1440.png') });
  await page.getByRole('button', { name: /Limpar filtros/i }).first().click();
  await page.waitForTimeout(600);

  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo(0, main.scrollHeight);
  });
  await page.waitForTimeout(500);
  const rangeAntes = await page.locator('[data-agenda-range]').first().textContent();
  await page.screenshot({ path: path.join(SAIDA, 'agenda-semana-1440.png') });
  await page.getByRole('button', { name: 'Próxima semana' }).click();
  await page.waitForTimeout(400);
  const rangeDepois = await page.locator('[data-agenda-range]').first().textContent();
  await page.screenshot({ path: path.join(SAIDA, 'agenda-semana-vazia-1440.png') });
  await page.getByRole('button', { name: 'Semana anterior' }).click();
  await page.waitForTimeout(300);

  console.log(JSON.stringify({ interacoes: { filtro, depoisLimpar, rangeAntes, rangeDepois } }));
  await contexto.close();
}

// Mobile: cards e agenda fora da primeira dobra
{
  const { contexto, page } = await abrir(390, 844);
  await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 680));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SAIDA, 'turmas-390x844-cards.png') });
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo(0, main.scrollHeight);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SAIDA, 'turmas-390x844-agenda.png') });
  await contexto.close();
}

console.log('ERROS', JSON.stringify([...new Set(erros)]));
await browser.close();
