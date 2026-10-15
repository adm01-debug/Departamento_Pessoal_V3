/**
 * TEMPORÁRIO — captura a aba Auditoria da Gestão de Desempenho para conferência
 * visual contra a referência.
 * Uso: node scripts/_visual-auditoria.mjs <out.png> [width]
 */
import { chromium } from '@playwright/test';

const OUT = process.argv[2] ?? 'tmp-auditoria.png';
const WIDTH = Number(process.argv[3] ?? 1600);

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: WIDTH, height: 1000 },
});
const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
await page.locator('[role="tablist"]').first().waitFor({ timeout: 25000 });
await page.waitForTimeout(1500);

await page.getByRole('tab', { name: /Auditoria/i }).first().click();
await page.waitForTimeout(2000);

const resumo = await page.evaluate(() => {
  const txt = (sel) => Array.from(document.querySelectorAll(sel)).map((e) => (e.textContent ?? '').trim());
  const chips = Array.from(document.querySelectorAll('button[aria-pressed]'))
    .map((b) => (b.textContent ?? '').trim())
    .filter((t) => /Todos|Ciclos|Metas|Feedbacks|PDI|Nine-Box/.test(t));
  return {
    temFiltros: txt('input').some((t) => t.includes('') ) && !!document.querySelector('input[placeholder*="Buscar evento"]'),
    chips: chips.slice(0, 8),
    grupos: Array.from(document.querySelectorAll('button[aria-expanded]')).map((b) => (b.textContent ?? '').trim().slice(0, 60)),
    eventos: txt('p.font-semibold').slice(0, 8),
    detalhes: Array.from(document.querySelectorAll('button')).filter((b) => (b.textContent ?? '').includes('Ver detalhes')).length,
  };
});
console.log(JSON.stringify(resumo, null, 2));

await page.screenshot({ path: OUT, fullPage: true });
console.log('screenshot:', OUT);
await browser.close();
