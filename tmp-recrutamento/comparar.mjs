import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PASTA = resolve('tmp-recrutamento/padrao-admissao');
mkdirSync(PASTA, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1600, height: 900 },
});
await context.addInitScript(() => {
  localStorage.setItem('dp-tour-completed', 'true');
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-force-motion', 'off');
});
const page = await context.newPage();

async function abrir(url) {
  await page.goto(`http://localhost:8080${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
}

await abrir('/admissoes');
try {
  await page.getByRole('tab', { name: 'Kanban' }).click({ timeout: 8000 });
} catch {
  console.log('sem aba kanban');
}
await page.waitForTimeout(3500);
const boardAdmissao = page.locator('.kanban-lane-slot').first().locator('..');
await boardAdmissao.screenshot({ path: `${PASTA}/admissao-board.jpg`, type: 'jpeg', quality: 55 });
await page.screenshot({ path: `${PASTA}/admissao-pagina.jpg`, type: 'jpeg', quality: 55 });

await abrir('/recrutamento');
await page.locator('[data-pipeline-board]').screenshot({
  path: `${PASTA}/recrutamento-board.jpg`,
  type: 'jpeg',
  quality: 55,
});
await page.screenshot({ path: `${PASTA}/recrutamento-pagina.jpg`, type: 'jpeg', quality: 55 });

// Comparativo lado a lado (mesmo viewport, mesma escala de imagem).
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#0b1220;color:#e5e7eb;font:600 18px/1.3 system-ui,sans-serif;padding:16px;display:flex;gap:16px}
  figure{margin:0;flex:1;min-width:0}
  figcaption{padding:6px 2px 10px;letter-spacing:.02em}
  img{display:block;width:100%;border:1px solid #22304a;border-radius:10px}
</style></head><body>
  <figure><figcaption>ADMISSÃO — referência (1600×900)</figcaption><img src="admissao-board.jpg"></figure>
  <figure><figcaption>RECRUTAMENTO — padronizado (1600×900)</figcaption><img src="recrutamento-board.jpg"></figure>
</body></html>`;
writeFileSync(`${PASTA}/comparativo.html`, html);

const comparador = await context.newPage();
await comparador.setViewportSize({ width: 2400, height: 760 });
await comparador.goto(`file:///${PASTA.replace(/\\/g, '/')}/comparativo.html`);
await comparador.waitForTimeout(800);
await comparador.screenshot({ path: `${PASTA}/comparativo-1600.png` });

await browser.close();
console.log('COMPARATIVO OK');
