import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
const resultados = [];

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
]) {
  const context = await browser.newContext({ storageState: state, viewport });
  const page = await context.newPage();
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Treinamentos' }).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1200);

  await page.getByRole('tab', { name: 'Certificados' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Visualizar certificado/ }).first().click();
  await page.waitForTimeout(2400);
  const dados = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return null;
    const r = d.getBoundingClientRect();
    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return {
      caixa: { x: Math.round(r.x), y: Math.round(r.y), largura: Math.round(r.width), altura: Math.round(r.height) },
      dentro: r.x >= 0 && r.y >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5,
      overflow,
      rodapeVisivel: [...d.querySelectorAll('button')].some((b) => b.textContent?.includes('Fechar')),
    };
  });
  if (viewport.width === 390) {
    await page.screenshot({ path: 'tmp-animacao-modais/certificado-390.png' });
  }
  resultados.push({ viewport, ...dados });
  await context.close();
}

console.log(JSON.stringify(resultados, null, 2));
await browser.close();
