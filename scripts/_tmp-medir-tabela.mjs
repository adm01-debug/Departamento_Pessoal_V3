/**
 * TEMPORÁRIO — radiografia da tabela de Pagamentos: largura real de cada coluna,
 * truncamentos (scrollWidth x clientWidth), alturas de linha e fontes resolvidas.
 * Uso: node scripts/_tmp-medir-tabela.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const SAIDA = 'tmp-tabela-ui';
mkdirSync(SAIDA, { recursive: true });

const MEDIR = () => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const round = (n) => Math.round(n);
  const table = document.querySelector('table');
  const card = table.closest('section');
  const cols = Array.from(table.querySelectorAll('col')).map((c) => round(c.getBoundingClientRect().width));
  const ths = Array.from(table.querySelectorAll('thead th')).map((th) => {
    const span = th.querySelector('span');
    return {
      rotulo: texto(th).replace(/\s+/g, ' ').slice(0, 22),
      largura: round(th.getBoundingClientRect().width),
      padding: getComputedStyle(th).paddingLeft + '/' + getComputedStyle(th).paddingRight,
      fonte: getComputedStyle(th).fontSize + ' ' + getComputedStyle(th).fontWeight + ' ' + getComputedStyle(th).fontFamily.split(',')[0],
      precisaDe: span ? Math.round(span.scrollWidth + parseFloat(getComputedStyle(th).paddingLeft) * 2) : null,
      cortado: span ? span.scrollWidth > span.clientWidth + 1 : null,
    };
  });
  const linhas = Array.from(table.querySelectorAll('tbody tr')).map((tr) => {
    const tds = Array.from(tr.children);
    const celulas = tds.map((td) => Array.from(td.querySelectorAll('span, p')).filter((el) => el.children.length === 0 && texto(el)).map((el) => ({
      t: texto(el).slice(0, 26),
      cortado: el.scrollWidth > el.clientWidth + 1,
      precisa: Math.round(el.scrollWidth + 6),
      fonte: getComputedStyle(el).fontSize + '/' + getComputedStyle(el).fontWeight,
      familia: getComputedStyle(el).fontFamily.split(',')[0],
    })).filter((x) => x.cortado));
    return { altura: round(tr.getBoundingClientRect().height), cortados: celulas };
  });
  return {
    larguraDaTabela: round(table.getBoundingClientRect().width),
    larguraDoCard: round(card.getBoundingClientRect().width),
    paddingDaCelulaCorpo: getComputedStyle(table.querySelector('tbody td')).paddingTop,
    colunas: cols,
    sombra: ths,
    alturasDasLinhas: linhas.map((l) => l.altura),
    truncamentos: linhas.flatMap((l) => l.cortados),
    fontesResolvidas: {
      nome: (() => { const el = table.querySelector('tbody tr td:nth-child(2) span:last-child'); return el ? getComputedStyle(el).fontSize + ' ' + getComputedStyle(el).fontWeight + ' ' + getComputedStyle(el).fontFamily.split(',')[0] : null; })(),
      dinheiro: (() => { const el = table.querySelector('tbody tr td:nth-child(4)'); return el ? getComputedStyle(el).fontSize + ' ' + getComputedStyle(el).fontWeight + ' ' + getComputedStyle(el).fontFamily.split(',')[0] + ' variant=' + getComputedStyle(el).fontVariantNumeric : null; })(),
      badge: (() => { const el = table.querySelector('tbody tr span.rounded-full'); return el ? getComputedStyle(el).fontSize + ' ' + getComputedStyle(el).fontWeight : null; })(),
    },
  };
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
await page.waitForTimeout(5000);

const dados = await page.evaluate(MEDIR);
writeFileSync(`${SAIDA}/antes.json`, JSON.stringify(dados, null, 2));
console.log(JSON.stringify(dados, null, 2));
await contexto.close();
await browser.close();
