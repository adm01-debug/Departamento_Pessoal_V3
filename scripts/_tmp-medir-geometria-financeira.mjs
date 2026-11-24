/**
 * TEMPORÁRIO — radiografia da geometria da aba Pagamentos (alturas por peça).
 * Uso: node scripts/_tmp-medir-geometria-financeira.mjs
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1456, height: 1000 } });
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(4500);

const dados = await page.evaluate(() => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const round = (n) => Math.round(n);
  const card = (t) => Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === t)?.closest('section') ?? null;
  const r = (el) => (el ? el.getBoundingClientRect() : null);
  const H = (el) => (r(el) ? round(r(el).height) : null);
  const TOP = (el) => (r(el) ? round(r(el).top) : null);
  const BOT = (el) => (r(el) ? round(r(el).bottom) : null);

  const tabela = document.querySelector('table')?.closest('section');
  const aside = card('Resumo Financeiro')?.parentElement;
  const kpis = document.querySelectorAll('main section');
  const acoes = card('Próximas ações');
  const ativ = card('Atividade recente');
  const resumo = card('Resumo Financeiro');
  const svg = resumo?.querySelector('svg');
  const legenda = resumo?.querySelectorAll('ul li');
  const itensAcao = acoes?.querySelectorAll('li');
  const itensAtiv = ativ?.querySelectorAll('li');
  const trs = Array.from(document.querySelectorAll('tbody tr'));
  const footer = tabela?.querySelector('footer');
  const thead = tabela?.querySelector('thead');

  // Seções da coluna principal (na ordem do DOM)
  const main = tabela?.parentElement;
  const secoesMain = main ? Array.from(main.children).map((el) => ({ tag: el.tagName.toLowerCase(), h: H(el), top: TOP(el) })) : [];

  return {
    topoGrade: TOP(resumo),
    baseTabela: BOT(tabela),
    baseAtividade: BOT(ativ),
    diferenca: BOT(tabela) - BOT(ativ),
    secoesMain,
    alturaTabela: H(tabela),
    thead: H(thead),
    footer: H(footer),
    primeiraLinha: trs[0] ? round(trs[0].getBoundingClientRect().height) : null,
    qtdLinhas: trs.length,
    celula: trs[0] ? (() => { const td = trs[0].querySelector('td'); const cs = getComputedStyle(td); return { paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, alturaInterna: round(td.getBoundingClientRect().height) }; })() : null,
    alturaResumo: H(resumo),
    donut: svg ? { w: round(svg.getBoundingClientRect().width), h: round(svg.getBoundingClientRect().height) } : null,
    legendaItens: legenda ? Array.from(legenda).map((li) => H(li)) : [],
    legendaTotal: legenda?.length ? round(Array.from(legenda).reduce((s, li) => s + li.getBoundingClientRect().height, 0)) : null,
    alturaAcoes: H(acoes),
    itensAcao: itensAcao ? Array.from(itensAcao).map((li) => H(li)) : [],
    alturaAtiv: H(ativ),
    itensAtiv: itensAtiv ? Array.from(itensAtiv).map((li) => H(li)) : [],
    gapAside: aside ? getComputedStyle(aside).gap : null,
    alturaAside: H(aside),
    paddingDosCards: [resumo, acoes, ativ].map((el) => (el ? getComputedStyle(el).paddingTop : null)),
    kpiCards: Array.from(kpis)
      .filter((s) => texto(s).startsWith('Total Aprovado'))
      .map((s) => H(s)),
  };
});

console.log(JSON.stringify(dados, null, 2));
await contexto.close();
await browser.close();
