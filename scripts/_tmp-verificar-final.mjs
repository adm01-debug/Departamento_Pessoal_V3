/**
 * TEMPORÁRIO — verificação final da tabela em 1512 e 1280: truncamento dos
 * VALORES financeiros, sobreposição de células, alturas, 6 registros, badge do
 * status inteiro e alinhamento com o card Atividade recente.
 * Uso: node scripts/_tmp-verificar-final.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const SAIDA = 'tmp-tabela-ui';
mkdirSync(SAIDA, { recursive: true });

const MEDIR = () => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const round = (n) => Math.round(n);
  const table = document.querySelector('table');
  const cols = ['selecao', 'colaborador', 'campanha', 'calc', 'aprov', 'pago', 'status', 'acoes'];
  const card = (t) => Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === t)?.closest('section') ?? null;
  const ativ = card('Atividade recente');
  const valoresTruncados = [];
  const sobreposicoes = [];
  const caixas = [];
  Array.from(table.querySelectorAll('tbody tr')).forEach((tr, i) => {
    Array.from(tr.children).forEach((td, c) => {
      caixas.push({ i, c, box: td.getBoundingClientRect() });
      if (c === 3 || c === 4 || c === 5) {
        if (td.scrollWidth > td.clientWidth + 1) valoresTruncados.push({ linha: i + 1, coluna: cols[c], texto: texto(td), scroll: td.scrollWidth, client: td.clientWidth });
      }
    });
  });
  // Sobreposição entre células vizinhas (o texto de uma invadindo a outra)
  Array.from(table.querySelectorAll('tbody tr')).forEach((tr, i) => {
    const rects = Array.from(tr.children).map((td) => {
      const alvo = td.querySelector('span, div') ?? td;
      const r = alvo.getBoundingClientRect();
      return { left: r.left, right: r.right };
    });
    for (let k = 0; k + 1 < rects.length; k += 1) {
      if (rects[k].right > rects[k + 1].left + 1) sobreposicoes.push({ linha: i + 1, colunas: `${cols[k]}→${cols[k + 1]}`, excesso: Math.round(rects[k].right - rects[k + 1].left) });
    }
  });
  const svgsFora = Array.from(table.querySelectorAll('tbody tr svg')).filter((s) => s.getBoundingClientRect().width > 40).length;
  const rT = table.closest('section').getBoundingClientRect();
  const rA = ativ.getBoundingClientRect();
  return {
    larguraTabela: round(table.getBoundingClientRect().width),
    colunas: Array.from(table.querySelectorAll('col')).map((c) => round(c.getBoundingClientRect().width)),
    rolagemHorizontalInterna: table.parentElement.scrollWidth - table.parentElement.clientWidth,
    linhas: table.querySelectorAll('tbody tr').length,
    alturasDasLinhas: Array.from(table.querySelectorAll('tbody tr')).map((tr) => round(tr.getBoundingClientRect().height)),
    valoresTruncados,
    sobreposicoes,
    svgsFora,
    badgeIntegro: Array.from(table.querySelectorAll('tbody span.rounded-full')).filter((s) => s.classList.contains('truncate')).every((s) => s.scrollWidth <= s.clientWidth + 1),
    tableBottom: round(rT.bottom),
    activityBottom: round(rA.bottom),
    diferenca: round(rA.bottom - rT.bottom),
    rodape: texto(table.querySelector('footer')).slice(0, 34),
  };
};

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1512, height: 1200 } });
const page = await contexto.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 120)));
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(5000);

const resultados = { w1512: await page.evaluate(MEDIR) };
await page.getByRole('button', { name: 'Próxima página' }).click();
await page.waitForTimeout(900);
resultados.w1512_pagina2 = await page.evaluate(MEDIR);
await page.getByRole('button', { name: 'Página anterior' }).click();
await page.waitForTimeout(900);
for (const w of [1600, 1280, 1366]) {
  await page.setViewportSize({ width: w, height: 1200 });
  await page.waitForTimeout(800);
  resultados[`w${w}`] = await page.evaluate(MEDIR);
}
resultados.erros = erros;
writeFileSync(`${SAIDA}/verificacao-final.json`, JSON.stringify(resultados, null, 2));
console.log(JSON.stringify(resultados, null, 2));
await contexto.close();
await browser.close();
