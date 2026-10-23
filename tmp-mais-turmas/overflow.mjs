/**
 * TEMPORÁRIO — docOverflow é pré-existente? Mede sem a aba de turmas.
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));

for (const [w, h] of [
  [1024, 768],
  [768, 1024],
  [390, 844],
]) {
  const browser = await chromium.launch();
  const contexto = await browser.newContext({ storageState: state, viewport: { width: w, height: h } });
  const page = await contexto.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });
  await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  const semTurmas = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    main: (() => {
      const main = document.querySelector('main');
      return main ? main.scrollWidth - main.clientWidth : null;
    })(),
  }));
  await page.getByRole('tab', { name: /Turmas \/ Instâncias/i }).click();
  await page.waitForTimeout(1800);
  const comTurmas = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    main: (() => {
      const main = document.querySelector('main');
      return main ? main.scrollWidth - main.clientWidth : null;
    })(),
  }));
  console.log(JSON.stringify({ viewport: `${w}x${h}`, semTurmas, comTurmas }));
  await contexto.close();
  await browser.close();
}
