import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: state, viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
await page.addInitScript(() => localStorage.setItem('ui-theme', 'dark'));
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: 'Inscrições' }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: 'Inscrições' }).click();
await page.waitForTimeout(2200);
await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('main')?.scrollTo(0, 0); });
const med = await page.evaluate(() => {
  const r = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  const filtros = [...document.querySelectorAll('[aria-label="Status"],[aria-label="Curso"],[aria-label="Departamento"],[aria-label="Período"],[aria-label="Limpar filtros"],[aria-label="Buscar inscrições por colaborador ou curso"]')];
  return {
    filtros: filtros.map((e) => ({ label: e.getAttribute('aria-label'), ...r(e) })),
    linhasY: [...new Set(filtros.map((e) => Math.round(e.getBoundingClientRect().y)))],
    tabela: r(document.querySelector('[role="table"][aria-label="Inscrições"]')),
    badges: [...document.querySelectorAll('[data-segmento]')].map(r),
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});
console.log(JSON.stringify(med, null, 2));
await page.screenshot({ path: 'tmp-inscricoes-redesign/inscricoes-1280-final.png' });
await context.close();
await browser.close();

