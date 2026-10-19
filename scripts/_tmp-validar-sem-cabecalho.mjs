/**
 * TEMPORÁRIO — valida a REMOÇÃO do cabeçalho da aba Pagamentos.
 * Confere: o cabeçalho não existe mais, nenhum espaço vazio sobrou, os KPI Cards
 * ficam logo abaixo da tablist (mesmo respiro da aba Campanhas) e todo o resto
 * (fluxo, filtros, tabela, laterais, paginação e a lógica de período) segue vivo.
 *
 * Uso: node scripts/_tmp-validar-sem-cabecalho.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = 'http://localhost:8080/premiacoes';
const SAIDA = 'tmp-sem-cabecalho';
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

const MEDIR = () => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const tablist = document.querySelector('[role="tablist"]');
  const painel = document.querySelector('[role="tabpanel"][data-state="active"]');
  const kpi = Array.from(document.querySelectorAll('p')).find((p) => texto(p) === 'Total Aprovado');
  const cardKpi = kpi?.closest('div.flex.items-center');
  const fluxo = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Fluxo de Pagamento');
  return {
    temTituloDoCabecalho: /Pagamentos & Premiações/.test(texto(painel)),
    temCicloDePagamento: /Ciclo de Pagamento/.test(texto(painel)),
    temChipPeriodo: Array.from(document.querySelectorAll('span')).some((s) => texto(s) === 'Período'),
    respiroTablistParaKpi: tablist && cardKpi ? Math.round(cardKpi.getBoundingClientRect().top - tablist.getBoundingClientRect().bottom) : null,
    primeiroFilhoDoPainel: painel?.firstElementChild ? painel.firstElementChild.className.slice(0, 60) : null,
    kpiAntesDoFluxo: cardKpi && fluxo ? cardKpi.getBoundingClientRect().top < fluxo.getBoundingClientRect().top : null,
    kpis: ['Total Aprovado', 'Aguardando Aprovação', 'Divergências Identificadas', 'Total Pago no Período'].map((t) => {
      const p = Array.from(document.querySelectorAll('p')).find((x) => texto(x) === t);
      return p ? texto(p.closest('div.flex.items-center')) : null;
    }),
    etapasDoFluxo: document.querySelectorAll('ol > li button').length,
    filtros: Array.from(document.querySelectorAll('input[aria-label], [role="combobox"]')).map((el) => el.getAttribute('aria-label')),
    linhasDaTabela: document.querySelectorAll('tbody tr').length,
    rodape: texto(Array.from(document.querySelectorAll('p')).find((p) => /Mostrando/.test(texto(p)))),
    laterais: Array.from(document.querySelectorAll('h2, h3')).map(texto).filter((t) => /Resumo Financeiro|Próximas ações|Atividade recente/.test(t)),
    periodoNoResumo: texto(Array.from(document.querySelectorAll('p')).find((p) => /Todos os períodos/.test(texto(p)))),
    elementosNoTopoDoPainel: Array.from(painel?.children ?? []).map((c) => c.tagName.toLowerCase()),
    errosPagina: 0,
  };
};

// Aba Pagamentos
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(2400);
const pagamentos = await page.evaluate(MEDIR);
await page.screenshot({ path: `${SAIDA}/pagamentos-topo.png` });
await page.screenshot({ path: `${SAIDA}/pagamentos-full.png`, fullPage: true });

// Mesmo respiro na aba Campanhas (referência de consistência do hub)
await page.getByRole('tab', { name: /Campanhas/ }).click();
await page.waitForTimeout(2400);
const campanhas = await page.evaluate(() => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const tablist = document.querySelector('[role="tablist"]');
  const kpi = Array.from(document.querySelectorAll('p')).find((p) => texto(p) === 'Total Aprovado');
  const card = kpi?.closest('div.flex.items-center');
  return {
    respiroTablistParaKpi: tablist && card ? Math.round(card.getBoundingClientRect().top - tablist.getBoundingClientRect().bottom) : null,
  };
});

const relatorio = { pagamentos, campanhas, erros };
writeFileSync(`${SAIDA}/relatorio.json`, JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 2));

await contexto.close();
await browser.close();
