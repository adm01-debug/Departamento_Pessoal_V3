import { chromium } from '@playwright/test';
import fs from 'node:fs';

/** Cenário G/H — avanço de etapa e fechamento pelo botão do rodapé. */
const OUT = 'tmp-modal-validacao';
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
await page.locator('[data-candidato-card="mock-candt-1"]').waitFor({ timeout: 40000 });
await page.waitForTimeout(2500);

const card = page.locator('[data-candidato-card="mock-candt-1"]');
await card.scrollIntoViewIfNeeded();
await card.click();
await page.getByRole('dialog').waitFor({ state: 'visible' });
await page.waitForTimeout(1400);

const antes = {
  coluna: await page.locator('[data-pipeline-coluna] [data-candidato-card="mock-candt-1"]').evaluate(
    (el) => el.closest('[data-pipeline-coluna]')?.getAttribute('data-pipeline-coluna')
  ),
  etapa: await page.locator('[data-modal-faixa="etapas"] [aria-current="step"]').innerText(),
  avanco: await page.locator('[data-modal-faixa="rodape"] button').last().innerText(),
};

await page.getByRole('button', { name: /Avançar para Entrevista/ }).click();
await page.waitForTimeout(1800);

const depois = {
  etapa: await page.locator('[data-modal-faixa="etapas"] [aria-current="step"]').innerText(),
  avanco: await page.locator('[data-modal-faixa="rodape"] button').last().innerText(),
  badge: await page.getByRole('dialog').innerText(),
};
await page.screenshot({ path: `${OUT}/07-apos-avancar.png` });

await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).last().click();
await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 15000 });
await page.waitForTimeout(600);

const kanban = {
  coluna: await page.locator('[data-pipeline-coluna] [data-candidato-card="mock-candt-1"]').evaluate(
    (el) => el.closest('[data-pipeline-coluna]')?.getAttribute('data-pipeline-coluna')
  ),
  totalCards: await page.locator('[data-pipeline-coluna] [data-candidato-card]').count(),
};

console.log(JSON.stringify({ antes, depois: { etapa: depois.etapa, avanco: depois.avanco }, kanban }, null, 2));
fs.writeFileSync(`${OUT}/avanco.json`, JSON.stringify({ antes, depois, kanban }, null, 2));
await browser.close();
