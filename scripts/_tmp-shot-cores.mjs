/**
 * TEMPORÁRIO — evidência visual do refinamento de cores: fluxo, tabela de
 * pagamentos (avatares/ícones/valores/status/botões), Próximas ações, Atividade
 * recente e tabela de campanhas.
 * Uso: node scripts/_tmp-shot-cores.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const SAIDA = 'tmp-cores';
mkdirSync(SAIDA, { recursive: true });

const caixa = (el) => {
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x) - 6, y: Math.round(r.y) - 6, width: Math.round(r.width) + 12, height: Math.round(r.height) + 12 };
};

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1512, height: 1200 } });
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(4500);
await page.mouse.move(10, 10);
await page.evaluate(() => document.activeElement?.blur());
await page.waitForTimeout(400);

const regioes = await page.evaluate(() => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const card = (t) => Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === t)?.closest('section');
  const r = (el) => {
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.x) - 6, y: Math.round(b.y) - 6, width: Math.round(b.width) + 12, height: Math.round(b.height) + 12 };
  };
  const fluxo = texto(document.body).includes('Fluxo de Pagamento')
    ? Array.from(document.querySelectorAll('section, div')).find((el) => texto(el).startsWith('Fluxo de Pagamento') && el.querySelector('button'))
    : null;
  const tabela = document.querySelector('table');
  const linhas = tabela.querySelectorAll('tbody tr');
  return {
    fluxo: fluxo ? r(fluxo) : null,
    tresLinhas: (() => {
      const a = linhas[0].getBoundingClientRect();
      const b = linhas[2].getBoundingClientRect();
      return { x: Math.round(a.x) - 6, y: Math.round(a.y) - 6, width: Math.round(a.width) + 12, height: Math.round(b.bottom - a.top) + 12 };
    })(),
    proximas: r(card('Próximas ações')),
    atividade: r(card('Atividade recente')),
    rodapeTabela: (() => {
      const b = tabela.closest('section').querySelector('footer').getBoundingClientRect();
      return { x: Math.round(b.x) - 6, y: Math.round(b.y) - 6, width: Math.round(b.width) + 12, height: Math.round(b.height) + 12 };
    })(),
  };
});

for (const [nome, clip] of Object.entries(regioes)) {
  if (!clip) continue;
  await page.screenshot({ path: `${SAIDA}/pagamentos-${nome}.png`, clip });
}

await page.getByRole('tab', { name: /^Campanhas/ }).click();
await page.waitForTimeout(4200);
await page.mouse.move(10, 10);
await page.waitForTimeout(400);
const regioesCampanhas = await page.evaluate(() => {
  const tabela = document.querySelector('table');
  const linhas = tabela.querySelectorAll('tbody tr');
  const a = linhas[0].getBoundingClientRect();
  const b = linhas[Math.min(1, linhas.length - 1)].getBoundingClientRect();
  return {
    tresLinhas: { x: Math.round(a.x) - 6, y: Math.round(a.y) - 6, width: Math.round(a.width) + 12, height: Math.round(b.bottom - a.top) + 12 },
  };
});
await page.screenshot({ path: `${SAIDA}/campanhas-linhas.png`, clip: regioesCampanhas.tresLinhas });
console.log('ok');
await contexto.close();
await browser.close();
