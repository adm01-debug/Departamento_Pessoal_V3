/**
 * DIAGNÓSTICO — abre http://localhost:8080/premiacoes no servidor ATIVO (não sobe
 * nenhum servidor), registra URLs de módulo, dimensões reais, painéis, erros e
 * tira uma screenshot NOVA com carimbo de tempo. Também extrai do DOM as classes
 * reais para comparar com o código-fonte.
 *
 * Uso: node scripts/_tmp-diagnostico-premiacoes.mjs
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const URL = 'http://localhost:8080/premiacoes';
const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
const print = `tmp-diagnostico-${carimbo}.png`;

const browser = await chromium.launch();
const saida = { url: URL, screenshot: print, carimbo };

try {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/user.json',
    viewport: { width: 1456, height: 816 },
  });
  const page = await context.newPage();

  const errosJs = [];
  const falhasDeRede = [];
  const modulos = [];
  page.on('pageerror', (e) => errosJs.push(String(e.message).slice(0, 300)));
  page.on('requestfailed', (r) => falhasDeRede.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    const u = r.url();
    if (/\/src\/(pages\/PremiacoesPage|main|components\/premiacoes\/|index\.css)|\.css(\?|$)/.test(u)) {
      modulos.push({ url: u.replace('http://localhost:8080', ''), status: r.status() });
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-tour-completed', 'true');
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: print, fullPage: false });

  const dados = await page.evaluate(() => {
    const px = (el, prop) => (el ? getComputedStyle(el)[prop] : null);
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), altura: Math.round(r.height), largura: Math.round(r.width) };
    };
    const visivel = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      let ancestral = null;
      let n = el.parentElement;
      while (n) {
        const st = getComputedStyle(n);
        if (st.overflow !== 'visible') {
          ancestral = `${n.tagName.toLowerCase()}.${String(n.className).slice(0, 40)} => overflow:${st.overflow}`;
          break;
        }
        n = n.parentElement;
      }
      return {
        altura: Math.round(r.height),
        top: Math.round(r.top),
        display: s.display,
        visibility: s.visibility,
        opacity: s.opacity,
        ancestralComOverflow: ancestral,
      };
    };
    const texto = (sel) => (document.querySelector(sel)?.textContent ?? '').trim();

    const tablist = document.querySelector('[role="tablist"]');
    const gridIndicadores = tablist?.parentElement?.nextElementSibling;
    const cartaoKpi = gridIndicadores?.children?.[0];
    const inputBusca = document.querySelector('input[aria-label="Buscar campanhas"]');
    const faixaFiltros = inputBusca?.closest('div.flex-wrap');
    const secaoTabela = document.querySelector('section');
    const ths = Array.from(secaoTabela?.querySelectorAll('thead th') ?? []);
    const acharPainel = (re) =>
      Array.from(document.querySelectorAll('h3')).find((h) => re.test(h.textContent ?? ''))?.closest('section');
    const painelAcoes = acharPainel(/PRÓXIMAS AÇÕES/i);
    const painelAtividade = acharPainel(/ATIVIDADE RECENTE/i);

    // ESTOURO por célula: TODAS as linhas (nomes longos truncam sem aparecer na 1ª).
    const celulas = Array.from(secaoTabela?.querySelectorAll('tbody tr') ?? []).flatMap((tr, iLinha) =>
      Array.from(tr.querySelectorAll('td')).map((td, iCol) => {
        const alvos = Array.from(td.querySelectorAll('p, span, button'));
        const estourados = alvos
          .filter((el) => el.scrollWidth > Math.ceil(el.getBoundingClientRect().width) + 1)
          .map((el) => `${el.tagName.toLowerCase()}: "${(el.textContent ?? '').trim().slice(0, 28)}" ${el.scrollWidth}>${Math.round(el.getBoundingClientRect().width)}`);
        return { linha: iLinha, coluna: iCol, largura: Math.round(td.getBoundingClientRect().width), estourados };
      }),
    );
    // Estouro nos cartões de indicador e nos painéis laterais.
    const estourosFora = [];
    const varrer = (raiz, rotulo) => {
      Array.from(raiz?.querySelectorAll('p, span, button, h3') ?? []).forEach((el) => {
        const w = Math.round(el.getBoundingClientRect().width);
        if (w > 0 && el.scrollWidth > w + 1) {
          estourosFora.push(`${rotulo} · ${el.tagName.toLowerCase()}: "${(el.textContent ?? '').trim().slice(0, 28)}" ${el.scrollWidth}>${w}`);
        }
      });
    };
    Array.from(gridIndicadores?.children ?? []).forEach((c, i) => varrer(c, `kpi${i + 1}`));
    varrer(painelAcoes, 'acoes');
    varrer(painelAtividade, 'atividade');

    return {
      href: window.location.href,
      titulo: document.title,
      estourosPorCelula: celulas.filter((c) => c.estourados.length > 0),
      estourosFora,
      textoIndicadores: Array.from(gridIndicadores?.children ?? []).map((c) =>
        (c.textContent ?? '').replace(/\s+/g, ' ').trim(),
      ),
      classeCartaoKpi: cartaoKpi?.className ?? null,
      paddingCartaoKpi: px(cartaoKpi, 'padding'),
      classes: {
        tabela: secaoTabela?.querySelector('table')?.className ?? null,
        thead: secaoTabela?.querySelector('thead tr')?.className ?? null,
        nav: (tablist?.closest('div')?.className ?? '').toString().slice(0, 120),
        barraFiltros: (faixaFiltros?.className ?? '').toString().slice(0, 120),
      },
      largurasColunas: ths.map((t) => `${(t.textContent ?? '').trim()}:${Math.round(t.getBoundingClientRect().width)}px`),
      largurasIndicadores: Array.from(gridIndicadores?.children ?? []).map((c) => Math.round(c.getBoundingClientRect().width)),
      medidas: {
        navegacao: rect(tablist),
        indicadores: rect(gridIndicadores),
        filtros: rect(faixaFiltros),
        cabecalhoTabela: rect(secaoTabela?.querySelector('thead tr')),
        topoTabela: rect(secaoTabela)?.top ?? null,
        primeiraLinha: rect(secaoTabela?.querySelector('tbody tr')),
        rodapeTabela: rect(secaoTabela?.querySelector('footer')),
        colunaLateral: rect(painelAcoes?.parentElement),
        cabecalhoPagina: rect(document.querySelector('header')),
      },
      paineis: { proximasAcoes: visivel(painelAcoes), atividadeRecente: visivel(painelAtividade) },
      linhasTabela: secaoTabela?.querySelectorAll('tbody tr').length ?? 0,
      rodapeTexto: texto('section footer') || null,
      scroll: {
        scrollHeightDoMain: document.querySelector('main')?.scrollHeight,
        viewport: window.innerHeight,
        rolagemHorizontalDaPagina: document.documentElement.scrollWidth > window.innerWidth + 1,
      },
    };
  });

  saida.modulosCarregados = modulos;
  saida.dom = dados;
  saida.errosJs = errosJs;
  saida.falhasDeRede = falhasDeRede.slice(0, 10);

  writeFileSync('tmp-diagnostico.json', JSON.stringify(saida, null, 2));
  console.log(JSON.stringify(saida, null, 2));
} finally {
  await browser.close();
}
