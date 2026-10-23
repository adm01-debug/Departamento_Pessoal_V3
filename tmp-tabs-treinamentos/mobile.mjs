import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: state, viewport: { width: 390, height: 844 } });
const page = await context.newPage();
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: 'Treinamentos' }).waitFor({ timeout: 30_000 });
await page.waitForTimeout(2500);
await page.evaluate(() => document.querySelector('[data-treinamentos-tablist]')?.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(300);
await page.screenshot({ path: 'tmp-tabs-treinamentos/mobile-390-inicio.png' });

const antes = await page.evaluate(() => {
  const l = document.querySelector('[data-treinamentos-tablist]');
  const abas = [...l.querySelectorAll('[role=tab]')];
  return {
    linhas: [...new Set(abas.map((a) => Math.round(a.getBoundingClientRect().y)))].length,
    altura: +l.getBoundingClientRect().height.toFixed(2),
    left: +l.getBoundingClientRect().left.toFixed(2),
    right: +l.getBoundingClientRect().right.toFixed(2),
    overflow: l.scrollWidth - l.clientWidth,
  };
});

await page.getByRole('tab', { name: 'Certificados' }).click();
await page.waitForTimeout(700);
const depois = await page.evaluate(() => {
  const l = document.querySelector('[data-treinamentos-tablist]');
  const a = [...document.querySelectorAll('[role=tab]')].find((t) => t.getAttribute('aria-selected') === 'true');
  const i = document.querySelector('[data-aba-indicador]');
  const r = (e) => ({ x: +e.getBoundingClientRect().x.toFixed(2), w: +e.getBoundingClientRect().width.toFixed(2) });
  return {
    ativa: a.textContent.trim(),
    linhas: [...new Set([...l.querySelectorAll('[role=tab]')].map((t) => Math.round(t.getBoundingClientRect().y)))].length,
    lista: r(l),
    aba: r(a),
    indicador: i ? r(i) : null,
    deltaX: i ? +(i.getBoundingClientRect().x - a.getBoundingClientRect().x).toFixed(2) : null,
    deltaW: i ? +(i.getBoundingClientRect().width - a.getBoundingClientRect().width).toFixed(2) : null,
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});
await page.screenshot({ path: 'tmp-tabs-treinamentos/mobile-390-certificados.png' });

await page.getByRole('tab', { name: 'Treinamentos' }).focus();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(600);
const teclado = await page.evaluate(() => {
  const a = [...document.querySelectorAll('[role=tab]')].find((t) => t.getAttribute('aria-selected') === 'true');
  return { ativa: a.textContent.trim() };
});

console.log(JSON.stringify({ antes, depois, teclado }));
await context.close();
await browser.close();
