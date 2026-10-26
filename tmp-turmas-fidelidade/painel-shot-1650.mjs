/**
 * TEMPORÁRIO — screenshot na resolução da imagem fornecida (1650 × 764).
 */
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1650, height: 764 } });
await c.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const p = await c.newPage();
await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1600);
await p.getByRole('tab', { name: 'Vagas', exact: true }).click();
await p.waitForTimeout(1800);
await p.screenshot({ path: 'tmp-turmas-fidelidade/painel-vagas-1650.png' });
const med = await p.evaluate(() => {
  const r = (el) => el.getBoundingClientRect();
  const grupo = document.querySelector('[aria-label="Filtrar vagas por status"]');
  const painel = grupo.closest('.rounded-xl');
  const tablist = document.querySelector('[role="tablist"]');
  const grid = document.querySelector('[data-vagas-grid]');
  const chips = [...grupo.querySelectorAll('button')];
  const selects = ['Departamento', 'Modalidade', 'Status', 'Ordenar por'].map((n) => document.querySelector(`[aria-label="${n}"]`));
  const cy = (el) => Math.round(r(el).top + r(el).height / 2);
  return {
    gapTablistPainel: Math.round(r(painel).top - r(tablist).bottom),
    gapPainelGrid: Math.round(r(grid).top - r(painel).bottom),
    painelH: Math.round(r(painel).height),
    chips: chips.map(cy),
    selects: selects.map((el) => cy(el.closest('.rounded-lg'))),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});
console.log(JSON.stringify(med));
await b.close();
