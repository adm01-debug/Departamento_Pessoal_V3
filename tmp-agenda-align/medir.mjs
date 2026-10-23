/** TEMPORÁRIO — mede o alinhamento vertical da Agenda da semana. */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-agenda-align');
mkdirSync(SAIDA, { recursive: true });
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));

const VIEWPORTS = [
  [1920, 1080],
  [1600, 900],
  [1440, 900],
  [1366, 768],
  [1280, 800],
  [1024, 768],
  [390, 844],
];

const browser = await chromium.launch();
const resultados = [];

for (const [w, h] of VIEWPORTS) {
  const contexto = await browser.newContext({ storageState: state, viewport: { width: w, height: h } });
  const page = await contexto.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor({ timeout: 30_000 });
  await page.getByRole('tab', { name: /Turmas \/ Instâncias/ }).click();
  await page.waitForTimeout(2200);

  const dados = await page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1), w: +b.width.toFixed(1) };
    };
    const grid = document.querySelector('[data-turmas-grid]');
    const agenda = document.querySelector('[data-turmas-agenda]');
    const wrapper = agenda?.parentElement ?? null;
    const colunas = [...document.querySelectorAll('[data-turmas-coluna]')].map((col) => {
      const cards = [...col.querySelectorAll('[data-turma-card]')];
      const ultimo = cards[cards.length - 1] ?? null;
      return {
        chave: col.getAttribute('data-turmas-coluna'),
        rect: r(col),
        cards: cards.length,
        ultimoCardBottom: ultimo ? +ultimo.getBoundingClientRect().bottom.toFixed(1) : null,
      };
    });
    const cardsVisiveis = [...document.querySelectorAll('[data-turma-card]')];
    const baseMaisBaixa = cardsVisiveis.reduce((max, el) => Math.max(max, el.getBoundingClientRect().bottom), 0);
    return {
      grid: r(grid),
      gridAlignItems: grid ? getComputedStyle(grid).alignItems : null,
      colunas,
      agendaWrapper: r(wrapper),
      agendaWrapperDisplay: wrapper ? getComputedStyle(wrapper).display : null,
      agenda: r(agenda),
      agendaDisplay: agenda ? getComputedStyle(agenda).display : null,
      agendaFlex: agenda ? getComputedStyle(agenda).flex : null,
      agendaUl: r(document.querySelector('[data-turmas-agenda] ul')),
      ultimoDia: r(document.querySelector('[data-turmas-agenda] ul li:last-child')),
      cardsVisiveis: cardsVisiveis.length,
      baseMaisBaixa: +baseMaisBaixa.toFixed(1),
      diferenca: agenda ? +(baseMaisBaixa - agenda.getBoundingClientRect().bottom).toFixed(1) : null,
      overflowDoc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  resultados.push({ viewport: `${w}x${h}`, ...dados });
  await page.screenshot({ path: path.join(SAIDA, `turmas-${w}x${h}.png`) });
  await page.locator('[data-turmas-grid]').screenshot({ path: path.join(SAIDA, `grid-${w}x${h}.png`) });
  await contexto.close();
}

console.log(JSON.stringify(resultados, null, 2));
await browser.close();
