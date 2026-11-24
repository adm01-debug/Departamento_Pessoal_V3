/**
 * TEMPORÁRIO — recorte das duas bases (rodapé da tabela × Atividade recente)
 * + régua de 1px entre elas, para conferência visual do alinhamento.
 * Uso: node scripts/_tmp-shot-bases.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const SAIDA = 'tmp-paginacao-6';
mkdirSync(SAIDA, { recursive: true });

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1456, height: 1200 } });
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(5000);

// Linha guia exatamente na base da tabela, para ver se a base do card coincide.
const medida = await page.evaluate(() => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const card = (t) => Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === t)?.closest('section') ?? null;
  const tabela = document.querySelector('table')?.closest('section');
  const ativ = card('Atividade recente');
  const rT = tabela.getBoundingClientRect();
  const rA = ativ.getBoundingClientRect();
  const guia = document.createElement('div');
  guia.style.cssText = `position:fixed;left:270px;width:1180px;top:${Math.round(rT.bottom)}px;height:1px;background:#a3e635;z-index:9999`;
  document.body.appendChild(guia);
  return { baseTabela: Math.round(rT.bottom), baseAtividade: Math.round(rA.bottom), diferenca: Math.round(rT.bottom - rA.bottom) };
});
console.log(JSON.stringify(medida));
await page.screenshot({ path: `${SAIDA}/bases-com-guia.png`, clip: { x: 260, y: Math.max(0, medida.baseTabela - 210), width: 1196, height: 260 } });
await contexto.close();
await browser.close();
