/** TEMPORÁRIO — mede as larguras reais do fluxo e do resumo (base para o layout). */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const contexto = await browser.newContext({
  storageState: 'e2e/.auth/user.json',
  viewport: { width: 1456, height: 1000 },
});
const page = await contexto.newPage();
await page.addInitScript(() => {
  localStorage.setItem('ui-theme', 'dark');
  localStorage.setItem('dp-tour-completed', 'true');
});
await page.goto('http://localhost:8080/premiacoes', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /Hub de Premiações/ }).waitFor({ timeout: 30_000 });
await page.getByRole('tab', { name: /Pagamentos/ }).click();
await page.waitForTimeout(2400);

const dados = await page.evaluate(() => {
  const texto = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const caixa = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x) };
  };
  const h3 = Array.from(document.querySelectorAll('h3')).find((h) => texto(h) === 'Fluxo de Pagamento');
  const barra = h3.closest('section');
  const rolador = barra.querySelector('.overflow-x-auto');
  const lista = barra.querySelector('ol');
  const tituloBloco = h3.parentElement;
  const subtitulo = Array.from(tituloBloco.querySelectorAll('p'))[0];
  const passos = Array.from(barra.querySelectorAll('ol > li'));
  const rotulos = passos.map((li) => {
    const spans = li.querySelectorAll('button > span:last-child > span');
    const nome = spans[0];
    return {
      nome: texto(nome),
      larguraVisivel: Math.round(nome.getBoundingClientRect().width),
      larguraDoTexto: Math.round(nome.scrollWidth),
    };
  });
  const circulos = passos.map((li) => Math.round(li.querySelector('button > span:first-child').getBoundingClientRect().width));
  const setas = passos.map((li) => {
    const svg = li.querySelector(':scope > svg');
    return svg ? Math.round(svg.getBoundingClientRect().width) : 0;
  });
  const gap = (el) => (el ? getComputedStyle(el).gap : null);
  return {
    barra: caixa(barra),
    barraPadding: getComputedStyle(barra).padding,
    barraGap: gap(barra),
    tituloBloco: caixa(tituloBloco),
    subtitulo: { ...caixa(subtitulo), larguraDoTexto: Math.round(subtitulo.scrollWidth) },
    rolador: caixa(rolador),
    roladorRola: rolador.scrollWidth > rolador.clientWidth + 1,
    lista: { ...caixa(lista), larguraDoConteudo: Math.round(lista.scrollWidth) },
    listaGap: gap(lista),
    passos: caixa(passos[0]),
    passoGap: gap(passos[0]),
    rotulos,
    circulos,
    setas,
    somaNecessaria:
      rotulos.reduce((acc, r) => acc + r.larguraDoTexto, 0) +
      circulos.reduce((a, b) => a + b, 0) +
      setas.reduce((a, b) => a + b, 0),
    resumo: (() => {
      const h = Array.from(document.querySelectorAll('h3')).find((x) => texto(x) === 'Resumo Financeiro');
      const card = h.closest('section');
      const svg = card.querySelector('svg');
      const r = card.getBoundingClientRect();
      const s = svg.getBoundingClientRect();
      return {
        card: { w: Math.round(r.width), h: Math.round(r.height) },
        svg: { w: Math.round(s.width), h: Math.round(s.height), x: Math.round(s.x - r.x) },
        centralizado: Math.abs((s.x - r.x) - (r.width - s.width) / 2) <= 2,
        strokeWidth: svg.querySelector('circle[stroke]')?.getAttribute('stroke-width'),
        legenda: Array.from(card.querySelectorAll('div.mt-3.space-y-1\\.5 > div')).map((d) => texto(d)),
      };
    })(),
  };
});

console.log(JSON.stringify(dados, null, 1));
await contexto.close();
await browser.close();
