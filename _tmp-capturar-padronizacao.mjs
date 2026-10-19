/**
 * Captura visual (read-only) da padronização: lista, modal e fila.
 * Uso: node _tmp-capturar-padronizacao.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('tmp-padronizacao', { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
await page.goto('http://localhost:8080/avaliacao');
await page.getByRole('tab', { name: /Feedbacks/i }).click();
await page.getByText('Avaliado por').first().waitFor({ timeout: 20000 });
await page.waitForTimeout(2600);

await page.screenshot({ path: 'tmp-padronizacao/lista-1440.png', fullPage: true });

// Modal do primeiro card
await page.getByRole('button', { name: 'Ver avaliação' }).first().click();
await page.getByRole('dialog').waitFor();
await page.waitForTimeout(1600);
await page.screenshot({ path: 'tmp-padronizacao/modal-cheio.png', fullPage: true });
await page.keyboard.press('Escape');
await page.waitForTimeout(700);

// Fila "Aguardando gestor"
const grupo = page.getByRole('group', { name: 'Segmentar por tipo de feedback' });
await grupo.getByRole('button', { name: /Aguardando gestor/ }).click();
await page.getByText('Gestor responsável').first().waitFor({ timeout: 20000 });
await page.waitForTimeout(1600);
await page.screenshot({ path: 'tmp-padronizacao/fila-1440.png', fullPage: true });

// Modal da fila (contexto de aprovação)
await page.getByRole('button', { name: 'Ver avaliação' }).first().click();
await page.getByRole('dialog').waitFor();
await page.waitForTimeout(1600);
await page.screenshot({ path: 'tmp-padronizacao/modal-fila.png', fullPage: true });
await page.keyboard.press('Escape');
await page.waitForTimeout(700);

// Largura menor (1024)
await page.setViewportSize({ width: 1024, height: 1000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'tmp-padronizacao/fila-1024.png', fullPage: true });

console.log('capturas em tmp-padronizacao/');
await browser.close();
