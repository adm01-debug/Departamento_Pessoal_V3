/**
 * TEMPORÁRIO — valida o dimensionamento da coluna lateral (Pagamentos).
 * Confere: o card Atividade recente tem altura proporcional aos registros (sem
 * vazio interno), a base dele coincide com a base da tabela (≤2px) e isso se
 * mantém quando a altura da tabela muda (filtro/paginação). Também confere a
 * responsividade (empilhado, sem alinhamento forçado) e o acesso às atividades.
 *
 * Uso: node scripts/_tmp-validar-painel-lateral.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = 'http://localhost:8080/premiacoes';
const SAIDA = 'tmp-painel-lateral';
mkdirSync(SAIDA, { recursive: true });

const MEDIR = () => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const round = (n) => Math.round(n);
  const h3 = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Atividade recente');
  const cardAtiv = h3?.closest('section');
  const tabela = document.querySelector('table')?.closest('section');
  const linhas = Array.from(cardAtiv?.querySelectorAll('li') ?? []);
  const ultima = linhas[linhas.length - 1];
  const rCard = cardAtiv?.getBoundingClientRect();
  const cs = cardAtiv ? getComputedStyle(cardAtiv) : null;
  const rTabela = tabela?.getBoundingClientRect();
  const acoes = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Próximas ações')?.closest('section');
  const resumo = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Resumo Financeiro')?.closest('section');
  return {
    registros: linhas.length,
    alturaDoCard: rCard ? round(rCard.height) : null,
    vazioInternoAbaixoDaUltima: rCard && ultima ? round(rCard.bottom - ultima.getBoundingClientRect().bottom - 16) : null,
    flexGrow: cs?.flexGrow ?? null,
    alturaTabela: rTabela ? round(rTabela.height) : null,
    alturaDaAtividade: rCard ? round(rCard.height) : null,
    baseTabela: rTabela ? round(rTabela.bottom) : null,
    baseAtividade: rCard ? round(rCard.bottom) : null,
    desalinhamento: rTabela && rCard ? round(Math.abs(rTabela.bottom - rCard.bottom)) : null,
    alturaResumo: resumo ? round(resumo.getBoundingClientRect().height) : null,
    alturaAcoes: acoes ? round(acoes.getBoundingClientRect().height) : null,
    alturaDoCardPr: acoes ? getComputedStyle(acoes).flexGrow : null,
    registrosVisiveis: linhas.map((li) => texto(li).slice(0, 46)),
    rolagemInterna: cardAtiv ? cardAtiv.scrollHeight > cardAtiv.clientHeight + 1 : null,
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

// 1 · Filtro que ENCURTA a tabela (Rejeitado = 1 linha) — o alinhamento deve seguir
await page.getByLabel('Status').click();
await page.getByRole('option', { name: 'Rejeitado' }).click();
await page.waitForTimeout(900);
resultados.aposFiltroRejeitado = await page.evaluate(MEDIR);
await page.screenshot({ path: `${SAIDA}/apos-filtro.png` });

// 2 · Volta o filtro e testa a paginação (menos linhas por página)
await page.getByLabel('Status').click();
await page.getByRole('option', { name: 'Todos os status' }).click();
await page.waitForTimeout(900);
resultados.aposLimparFiltro = await page.evaluate(MEDIR);

// 3 · Responsividade (empilhado, sem alinhamento forçado)
await page.setViewportSize({ width: 1024, height: 1200 });
await page.waitForTimeout(700);
resultados.tablet = await page.evaluate(MEDIR);
await page.screenshot({ path: `${SAIDA}/tablet-1024.png` });

// 4 · "Ver todas" continua levando à Auditoria
await page.setViewportSize({ width: 1456, height: 1000 });
await page.waitForTimeout(600);
await page.getByRole('button', { name: 'Ver todas' }).click();
await page.waitForTimeout(700);
resultados.verTodasVaiParaAuditoria = await page.getByRole('tab', { name: /Auditoria/ }).getAttribute('aria-selected');
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SAIDA}/desktop-1456.png` });

resultados.erros = erros;
writeFileSync(`${SAIDA}/relatorio.json`, JSON.stringify(resultados, null, 2));
console.log(JSON.stringify(resultados, null, 2));
await contexto.close();
await browser.close();
