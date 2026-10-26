import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'on');
});
const page = await context.newPage();
await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
const combo = page.locator('[data-pipeline-toolbar] [role="combobox"]');
await combo.click();
await page.getByRole('option', { name: 'Analista de Dados' }).click();
await page.waitForTimeout(300);
const m = await page.evaluate(() => {
  const rect = (el) => el.getBoundingClientRect();
  const cols = [...document.querySelectorAll('[data-pipeline-coluna]')];
  const footers = [...document.querySelectorAll('[data-pipeline-rodape]')];
  return {
    alturas: cols.map((c) => Math.round(rect(c).height)),
    topos: cols.map((c) => Math.round(rect(c).top)),
    rodapes: footers.map((f) => Math.round(rect(f).bottom)),
    vazias: cols.filter((c) => !c.querySelector('[data-candidato-card]')).map((c) => c.getAttribute('data-pipeline-coluna')),
  };
});
console.log('FILTRO_300MS', JSON.stringify(m));
const uniforme = Math.max(...m.alturas) - Math.min(...m.alturas) <= 1;
const rodapes = Math.max(...m.rodapes) - Math.min(...m.rodapes) <= 1;
console.log('UNIFORME', uniforme, 'RODAPES', rodapes);
await page.screenshot({ path: 'tmp-recrutamento/filtro-final.png' });

await combo.click();
await page.getByRole('option', { name: 'Todas as Vagas' }).click();
await page.waitForTimeout(600);
await page.locator('[data-pipeline-board]').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: 'tmp-recrutamento/pipeline-completo.png' });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.locator('[data-pipeline-board]').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: 'tmp-recrutamento/pipeline-mobile.png' });

await browser.close();
