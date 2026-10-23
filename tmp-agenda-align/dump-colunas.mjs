import { chromium } from '@playwright/test';

/**
 * Dump das caixas internas das colunas de Turmas (cabeçalho, lista, cards).
 * Uso: node tmp-agenda-align/dump-colunas.mjs
 */
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
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.getByRole('tab', { name: 'Turmas' }).click();
await page.waitForTimeout(2500);

const resultado = await page.evaluate(() => {
  const info = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      tag: el.tagName,
      cls: String(el.className).slice(0, 60),
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      h: Math.round(r.height),
      mt: s.marginTop,
      mb: s.marginBottom,
      pt: s.paddingTop,
      pb: s.paddingBottom,
      flex: s.flex,
      minH: s.minHeight,
    };
  };

  return [...document.querySelectorAll('[data-turmas-coluna]')].map((col) => ({
    chave: col.getAttribute('data-turmas-coluna'),
    coluna: info(col),
    filhos: [...col.children].map((filho) => ({
      ...info(filho),
      netos: [...filho.children].map(info),
    })),
  }));
});

console.log(JSON.stringify(resultado, null, 2));
await browser.close();
