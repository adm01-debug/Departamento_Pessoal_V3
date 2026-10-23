import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
for (const [w, h] of [[1024, 768], [768, 1024], [390, 844]]) {
  const context = await browser.newContext({ storageState: state, viewport: { width: w, height: h } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Inscrições' }).waitFor({ timeout: 30_000 });
  await page.getByRole('tab', { name: 'Inscrições' }).click();
  await page.waitForTimeout(2300);
  await page.evaluate(() => {
    const filtros = document.querySelector('[aria-label="Buscar inscrições por colaborador ou curso"]');
    filtros?.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(400);
  const dados = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-inscricao-card]')];
    const filtros = [...document.querySelectorAll('[aria-label="Status"],[aria-label="Curso"],[aria-label="Departamento"],[aria-label="Período"],[aria-label="Limpar filtros"],[aria-label="Buscar inscrições por colaborador ou curso"]')];
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    return {
      cards: cards.length,
      colunas: new Set(cards.map((c) => Math.round(c.getBoundingClientRect().x))).size,
      card: r(cards[0]),
      filtrosY: [...new Set(filtros.map((f) => Math.round(f.getBoundingClientRect().y)))],
      filtros: filtros.map((f) => ({ label: f.getAttribute('aria-label'), ...r(f) })),
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      mainOverflow: document.querySelector('main').scrollWidth - document.querySelector('main').clientWidth,
      cardOverflow: cards[0] ? cards[0].scrollWidth - cards[0].clientWidth : null,
    };
  });
  console.log(JSON.stringify({ viewport: `${w}x${h}`, ...dados }));
  await page.screenshot({ path: `tmp-inscricoes-redesign/inscricoes-mobile-${w}x${h}.png` });
  await context.close();
}
await browser.close();
