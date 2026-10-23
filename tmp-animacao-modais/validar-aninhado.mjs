import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SAIDA = path.join(process.cwd(), 'tmp-animacao-modais');
mkdirSync(SAIDA, { recursive: true });
const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.getByRole('tab', { name: 'Treinamentos' }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: 'Trilhas' }).click();
await page.waitForTimeout(700);
await page.getByRole('button', { name: 'Explorar trilha' }).first().click();
await page.waitForTimeout(1100);
await page.getByRole('button', { name: 'Adicionar Curso' }).click();
await page.waitForTimeout(80);

const entrada = await page.evaluate(() => {
  const dialogs = [...document.querySelectorAll('[role="dialog"]')];
  const el = dialogs[dialogs.length - 1];
  const s = getComputedStyle(el);
  return { total: dialogs.length, transform: s.transform, opacity: s.opacity };
});
await page.screenshot({ path: path.join(SAIDA, 'adicionar-curso-trilha.png') });
await page.waitForTimeout(1000);
const final = await page.evaluate(() => {
  const dialogs = [...document.querySelectorAll('[role="dialog"]')];
  const el = dialogs[dialogs.length - 1];
  return { total: dialogs.length, transform: getComputedStyle(el).transform };
});
await page.keyboard.press('Escape');
await page.waitForTimeout(40);
const duranteSaida = await page.locator('[role="dialog"]').count();
await page.waitForTimeout(1200);
const depois = await page.locator('[role="dialog"]').count();
const foco = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
await page.keyboard.press('Escape');
await page.waitForTimeout(1200);

console.log(JSON.stringify({ entrada, final, duranteSaida, depois, foco, passou: entrada.transform !== 'none' && final.transform === 'none' && depois === 1 && foco.includes('Adicionar Curso') }, null, 2));
await context.close();
await browser.close();

