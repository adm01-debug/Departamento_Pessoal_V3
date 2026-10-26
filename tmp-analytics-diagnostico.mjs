import { chromium } from '@playwright/test';
import fs from 'node:fs';

/** Diagnóstico de overflow horizontal + capturas das faixas inferiores. */
const OUT = 'tmp-analytics-validacao';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: 'Analytics' }).waitFor({ timeout: 40000 });
await page.waitForTimeout(1500);
await page.getByRole('tab', { name: 'Analytics' }).click();
await page.locator('[data-analytics-recrutamento]').waitFor({ state: 'visible' });
await page.waitForTimeout(1600);

const overflow = {};
for (const tamanho of [
  { nome: '768', width: 768, height: 1024 },
  { nome: '390', width: 390, height: 844 },
]) {
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.waitForTimeout(600);
  overflow[`analytics-${tamanho.nome}`] = await page.evaluate(() => {
    const vw = window.innerWidth;
    const lista = [...document.querySelectorAll('*')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 90),
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
          texto: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
        };
      })
      .filter((item) => item.right > vw + 1 && item.width > 0)
      .sort((a, b) => b.right - a.right)
      .slice(0, 12);
    return { vw, docScrollWidth: document.documentElement.scrollWidth, mainScrollWidth: document.querySelector('main')?.scrollWidth, lista };
  });
}

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
// Capturas por rolagem do <main> (o app rola dentro dele, não no documento).
for (let i = 0; i < 4; i += 1) {
  await page.evaluate((offset) => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = offset;
  }, i * 760);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/analytics-390-parte-${i + 1}.png` });
}

await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(600);
for (let i = 0; i < 3; i += 1) {
  await page.evaluate((offset) => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = offset;
  }, i * 380 + 360);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/analytics-1440-rolagem-${i + 1}.png` });
}

const metricasFinais = await page.evaluate(() => {
  const root = document.querySelector('[data-analytics-recrutamento]');
  const paineis = [...root.querySelectorAll('[data-analytics-painel]')].map((el) => {
    const r = el.getBoundingClientRect();
    return { titulo: el.getAttribute('data-analytics-painel'), top: Math.round(r.top), height: Math.round(r.height), width: Math.round(r.width) };
  });
  return { paineis, rolagemHorizontal: document.documentElement.scrollWidth > window.innerWidth };
});

fs.writeFileSync(`${OUT}/diagnostico.json`, JSON.stringify({ overflow, metricasFinais }, null, 2));
console.log(JSON.stringify({ overflow, metricasFinais }, null, 2));
await browser.close();
