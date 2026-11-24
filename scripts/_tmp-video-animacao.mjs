/**
 * TEMPORÁRIO — grava uma demonstração curta (vídeo) da entrada em cascata:
 * Desligamentos (referência), Campanhas e Pagamentos, na mesma resolução.
 * Uso: node scripts/_tmp-video-animacao.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const SAIDA = 'tmp-animacao/videos';
mkdirSync(SAIDA, { recursive: true });

const browser = await chromium.launch();
const contexto = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1512, height: 1000 },
  recordVideo: { dir: SAIDA, size: { width: 1512, height: 1000 } },
});
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});

// 1 · Referência: Desligamentos (recarrega para a lista entrar em cascata)
await page.goto('http://localhost:8080/desligamentos', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(7000);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6500);
await page.video()?.saveAs(`${SAIDA}/1-desligamentos-referencia.webm`);

// 2 · Campanhas
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /^Campanhas/ }).click();
await page.waitForTimeout(4500);
await page.video()?.saveAs(`${SAIDA}/2-campanhas.webm`);

// 3 · Pagamentos
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(4500);
await page.video()?.saveAs(`${SAIDA}/3-pagamentos.webm`);

console.log('videos em', SAIDA);
await contexto.close();
await browser.close();
