/**
 * TEMPORÁRIO — mede a animação REAL de entrada das linhas (por rAF, lendo o
 * `opacity`/`transform` que o Framer escreve a cada quadro) em três lugares:
 *   1. Processos (Desligamentos) — a referência;
 *   2. tabela de Campanhas;
 *   3. tabela de Pagamentos.
 * Compara duração de cada linha, passo entre linhas e o deslocamento inicial.
 * Uso: node scripts/_tmp-medir-animacao.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const SAIDA = 'tmp-animacao';
mkdirSync(SAIDA, { recursive: true });

const AMOSTRADOR = `
  window.__amostras = [];
  const t0 = performance.now();
  function loop() {
    const agora = performance.now() - t0;
    const linhas = Array.from(document.querySelectorAll('table tbody tr'));
    if (linhas.length) {
      linhas.forEach((tr, i) => {
        const cs = getComputedStyle(tr);
        window.__amostras.push([Math.round(agora), i, Number(cs.opacity), cs.transform]);
      });
    }
    if (agora < 6000) requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
`;

/** Transforma as amostras em: atraso (ms), duração (ms) e deslocamento inicial. */
const ANALISAR = () => {
  const porLinha = new Map();
  for (const [t, i, op, tf] of window.__amostras) {
    if (!porLinha.has(i)) porLinha.set(i, []);
    porLinha.get(i).push({ t, op, tf });
  }
  const resultado = [];
  for (const [i, s] of [...porLinha.entries()].sort((a, b) => a[0] - b[0])) {
    const iniciou = s.find((x) => x.op > 0.01);
    const terminou = s.find((x) => x.op >= 0.99);
    const inicial = s[0];
    resultado.push({
      linha: i + 1,
      comecaEmMs: iniciou ? iniciou.t : null,
      terminaEmMs: terminou ? terminou.t : null,
      duracaoMs: iniciou && terminou ? terminou.t - iniciou.t : null,
      transformInicial: inicial ? inicial.tf : null,
      opacidadeInicial: inicial ? inicial.op : null,
    });
  }
  return resultado;
};

const medir = async (page, espera = 5200) => {
  await page.waitForTimeout(espera);
  const linhas = await page.evaluate(ANALISAR);
  const passos = linhas.slice(1).map((l, idx) => (l.comecaEmMs != null && linhas[idx].comecaEmMs != null ? l.comecaEmMs - linhas[idx].comecaEmMs : null));
  return {
    linhas,
    passoMedioMs: passos.length ? Math.round(passos.reduce((a, b) => a + b, 0) / passos.length) : null,
    passoPorLinhaMs: passos,
    duracaoMediaMs: Math.round(linhas.filter((l) => l.duracaoMs).reduce((a, l) => a + l.duracaoMs, 0) / Math.max(linhas.filter((l) => l.duracaoMs).length, 1)) || null,
  };
};

const browser = await chromium.launch();
const contexto = await browser.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width: 1512, height: 1200 } });
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});

const resultados = {};

// 1 · REFERÊNCIA — Processos (Desligamentos)
await page.addInitScript(AMOSTRADOR);
await page.goto('http://localhost:8080/desligamentos', { waitUntil: 'domcontentloaded' });
resultados.referenciaProcessos = await medir(page);
await page.screenshot({ path: `${SAIDA}/referencia-desligamentos.png` });

// 2 · CAMPANHAS
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.evaluate(AMOSTRADOR);
await page.getByRole('tab', { name: /^Campanhas/ }).click();
resultados.campanhas = await medir(page, 4000);
await page.screenshot({ path: `${SAIDA}/campanhas.png` });

// 3 · PAGAMENTOS (amostrador reiniciado: a lista remonta ao entrar na aba)
await page.evaluate(AMOSTRADOR);
await page.getByRole('tab', { name: /Pagamentos/ }).click();
resultados.pagamentos = await medir(page, 4000);
await page.screenshot({ path: `${SAIDA}/pagamentos.png` });

writeFileSync(`${SAIDA}/relatorio.json`, JSON.stringify(resultados, null, 2));
console.log(JSON.stringify({
  referenciaProcessos: { passo: resultados.referenciaProcessos.passoPorLinhaMs, duracao: resultados.referenciaProcessos.duracaoMediaMs, transform0: resultados.referenciaProcessos.linhas[0]?.transformInicial, op0: resultados.referenciaProcessos.linhas[0]?.opacidadeInicial },
  campanhas: { passo: resultados.campanhas.passoPorLinhaMs, duracao: resultados.campanhas.duracaoMediaMs, transform0: resultados.campanhas.linhas[0]?.transformInicial, op0: resultados.campanhas.linhas[0]?.opacidadeInicial },
  pagamentos: { passo: resultados.pagamentos.passoPorLinhaMs, duracao: resultados.pagamentos.duracaoMediaMs, transform0: resultados.pagamentos.linhas[0]?.transformInicial, op0: resultados.pagamentos.linhas[0]?.opacidadeInicial },
}, null, 2));
await contexto.close();
await browser.close();
