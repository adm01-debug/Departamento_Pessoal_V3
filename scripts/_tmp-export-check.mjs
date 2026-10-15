import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1600, height: 1000 },
  acceptDownloads: true,
});
const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/avaliacao', { waitUntil: 'domcontentloaded' });
await page.locator('[role="tablist"]').first().waitFor({ timeout: 25000 });
await page.getByRole('tab', { name: /Auditoria/i }).first().click();
await page.waitForTimeout(1800);

const exportar = page.getByRole('button', { name: /Exportar/i });
const maisFiltros = page.getByRole('button', { name: /Mais filtros/i });

const be = await exportar.boundingBox();
const bm = await maisFiltros.boundingBox();

const barra = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /Exportar/.test(x.textContent || ''));
  const r = b.closest('div').getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
});

const estilos = async () =>
  exportar.evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, border: s.borderColor, color: s.color, shadow: s.boxShadow };
  });

const normal = await estilos();
await page.screenshot({ path: 'tmp-export-normal.jpg', type: 'jpeg', quality: 82, clip: barra });

await exportar.hover();
await page.waitForTimeout(450);
const hover = await estilos();
await page.screenshot({ path: 'tmp-export-hover.jpg', type: 'jpeg', quality: 82, clip: barra });

const toast = page
  .getByText(/Trilha exportada/i)
  .waitFor({ timeout: 6000 })
  .then(() => 'toast')
  .catch(() => null);
const download = page
  .waitForEvent('download', { timeout: 6000 })
  .then((d) => `download:${d.suggestedFilename()}`)
  .catch(() => null);
await exportar.click();
const resultado = await Promise.race([toast, download]);

console.log(
  JSON.stringify(
    {
      altura_exportar: be && Math.round(be.height),
      altura_maisFiltros: bm && Math.round(bm.height),
      centroY_exportar: be && Math.round(be.y + be.height / 2),
      centroY_maisFiltros: bm && Math.round(bm.y + bm.height / 2),
      normal,
      hover,
      resultado,
      barra,
    },
    null,
    2
  )
);
await browser.close();
