/**
 * TEMPORÁRIO — confirma que, com a integração desligada, NENHUMA requisição
 * para `training_images` / `training-images` sai do navegador.
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: state, viewport: { width: 1600, height: 900 } });
const page = await contexto.newPage();
const url = [];
page.on('request', (r) => url.push(r.url()));

await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor({ timeout: 30_000 });
for (const nome of [/Catálogo/i, /Trilhas/i, /Turmas \/ Instâncias/i, /Certificados/i]) {
  await page.getByRole('tab', { name: nome }).click();
  await page.waitForTimeout(1200);
}

const suspeitas = url.filter((u) => /training_images|training-images|openai|api\.openai/i.test(u));
console.log(JSON.stringify({ total: url.length, suspeitas }, null, 2));
await contexto.close();
await browser.close();
