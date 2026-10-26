/**
 * TEMPORÁRIO — checagem dos 3 ajustes em 390px (responsividade).
 */
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 390, height: 900 } });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const p = await c.newPage();
await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1600);
await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
await p.waitForTimeout(1600);
const out = await p.evaluate(() => {
  const r = (el) => el.getBoundingClientRect();
  const tablist = document.querySelector('[role="tablist"]');
  const group = document.querySelector('[aria-label="Filtrar vagas por status"]');
  const toolbar = group.parentElement;
  const grid = document.querySelector('[data-vagas-grid]');
  const cards = [...document.querySelectorAll('[data-vaga-card]')];
  const card = cards[0];
  const el = document.querySelector('[aria-label="Filtrar vagas por status"] > div > button');
  return {
    overflowDoc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    gapTablistFiltros: Math.round(r(toolbar).top - r(tablist).bottom),
    gapFiltrosCards: Math.round(r(grid).top - r(toolbar).bottom),
    grupoH: Math.round(r(group).height),
    chipsLinhas: new Set([...group.querySelectorAll('button')].map((x) => Math.round(r(x).top))).size,
    cards: cards.length,
    fundos: [...new Set(cards.map((x) => getComputedStyle(x).backgroundColor))],
    gradientes: [...new Set(cards.map((x) => getComputedStyle(x).backgroundImage))],
    bordas: [...new Set(cards.map((x) => getComputedStyle(x).borderTopColor))],
    alturaPill: el ? Math.round(r(el).height) : null,
    botaoShadow: getComputedStyle(document.querySelector('button[class*="rounded-xl"][class*="px-4"]')).boxShadow,
  };
});
await p.screenshot({ path: 'tmp-turmas-fidelidade/vagas-neutro-390.png', fullPage: false });
console.log(JSON.stringify(out, null, 2));
await b.close();
