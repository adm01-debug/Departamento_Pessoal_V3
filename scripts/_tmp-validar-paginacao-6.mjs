/**
 * TEMPORÁRIO — valida a paginação de 6 em Pagamentos e o alinhamento dos cards
 * laterais SEM truques de crescimento.
 *
 * Confere: 6 linhas por página, rodapé "Mostrando 6 de 10 pagamentos", seletor
 * "Linhas por página" com 6 (e 6 continua na lista depois de escolher 10),
 * paginação funcional (página 2 com os 4 restantes), respiro de 16 px entre
 * Próximas ações e Atividade recente, nenhum card com flex-grow e a diferença
 * entre a base da tabela e a base do Atividade recente.
 *
 * Uso: node scripts/_tmp-validar-paginacao-6.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = 'http://localhost:8080/premiacoes';
const SAIDA = 'tmp-paginacao-6';
mkdirSync(SAIDA, { recursive: true });

const MEDIR = () => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const round = (n) => Math.round(n);
  const card = (titulo) =>
    Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === titulo)?.closest('section') ?? null;
  const cardAtiv = card('Atividade recente');
  const cardAcoes = card('Próximas ações');
  const cardResumo = card('Resumo Financeiro');
  const tabela = document.querySelector('table')?.closest('section');
  const itens = Array.from(cardAtiv?.querySelectorAll('li') ?? []);
  const ultima = itens[itens.length - 1];
  const linhasVisiveis = document.querySelectorAll('tbody tr').length;
  const r = (el) => el?.getBoundingClientRect();
  const rTabela = r(tabela);
  const rAtiv = r(cardAtiv);
  const rAcoes = r(cardAcoes);
  const rResumo = r(cardResumo);
  const rodape = texto(tabela?.querySelector('footer'));
  const seletor = tabela?.querySelector('[aria-label="Linhas por página"]');
  return {
    linhasVisiveis,
    rodape: rodape.slice(0, 60),
    seletor: texto(seletor),
    paginaAtiva: texto(tabela?.querySelector('[aria-current="page"]')),
    registrosNaAtividade: itens.length,
    alturaTabela: rTabela ? round(rTabela.height) : null,
    baseTabela: rTabela ? round(rTabela.bottom) : null,
    baseAtividade: rAtiv ? round(rAtiv.bottom) : null,
    diferencaDasBases: rTabela && rAtiv ? round(rTabela.bottom - rAtiv.bottom) : null,
    alturaResumo: rResumo ? round(rResumo.height) : null,
    alturaAcoes: rAcoes ? round(rAcoes.height) : null,
    alturaAtividade: rAtiv ? round(rAtiv.height) : null,
    respiroEntreCardsLaterais: rAcoes && rAtiv ? round(rAtiv.top - rAcoes.bottom) : null,
    flexGrowDosCards: [cardResumo, cardAcoes, cardAtiv].map((el) => (el ? getComputedStyle(el).flexGrow : null)),
    margensDeEmpurrao: [cardResumo, cardAcoes, cardAtiv].map((el) =>
      el ? [getComputedStyle(el).marginTop, getComputedStyle(el).marginBottom].join('/') : null,
    ),
    vazioInternoNaAtividade: rAtiv && ultima ? round(rAtiv.bottom - ultima.getBoundingClientRect().bottom - 12) : null,
    rolagemInterna: cardAtiv ? cardAtiv.scrollHeight > cardAtiv.clientHeight + 1 : null,
    empilhado: rTabela && rAtiv ? rAtiv.top >= rTabela.bottom - 1 : null,
    colaboradoresVisiveis: Array.from(document.querySelectorAll('tbody tr')).map((tr) => texto(tr).slice(0, 30)),
  };
};

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1456, height: 1000 } });
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
await page.waitForTimeout(2400);

const resultados = { inicial: await page.evaluate(MEDIR) };
await page.screenshot({ path: `${SAIDA}/desktop-1456.png`, fullPage: true });

// 1 · Paginação: próxima página traz os 4 restantes
const proxima = page.getByRole('button', { name: 'Próxima página' });
await proxima.click();
await page.waitForTimeout(900);
resultados.pagina2 = await page.evaluate(MEDIR);
await page.screenshot({ path: `${SAIDA}/pagina-2.png`, fullPage: true });

// 2 · Volta para a página 1
await page.getByRole('button', { name: 'Página anterior' }).click();
await page.waitForTimeout(900);
resultados.voltaParaPagina1 = await page.evaluate(MEDIR);

// 3 · Seletor: 6 continua disponível depois de escolher 10
await page.getByLabel('Linhas por página').click();
await page.waitForTimeout(400);
const opcoes = await page.getByRole('option').allTextContents();
resultados.opcoesDoSeletor = opcoes.filter((o) => /^\d+$/.test(o.trim()));
await page.getByRole('option', { name: '10', exact: true }).click();
await page.waitForTimeout(900);
resultados.com10PorPagina = await page.evaluate(MEDIR);
await page.getByLabel('Linhas por página').click();
await page.waitForTimeout(400);
resultados.opcoesDepoisDeEscolher10 = (await page.getByRole('option').allTextContents()).filter((o) => /^\d+$/.test(o.trim()));
await page.getByRole('option', { name: '6', exact: true }).click();
await page.waitForTimeout(900);
resultados.voltaPara6 = await page.evaluate(MEDIR);

// 4 · Responsividade
await page.setViewportSize({ width: 1024, height: 1200 });
await page.waitForTimeout(700);
resultados.tablet = await page.evaluate(MEDIR);
await page.screenshot({ path: `${SAIDA}/tablet-1024.png`, fullPage: true });
await page.setViewportSize({ width: 1456, height: 1000 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${SAIDA}/desktop-1456-final.png`, fullPage: true });

resultados.erros = erros;
writeFileSync(`${SAIDA}/relatorio.json`, JSON.stringify(resultados, null, 2));
console.log(JSON.stringify(resultados, null, 2));
await contexto.close();
await browser.close();
