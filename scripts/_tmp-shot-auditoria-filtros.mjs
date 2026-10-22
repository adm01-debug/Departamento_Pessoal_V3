/**
 * TEMPORÁRIO — screenshots e medições da barra de filtros da Auditoria.
 * Contexto próprio por largura (o fingerprint de sessão inclui screen.width).
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const SAIDA = 'tmp-auditoria-filtros';
mkdirSync(SAIDA, { recursive: true });

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

const falhas = [];
let state = await entrar();

for (const [w, h, nome] of [
  [1920, 1080, 'filtros-1920'],
  [1600, 900, 'filtros-1600'],
  [1440, 900, 'filtros-1440'],
  [1366, 768, 'filtros-1366'],
  [1280, 800, 'filtros-1280'],
  [1024, 768, 'filtros-1024'],
  [390, 844, 'filtros-390'],
]) {
  const contexto = await browser.newContext({ storageState: state, viewport: { width: w, height: h } });
  const page = await contexto.newPage();
  page.on('pageerror', (e) => falhas.push(`${nome}: ${e.message}`));
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });

  await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
  await page.getByRole('tab', { name: /^Auditoria$/ }).click();
  await page.waitForTimeout(1600);

  const dados = await page.evaluate(() => {
    const secao = document.querySelector('section[aria-label="Filtros da auditoria"]');
    if (!secao) return { erro: 'seção não encontrada' };
    const r = secao.getBoundingClientRect();
    const linhas = Array.from(secao.querySelectorAll(':scope > div')).map((el) => {
      const b = el.getBoundingClientRect();
      return { top: Math.round(b.top), height: Math.round(b.height), width: Math.round(b.width) };
    });
    const segunda = secao.querySelector(':scope > div:nth-child(2)');
    const filhos = segunda
      ? Array.from(segunda.children).map((el) => {
          const b = el.getBoundingClientRect();
          return { top: Math.round(b.top), bottom: Math.round(b.bottom), right: Math.round(b.right) };
        })
      : [];
    return {
      secao: { w: Math.round(r.width), h: Math.round(r.height) },
      linhas,
      segundaFilhos: filhos,
      doc: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth },
    };
  });

  console.log(nome, JSON.stringify(dados));
  const secao = page.locator('section[aria-label="Filtros da auditoria"]');
  await secao.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SAIDA}/${nome}.png` });

  state = await contexto.storageState();
  await contexto.close();
}

console.log('FALHAS', JSON.stringify([...new Set(falhas)]));
await browser.close();
