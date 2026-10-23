import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
for (const [width, height] of [[1920, 1080], [1600, 900], [1366, 768], [1280, 800], [1024, 768], [768, 1024], [390, 844]]) {
  const context = await browser.newContext({ storageState: state, viewport: { width, height } });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('ui-theme', 'dark'));
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Inscrições' }).waitFor({ timeout: 30_000 });
  await page.getByRole('tab', { name: 'Inscrições' }).click();
  await page.waitForTimeout(1200);
  const dados = await page.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    const botao = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Nova Inscrição'));
    const tablist = document.querySelector('[data-treinamentos-tablist]');
    const filtros = document.querySelector('[aria-label="Buscar inscrições por colaborador ou curso"]');
    return {
      botao: r(botao),
      filtrosY: Math.round(filtros.getBoundingClientRect().top),
      gap: Math.round(filtros.getBoundingClientRect().top - tablist.getBoundingClientRect().bottom),
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      mainOverflow: document.querySelector('main').scrollWidth - document.querySelector('main').clientWidth,
    };
  });
  console.log(JSON.stringify({ viewport: `${width}x${height}`, ...dados }));
  await context.close();
}
await browser.close();
