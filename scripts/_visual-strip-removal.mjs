/**
 * TEMPORÁRIO — valida a remoção da faixa de cinco indicadores (Desempenho).
 * Uso: node scripts/_visual-strip-removal.mjs
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1600, height: 1000 },
});
const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
await page.locator('[role="tablist"]').first().waitFor({ timeout: 30000 });
await page.getByText('Feedbacks por Status').first().waitFor({ timeout: 15000 });
await page.waitForTimeout(1500);

const dados = await page.evaluate(() => {
  const round = (n) => Math.round(n);
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { top: round(r.top), bottom: round(r.bottom), height: round(r.height), left: round(r.left), right: round(r.right) };
  };
  // Card de alertas (faixa vermelha) — primeiro ancestral com fundo destructive.
  const alerta = [...document.querySelectorAll('div')].find((e) => /rounded-xl border border-destructive-vivid/.test(e.className));
  // Painéis analíticos (grade dos 3 cards).
  const analiticos = [...document.querySelectorAll('div')].find((e) => /xl:grid-cols-3/.test(e.className));
  // Chips removidos (existiam como border rounded-lg com esse texto).
  const chipsResiduais = [...document.querySelectorAll('span,p,div')]
    .filter(
      (e) =>
        !e.closest('[role="tablist"]') &&
        !e.closest('h1,h2,h3') &&
        ['Ciclos', 'Metas', 'Feedbacks', 'PDIs', 'Competências'].includes(e.textContent?.trim() ?? '')
    )
    .map((e) => ({ texto: e.textContent.trim(), cls: String(e.className).slice(0, 60) }));

  return {
    alerta: alerta ? box(alerta) : null,
    analiticos: analiticos ? box(analiticos) : null,
    gapAlertaAnaliticos: alerta && analiticos ? round(analiticos.getBoundingClientRect().top - alerta.getBoundingClientRect().bottom) : null,
    chipsResiduais,
  };
});

const fs = await import('node:fs');
fs.writeFileSync('desempenho-strip-removida.txt', JSON.stringify(dados, null, 2));
await page.screenshot({ path: 'desempenho-strip-removida.png', fullPage: true });
console.log(JSON.stringify(dados, null, 2));
await browser.close();
