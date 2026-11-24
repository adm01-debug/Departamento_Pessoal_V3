/**
 * TEMPORÁRIO — validação do botão "Limpar filtros" (aba Pagamentos).
 * Estados neutro/ativo/hover, limpeza, tabela, página e tooltip.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8080';
const OUT = 'tmp-tipografia';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1600, height: 1000 } });
await context.route('**/rest/v1/rpc/get_user_roles*', (rota) =>
  rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['admin', 'gestor']) })
);
await context.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
const page = await context.newPage();
await page.goto(`${BASE}/premiacoes`, { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.getByRole('textbox', { name: 'Buscar pagamentos' }).waitFor({ timeout: 15000 });
await page.waitForTimeout(2400);

const botao = page.getByRole('button', { name: 'Limpar filtros' });
const estado = () =>
  botao.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      desabilitado: el.hasAttribute('disabled'),
      ativo: el.getAttribute('data-filtros-ativos'),
      cor: cs.color,
      fundo: cs.backgroundColor,
      borda: cs.borderTopColor,
      transicao: cs.transitionDuration,
      opacidade: cs.opacity,
      linhas: document.querySelectorAll('tbody tr').length,
      busca: document.querySelector('input[aria-label="Buscar pagamentos"]')?.value ?? null,
      etapa: document.querySelector('[aria-label="Etapa do fluxo"]')?.textContent?.trim() ?? null,
      campanha: document.querySelector('[aria-label="Campanha"]')?.textContent?.trim() ?? null,
      status: document.querySelector('[aria-label="Status"]')?.textContent?.trim() ?? null,
    };
  });

const registrar = async (rotulo) => console.log(rotulo, JSON.stringify(await estado()));

await registrar('NEUTRO');
await page.screenshot({ path: `${OUT}/botao-neutro.png`, clip: undefined });

await page.getByRole('textbox', { name: 'Buscar pagamentos' }).fill('Carlos');
await page.waitForTimeout(700);
await registrar('BUSCA');
await botao.hover();
await page.waitForTimeout(300);
await registrar('BUSCA+HOVER');
await page.screenshot({ path: `${OUT}/botao-ativo.png`, clip: undefined });

await page.waitForTimeout(500);
console.log('TOOLTIP visível:', await page.getByText('Limpar filtros', { exact: true }).count());

await botao.click();
await page.waitForTimeout(900);
await registrar('APOS-LIMPAR-BUSCA');

await page.getByRole('combobox', { name: 'Campanha' }).click();
await page.getByRole('option').nth(1).click();
await page.waitForTimeout(700);
await registrar('CAMPANHA');

await page.getByRole('combobox', { name: 'Etapa do fluxo' }).click();
await page.getByRole('option', { name: /Enviado à folha/ }).click();
await page.waitForTimeout(700);
await registrar('ETAPA');
await botao.click();
await page.waitForTimeout(900);
await registrar('APOS-LIMPAR-ETAPA');

await page.getByRole('combobox', { name: 'Status' }).click();
await page.getByRole('option').nth(1).click();
await page.waitForTimeout(700);
await registrar('STATUS');
await botao.click();
await page.waitForTimeout(900);
await registrar('APOS-LIMPAR-STATUS');

await page.getByRole('textbox', { name: 'Buscar pagamentos' }).fill('Carlos');
await page.waitForTimeout(600);
await registrar('ANTES-DE-TROCAR-ABA');
await page.getByRole('tab', { name: /Campanhas/ }).click();
await page.waitForTimeout(900);
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.getByRole('textbox', { name: 'Buscar pagamentos' }).waitFor({ timeout: 15000 });
await page.waitForTimeout(1500);
await registrar('APOS-NAVEGAR');

await context.close();
await browser.close();
