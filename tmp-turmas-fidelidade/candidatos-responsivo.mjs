/**
 * TEMPORÁRIO — valida a área Candidatos (layout, densidade, interações).
 */
import { chromium } from '@playwright/test';

const larguras = [2560, 1920, 1600, 1440, 1366, 1280, 1024, 768, 390, 375];
const b = await chromium.launch();
const saida = [];

for (const width of larguras) {
  const c = await b.newContext({ storageState: 'e2e/.auth/user.json', viewport: { width, height: width >= 1280 ? 1000 : 900 } });
  await c.addInitScript(() => {
    localStorage.setItem('dp-tour-completed', 'true');
    localStorage.setItem('ui-theme', 'dark');
    localStorage.setItem('dp-force-motion', 'on');
  });
  const p = await c.newPage();
  const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  await p.goto('http://localhost:8080/recrutamento', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.getByRole('tab', { name: 'Candidatos', exact: true }).click();
  await p.waitForTimeout(1800);

  const ui = await p.evaluate(() => {
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const indicadores = [...document.querySelectorAll('[aria-label="Filtrar candidatos por situação"] button')];
    const filtros = [...document.querySelectorAll('[aria-label="Vaga"], [aria-label="Etapa"], [aria-label="Origem"], [aria-label="Ordenar por"]')];
    const tabelaWrap = document.querySelector('table')?.parentElement ?? null;
    const tabela = document.querySelector('table');
    const thead = document.querySelector('thead tr');
    const rows = [...document.querySelectorAll('tbody tr')];
    const cardsMobile = [...document.querySelectorAll('div.md\\:hidden > div')];
    const pagina = document.body.innerText.match(/Mostrando[^\n]*/)?.[0] ?? null;
    return {
      overflowDoc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      indicadores: indicadores.map((el) => ({
        texto: el.innerText.replace(/\n/g, ' '),
        pressed: el.getAttribute('aria-pressed'),
        x: Math.round(r(el).x),
        y: Math.round(r(el).y),
        w: Math.round(r(el).width),
        h: Math.round(r(el).height),
      })),
      filtros: filtros.map((el) => ({ nome: el.getAttribute('aria-label'), x: Math.round(r(el).x), y: Math.round(r(el).y), w: Math.round(r(el).width) })),
      tabelaVisivel: tabela ? getComputedStyle(tabela.closest('.md\\:block') ?? tabela).display !== 'none' : false,
      tabela: tabela
        ? {
            w: Math.round(r(tabela).width),
            wrapW: tabelaWrap ? Math.round(r(tabelaWrap).width) : null,
            wrapOverflow: tabelaWrap ? tabelaWrap.scrollWidth - tabelaWrap.clientWidth : null,
            theadH: thead ? Math.round(r(thead).height) : null,
            rowH: rows[0] ? Math.round(r(rows[0]).height) : null,
            rows: rows.length,
            cols: thead ? [...thead.children].map((th) => Math.round(r(th).width)) : [],
          }
        : null,
      cardsMobile: cardsMobile.length,
      pagina,
    };
  });

  await p.screenshot({ path: `tmp-turmas-fidelidade/candidatos-resp-${width}.png` });
  saida.push({ width, ui, erros });
  await c.close();
}

console.log(JSON.stringify(saida, null, 2));
await b.close();
