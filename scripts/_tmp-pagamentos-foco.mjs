/**
 * TEMPORÁRIO — validação FOCADA da aba Pagamentos depois dos ajustes:
 * tabela sem corte (coluna de AÇÕES visível), destino "pendentes" da ação
 * lateral, seleção em lote e opções reais de período.
 * Uso: node scripts/_tmp-pagamentos-foco.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const URL = 'http://localhost:8080/premiacoes';
const SAIDA = 'tmp-pagamentos-tab';
mkdirSync(SAIDA, { recursive: true });

const browser = await chromium.launch();
const contexto = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1456, height: 1000 },
});
const page = await contexto.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 160)));
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.getByRole('heading', { name: /Pagamentos & Premiações/ }).waitFor({ timeout: 15_000 });
await page.waitForTimeout(2000);

const resultado = {};

// 1 · A tabela cabe? (a coluna de AÇÕES precisa estar visível no card)
resultado.tabela = await page.evaluate(() => {
  const scroller = document.querySelector('table')?.parentElement;
  const th = Array.from(document.querySelectorAll('thead th')).pop();
  if (!scroller || !th) return null;
  const s = scroller.getBoundingClientRect();
  const t = th.getBoundingClientRect();
  return {
    larguraScroller: Math.round(s.width),
    larguraTabela: Math.round(document.querySelector('table').getBoundingClientRect().width),
    sobraParaAcoes: Math.round(s.right - t.right),
    rolaInterno: scroller.scrollWidth > scroller.clientWidth + 1,
  };
});

// 2 · Ação lateral "N pagamentos aguardando aprovação" → filtro "pendentes"
const acoes = page.locator('section').filter({ hasText: 'Próximas ações' }).locator('li button');
resultado.acaoLateralTexto = (await acoes.first().innerText()).replace(/\s+/g, ' ').trim();
await acoes.first().click();
await page.waitForTimeout(600);
resultado.linhasAposAcaoLateral = await page.locator('tbody tr').count();
resultado.resumoMostrando = await page
  .locator('p', { hasText: /Mostrando/ })
  .first()
  .innerText()
  .catch(() => '');
await page.getByRole('button', { name: /Limpar etapa/ }).click();
await page.waitForTimeout(400);

// 3 · Seleção em lote (barra de ações)
await page.getByRole('checkbox', { name: 'Selecionar todos os pagamentos da página' }).click();
await page.waitForTimeout(500);
resultado.barraLote = await page.getByText(/pagamentos selecionados/).count();
resultado.textoBarraLote = await page
  .getByText(/pagamentos selecionados/)
  .first()
  .innerText()
  .catch(() => '');
await page.getByRole('button', { name: 'Limpar' }).click();
await page.waitForTimeout(300);

// 4 · Opções REAIS de período
await page.getByLabel('Período').click();
await page.waitForTimeout(500);
resultado.opcoesPeriodo = await page.locator('[role="option"]').allInnerTexts();
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// 5 · Print das regiões-chave (coluna lateral + cabeçalho da tabela)
await page.screenshot({ path: `${SAIDA}/foco-lateral.png`, clip: { x: 1200, y: 260, width: 250, height: 700 } });
await page.screenshot({ path: `${SAIDA}/foco-tabela.png`, clip: { x: 280, y: 620, width: 930, height: 330 } });
resultado.erros = erros;

writeFileSync(`${SAIDA}/foco.json`, JSON.stringify(resultado, null, 2));
console.log(JSON.stringify(resultado, null, 2));

await contexto.close();
await browser.close();
