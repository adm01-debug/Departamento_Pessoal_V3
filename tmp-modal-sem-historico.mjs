import { chromium } from '@playwright/test';
import fs from 'node:fs';

/**
 * Cenário C — candidato SEM histórico.
 *
 * Nenhum dossiê do mock demonstrativo nasce vazio (é requisito da vitrine), então
 * este script intercepta APENAS a resposta do módulo de mock no navegador e faz
 * `getMockTimeline('mock-candt-1')` devolver uma lista vazia. Nenhum arquivo do
 * repositório é alterado; a tela cai no estado vazio real do componente.
 */
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

await page.route('**/src/mocks/recrutamentoMock.ts*', async (route) => {
  const resposta = await route.fetch();
  const corpo = await resposta.text();
  const corpoVazio = corpo.replace(
    'export function getMockTimeline(candidaturaId) {',
    "export function getMockTimeline(candidaturaId) {\n  if (candidaturaId === 'mock-candt-1') return [];"
  );
  await route.fulfill({ response: resposta, body: corpoVazio });
});

await page.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
await page.locator('[data-candidato-card="mock-candt-1"]').waitFor({ timeout: 40000 });
await page.waitForTimeout(2500);
await page.locator('[data-candidato-card="mock-candt-1"]').click();
await page.getByRole('dialog').waitFor({ state: 'visible' });
await page.waitForTimeout(1400);

const dados = await page.evaluate(() => {
  const d = document.querySelector('[role="dialog"]');
  const box = d.getBoundingClientRect();
  const historico = d.querySelector('[data-modal-faixa="historico"]');
  return {
    altura: Math.round(box.height),
    largura: Math.round(box.width),
    registros: d.querySelector('[aria-label="Histórico do processo"]')?.innerText.match(/(\d+) registros?/)?.[1] ?? null,
    textoVazio: historico?.innerText.replace(/\s+/g, ' ').trim() ?? null,
    alturaHistorico: Math.round(historico.getBoundingClientRect().height),
  };
});

await page.screenshot({ path: `${OUT}/08-sem-historico-1440.png` });
fs.writeFileSync(`${OUT}/sem-historico.json`, JSON.stringify(dados, null, 2));
console.log(JSON.stringify(dados, null, 2));
await browser.close();
