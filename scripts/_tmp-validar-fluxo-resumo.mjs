/**
 * TEMPORÁRIO — valida o FLUXO (sem rolagem/truncamento) e o RESUMO (donut centrado).
 * Mede em várias larguras: a faixa não gera rolagem horizontal, nenhum nome é
 * truncado, os círculos são uniformes, as setas ficam alinhadas, e o donut está
 * centralizado com o valor no centro geométrico.
 *
 * Uso: node scripts/_tmp-validar-fluxo-resumo.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = 'http://localhost:8080/premiacoes';
const SAIDA = 'tmp-fluxo-resumo';
mkdirSync(SAIDA, { recursive: true });

const MEDIR = () => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const round = (n) => Math.round(n);
  const h3 = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Fluxo de Pagamento');
  const barra = h3?.closest('section');
  const lista = barra?.querySelector('ol');
  const filhos = Array.from(lista?.children ?? []);
  const passos = filhos.filter((li) => li.querySelector('button'));
  const setas = filhos.filter((li) => li.querySelector('svg'));
  const topo = (el) => round(el.getBoundingClientRect().top);

  const rotulos = passos.map((li) => {
    const nome = li.querySelector('button > span:last-child > span:first-child');
    return {
      nome: texto(nome),
      visivel: round(nome.getBoundingClientRect().width),
      doTexto: round(nome.scrollWidth),
      trunca: nome.scrollWidth > nome.clientWidth + 1,
    };
  });
  const circulos = passos.map((li) => round(li.querySelector('button > span:first-child').getBoundingClientRect().width));
  const circuloY = passos.map((li) => {
    const r = li.querySelector('button > span:first-child').getBoundingClientRect();
    return round(r.top + r.height / 2);
  });
  const setaY = setas.map((li) => {
    const r = li.querySelector('svg').getBoundingClientRect();
    return round(r.top + r.height / 2);
  });

  const resumoH3 = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Resumo Financeiro');
  const cardResumo = resumoH3?.closest('section');
  const svg = cardResumo?.querySelector('svg');
  const rResumo = cardResumo?.getBoundingClientRect();
  const sSvg = svg?.getBoundingClientRect();
  const legenda = Array.from(cardResumo?.querySelectorAll('div.mt-3.space-y-1\\.5 > div') ?? []);
  const textosSvg = Array.from(svg?.querySelectorAll('text') ?? []);

  return {
    barra: { altura: barra ? round(barra.getBoundingClientRect().height) : null },
    fluxo: {
      linhas: new Set(passos.map((li) => Math.round(topo(li) / 10) * 10)).size,
      rolaHorizontal: lista ? lista.scrollWidth > lista.clientWidth + 1 : null,
      larguraConteudo: lista ? round(lista.scrollWidth) : null,
      larguraDisponivel: lista ? round(lista.clientWidth) : null,
      passos: passos.length,
      nomeTrunca: rotulos.some((r) => r.trunca),
      nomes: rotulos.map((r) => `${r.nome} ${r.visivel}/${r.doTexto}${r.trunca ? ' TRUNCA' : ''}`),
      circulosUniformes: new Set(circulos).size === 1,
      circulo: circulos[0] ?? null,
      setas: setas.length,
      setasAlinhadas: setas.every((_, i) => Math.abs((setaY[i] ?? 0) - (circuloY[i] ?? 0)) <= 6),
    },
    resumo: {
      cardLargura: rResumo ? round(rResumo.width) : null,
      donut: sSvg ? { w: round(sSvg.width), h: round(sSvg.height) } : null,
      espessuraDoAnel: svg?.querySelector('circle[stroke-width]')?.getAttribute('stroke-width') ?? null,
      xDoDonutNoCard: sSvg && rResumo ? round(sSvg.x - rResumo.x) : null,
      centralizado: !!(sSvg && rResumo) && Math.abs(sSvg.x - rResumo.x - (rResumo.width - sSvg.width) / 2) <= 2,
      valorCentral: textosSvg[0] ? texto(textosSvg[0]) : null,
      valorY: textosSvg[0]?.getAttribute('y') ?? null,
      rotuloY: textosSvg[1]?.getAttribute('y') ?? null,
      centroGeometricoY: svg ? round(Number(svg.getAttribute('height')) / 2) : null,
      legenda: legenda.map((d) => texto(d)),
      linhasDaLegenda: legenda.length,
      valoresADireita: legenda.map((d) => {
        const spans = d.querySelectorAll('span');
        const valor = spans[spans.length - 1];
        return Math.abs(d.getBoundingClientRect().right - valor.getBoundingClientRect().right) <= 1;
      }),
    },
    rolagemDaPagina: document.documentElement.scrollWidth > window.innerWidth + 1,
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

const resultados = {};
for (const largura of [1456, 1400, 1280, 1024, 390]) {
  await page.setViewportSize({ width: largura, height: 1000 });
  await page.waitForTimeout(700);
  resultados[largura] = await page.evaluate(MEDIR);
  if (largura === 1456 || largura === 1280 || largura === 390) {
    const recorte = (titulo) => {
      const h3 = Array.from(document.querySelectorAll('h3')).find((h) => (h.textContent ?? '').trim() === titulo);
      const r = h3?.closest('section')?.getBoundingClientRect();
      return r
        ? { x: Math.max(0, Math.round(r.x) - 4), y: Math.max(0, Math.round(r.y) - 4), width: Math.round(r.width) + 8, height: Math.round(r.height) + 8 }
        : null;
    };
    const cf = await page.evaluate(recorte, 'Fluxo de Pagamento');
    if (cf) {
      try {
        await page.screenshot({ path: `${SAIDA}/fluxo-${largura}.png`, clip: cf, fullPage: true });
      } catch (e) {
        erros.push(`screenshot fluxo ${largura}: ${String(e.message).slice(0, 80)}`);
      }
    }
    const cr = await page.evaluate(recorte, 'Resumo Financeiro');
    if (cr) {
      try {
        await page.screenshot({ path: `${SAIDA}/resumo-${largura}.png`, clip: cr, fullPage: true });
      } catch (e) {
        erros.push(`screenshot resumo ${largura}: ${String(e.message).slice(0, 80)}`);
      }
    }
  }
}

resultados.erros = erros;
writeFileSync(`${SAIDA}/relatorio.json`, JSON.stringify(resultados, null, 2));
console.log(JSON.stringify(resultados, null, 2));
await contexto.close();
await browser.close();
