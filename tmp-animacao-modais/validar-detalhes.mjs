import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: 'Treinamentos' }).waitFor({ timeout: 30_000 });
await page.waitForTimeout(1200);

const resultados = [];
async function testar(aba, botao, slug, esperaSaida = 1600) {
  await page.getByRole('tab', { name: aba }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: botao }).first().click();
  await page.waitForTimeout(80);
  const entrada = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return d ? { transform: getComputedStyle(d).transform, opacidade: getComputedStyle(d).opacity } : null;
  });
  await page.waitForTimeout(1700);
  const final = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return d ? { transform: getComputedStyle(d).transform, botoes: d.querySelectorAll('button').length } : null;
  });
  await page.screenshot({ path: `tmp-animacao-modais/${slug}.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(40);
  const durante = await page.locator('[role="dialog"]').count();
  await page.waitForTimeout(esperaSaida);
  const depois = await page.locator('[role="dialog"]').count();
  resultados.push({ nome: slug, entrada, final, durante, depois, passou: entrada?.transform !== 'none' && final?.transform === 'none' && durante === 1 && depois === 0 });
  await page.waitForTimeout(300);
}

await testar('Catálogo', /Ver curso /, 'detalhes-curso');
await testar('Turmas / Instâncias', /Ver turma /, 'detalhes-turma');
console.log(JSON.stringify(resultados, null, 2));
await context.close();
await browser.close();
