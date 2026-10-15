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

const novoCiclo = page.getByRole('button', { name: /Novo Ciclo/i }).first();
const exportar = page.getByRole('button', { name: /Exportar/i }).first();

const estilos = async (btn) =>
  btn.evaluate((el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      bgImage: s.backgroundImage,
      bgColor: s.backgroundColor,
      color: s.color,
      borderWidth: s.borderTopWidth,
      borderColor: s.borderTopColor,
      borderStyle: s.borderTopStyle,
      radius: s.borderTopLeftRadius,
      shadow: s.boxShadow,
      transition: s.transitionProperty + ' ' + s.transitionDuration,
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  });

const normalCiclo = await estilos(novoCiclo);
const normalExport = await estilos(exportar);

await novoCiclo.hover();
await page.waitForTimeout(300);
const hoverCiclo = await estilos(novoCiclo);

await exportar.hover();
await page.waitForTimeout(300);
const hoverExport = await estilos(exportar);

// Crop cobrindo os dois botões (header Novo Ciclo + barra Exportar).
const clipCiclo = await novoCiclo.boundingBox();
const clipExport = await exportar.boundingBox();
await page.mouse.move(0, 0);
await page.waitForTimeout(250);
await page.screenshot({
  path: 'tmp-paridade-novociclo.jpg',
  type: 'jpeg',
  quality: 90,
  clip: { x: clipCiclo.x - 12, y: clipCiclo.y - 12, width: clipCiclo.width + 24, height: clipCiclo.height + 24 },
});
await page.screenshot({
  path: 'tmp-paridade-exportar.jpg',
  type: 'jpeg',
  quality: 90,
  clip: { x: clipExport.x - 12, y: clipExport.y - 12, width: clipExport.width + 24, height: clipExport.height + 24 },
});

// Funcionalidade de exportação permanece?
const download = page.waitForEvent('download', { timeout: 6000 }).then((d) => `download:${d.suggestedFilename()}`).catch(() => null);
await exportar.click();
const resultado = await download;

console.log(
  JSON.stringify(
    { normalCiclo, normalExport, hoverCiclo, hoverExport, resultado },
    null,
    2
  )
);
await browser.close();
