/**
 * TEMPORÁRIO — a diferença entre as bases depende da LARGURA da viewport?
 * Mede tabela × Atividade recente em várias larguras, com a cascata de entrada
 * já terminada (5s) e com o estado da animação registrado.
 * Uso: node scripts/_tmp-medir-por-viewport.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const SAIDA = 'tmp-viewports';
mkdirSync(SAIDA, { recursive: true });

const MEDIR = () => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const round = (n) => Math.round(n);
  const card = (t) => Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === t)?.closest('section') ?? null;
  const tabela = document.querySelector('table')?.closest('section');
  const ativ = card('Atividade recente');
  const acoes = card('Próximas ações');
  const trs = Array.from(document.querySelectorAll('tbody tr'));
  const rT = tabela?.getBoundingClientRect();
  const rA = ativ?.getBoundingClientRect();
  const rAc = acoes?.getBoundingClientRect();
  return {
    largura: window.innerWidth,
    alturaTabela: rT ? round(rT.height) : null,
    alturaAtividade: rA ? round(rA.height) : null,
    alturaAcoes: rAc ? round(rAc.height) : null,
    alturaDaLinha: trs[0] ? round(trs[0].getBoundingClientRect().height) : null,
    linhas: trs.length,
    baseTabela: rT ? round(rT.bottom) : null,
    baseAtividade: rA ? round(rA.bottom) : null,
    diferenca: rT && rA ? round(rA.bottom - rT.bottom) : null,
    gapCards: rAc && rA ? round(rA.top - rAc.bottom) : null,
    // opacidade/transform do card: se != 1/none, a cascata ainda está em curso
    transformAtividade: ativ ? getComputedStyle(ativ).transform : null,
    opacidadeAtividade: ativ ? getComputedStyle(ativ).opacity : null,
  };
};

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

const resultados = {};
// 1 · estabilidade temporal: medir sem esperar (cascata em curso) e depois de 5s
resultados.duranteCascata = await page.evaluate(MEDIR);
for (const largura of [1280, 1366, 1456, 1512, 1600, 1728, 1920]) {
  await page.setViewportSize({ width: largura, height: 1200 });
  await page.waitForTimeout(700);
  resultados[`w${largura}`] = await page.evaluate(MEDIR);
}

resultados.medicoesRepetidas1456 = [];
await page.setViewportSize({ width: 1456, height: 1200 });
for (let i = 0; i < 4; i += 1) {
  await page.waitForTimeout(600);
  resultados.medicoesRepetidas1456.push(await page.evaluate(MEDIR));
}

writeFileSync(`${SAIDA}/relatorio.json`, JSON.stringify(resultados, null, 2));
console.log(JSON.stringify(resultados, null, 2));
await contexto.close();
await browser.close();
