import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const state = JSON.parse(readFileSync('e2e/.auth/user.json', 'utf8'));
const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 } });
const page = await contexto.newPage();
page.setDefaultTimeout(12_000);
await page.addInitScript(() => localStorage.setItem('dp-tour-completed', 'true'));
await page.goto('http://localhost:8080/treinamentos', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /^Treinamentos$/ }).waitFor();
await page.getByRole('tab', { name: /Turmas \/ Instâncias/i }).click();
await page.waitForTimeout(1800);

const trigger = page.getByRole('button', { name: /Ações da turma/i }).first();
const passos = {};

await trigger.click();
await page.waitForTimeout(300);
passos.abertura = await page.getByRole('menuitem').count();

await page.keyboard.press('Escape');
await page.waitForTimeout(700);
passos.aposEsc = await page.getByRole('menuitem').count();

await trigger.click();
await page.waitForTimeout(300);
await page.mouse.click(700, 260);
await page.waitForTimeout(700);
passos.aposFora = await page.getByRole('menuitem').count();

await trigger.click();
await page.waitForTimeout(300);
await page.getByRole('menuitem', { name: /Ver detalhes/i }).click();
await page.waitForTimeout(600);
passos.viaMenu = await page.getByRole('dialog').count();
await page.keyboard.press('Escape');

console.log(JSON.stringify(passos));
await contexto.close();
await browser.close();

