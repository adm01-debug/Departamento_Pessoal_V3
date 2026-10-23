import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
for (const w of [390, 768, 1024]) {
  const context = await browser.newContext({ storageState: state, viewport: { width: w, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Treinamentos' }).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const lista = document.querySelector('[data-treinamentos-tablist]');
    const fora = [...document.querySelectorAll('body *')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          cls: String(el.className).slice(0, 110),
          texto: (el.textContent ?? '').trim().slice(0, 45),
          x: Math.round(r.x),
          right: Math.round(r.right),
          w: Math.round(r.width),
          pos: getComputedStyle(el).position,
          overflowX: getComputedStyle(el).overflowX,
        };
      })
      .filter((e) => e.w > 0 && (e.right > vw + 2 || e.x < -2))
      .slice(0, 18);
    return {
      vw,
      doc: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      lista: lista
        ? { left: lista.getBoundingClientRect().left, right: lista.getBoundingClientRect().right, scrollW: lista.scrollWidth, clientW: lista.clientWidth }
        : null,
      fora,
    };
  });
  console.log('W', w, JSON.stringify(info, null, 0));
  await context.close();
}
await browser.close();
